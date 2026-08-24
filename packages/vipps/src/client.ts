import type {
  AccessTokenResponse,
  Agreement,
  AgreementStatus,
  Charge,
  CreateChargeRequest,
  CreateChargeResponse,
  DraftAgreementRequest,
  DraftAgreementResponse,
  ListWebhooksResponse,
  RegisterWebhookRequest,
  RegisterWebhookResponse,
  UpdateAgreementRequest,
  Userinfo,
} from "./types.js";

/** Test environment — same API surface as production, separate keys, no real money. */
export const VIPPS_TEST_BASE_URL = "https://apitest.vipps.no";
export const VIPPS_PROD_BASE_URL = "https://api.vipps.no";

/**
 * Where cached access tokens live. Backed by the VIPPS_TOKENS KV namespace in
 * the Worker; tests use an in-memory map. Tokens are per sales unit and valid
 * 1 h (test) / 24 h (production).
 */
export interface TokenCache {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, ttlSeconds: number): Promise<void>;
}

export interface VippsConfig {
  /** VIPPS_TEST_BASE_URL or VIPPS_PROD_BASE_URL. */
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  /** Ocp-Apim-Subscription-Key for the sales unit. */
  subscriptionKey: string;
  /** The sales unit's MSN (Merchant-Serial-Number header on every call). */
  merchantSerialNumber: string;
  tokenCache?: TokenCache;
  /** Injectable for tests; defaults to global fetch. */
  fetch?: typeof fetch;
}

/** Non-2xx response from the Vipps API, with the response body preserved. */
export class VippsApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(method: string, path: string, status: number, body: string) {
    super(`Vipps API ${method} ${path} failed with ${status}: ${body.slice(0, 500)}`);
    this.name = "VippsApiError";
    this.status = status;
    this.body = body;
  }
}

// Identifies stottemedlem in Vipps' logs; recommended on all calls.
const SYSTEM_HEADERS = {
  "Vipps-System-Name": "stottemedlem",
  "Vipps-System-Version": "0.0.0",
} as const;

/** Safety margin so a token never expires mid-request chain. */
const TOKEN_TTL_MARGIN_SECONDS = 300;
/** KV rejects expirationTtl below 60 seconds. */
const MIN_CACHE_TTL_SECONDS = 60;

export type VippsClient = ReturnType<typeof createVippsClient>;

/**
 * Typed client for the Vipps MobilePay APIs stottemedlem uses (Access Token,
 * Recurring v3, Webhooks v1). One instance per sales unit; point `baseUrl` at
 * the test or production environment.
 */
export function createVippsClient(config: VippsConfig) {
  const fetchImpl = config.fetch ?? fetch;
  const tokenCacheKey = `vipps-token:${config.baseUrl}:${config.merchantSerialNumber}`;

  async function getAccessToken(): Promise<string> {
    const cached = await config.tokenCache?.get(tokenCacheKey);
    if (cached) return cached;

    const response = await fetchImpl(`${config.baseUrl}/accesstoken/get`, {
      method: "POST",
      headers: {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
        "Merchant-Serial-Number": config.merchantSerialNumber,
        ...SYSTEM_HEADERS,
      },
    });
    if (!response.ok) {
      throw new VippsApiError("POST", "/accesstoken/get", response.status, await response.text());
    }
    const token = (await response.json()) as AccessTokenResponse;

    const ttl = token.expires_in - TOKEN_TTL_MARGIN_SECONDS;
    if (ttl >= MIN_CACHE_TTL_SECONDS) {
      await config.tokenCache?.put(tokenCacheKey, token.access_token, ttl);
    }
    return token.access_token;
  }

  interface RequestOptions {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    path: string;
    body?: unknown;
    /**
     * Recurring v3 requires an Idempotency-Key on mutating calls; reuse the
     * same key on retries so Vipps deduplicates (1–40 chars).
     */
    idempotencyKey?: string;
  }

  async function request<T>({ method, path, body, idempotencyKey }: RequestOptions): Promise<T> {
    const accessToken = await getAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "Ocp-Apim-Subscription-Key": config.subscriptionKey,
      "Merchant-Serial-Number": config.merchantSerialNumber,
      ...SYSTEM_HEADERS,
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (idempotencyKey !== undefined) headers["Idempotency-Key"] = idempotencyKey;

    const response = await fetchImpl(`${config.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      throw new VippsApiError(method, path, response.status, await response.text());
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return {
    getAccessToken,

    // ── Recurring v3: agreements ─────────────────────────────────────────

    /** Draft an agreement; send the user to `vippsConfirmationUrl` to approve. */
    draftAgreement(body: DraftAgreementRequest, idempotencyKey: string) {
      return request<DraftAgreementResponse>({
        method: "POST",
        path: "/recurring/v3/agreements",
        body,
        idempotencyKey,
      });
    },

    /**
     * Poll after redirect until a final status — PENDING on redirect is normal
     * and never activates a membership by itself.
     */
    getAgreement(agreementId: string) {
      return request<Agreement>({
        method: "GET",
        path: `/recurring/v3/agreements/${agreementId}`,
      });
    },

    /** One status per call; Vipps has no all-statuses listing (local DB is the record). */
    listAgreements(status: AgreementStatus) {
      return request<Agreement[]>({
        method: "GET",
        path: `/recurring/v3/agreements?status=${status}`,
      });
    },

    /** Tier/price changes and merchant-side stop (`status: "STOPPED"`, irreversible). */
    updateAgreement(agreementId: string, body: UpdateAgreementRequest, idempotencyKey: string) {
      return request<void>({
        method: "PATCH",
        path: `/recurring/v3/agreements/${agreementId}`,
        body,
        idempotencyKey,
      });
    },

    // ── Recurring v3: charges ────────────────────────────────────────────

    /** Create a (renewal) charge; due min 1 day, max 2 years ahead. */
    createCharge(agreementId: string, body: CreateChargeRequest, idempotencyKey: string) {
      return request<CreateChargeResponse>({
        method: "POST",
        path: `/recurring/v3/agreements/${agreementId}/charges`,
        body,
        idempotencyKey,
      });
    },

    getCharge(agreementId: string, chargeId: string) {
      return request<Charge>({
        method: "GET",
        path: `/recurring/v3/agreements/${agreementId}/charges/${chargeId}`,
      });
    },

    listCharges(agreementId: string) {
      return request<Charge[]>({
        method: "GET",
        path: `/recurring/v3/agreements/${agreementId}/charges`,
      });
    },

    /** Cancel a PENDING/DUE charge before it is processed. */
    cancelCharge(agreementId: string, chargeId: string, idempotencyKey: string) {
      return request<void>({
        method: "DELETE",
        path: `/recurring/v3/agreements/${agreementId}/charges/${chargeId}`,
        idempotencyKey,
      });
    },

    // ── Userinfo ─────────────────────────────────────────────────────────

    /**
     * The member's consented profile data, keyed by the `sub` an agreement
     * carries when it was drafted with `scope`. Only reachable for 168 hours
     * after consent, so callers must persist what they need at signup.
     */
    getUserinfo(sub: string) {
      return request<Userinfo>({
        method: "GET",
        path: `/vipps-userinfo-api/userinfo/${sub}`,
      });
    },

    // ── Webhooks v1 ──────────────────────────────────────────────────────

    /**
     * Register a receiver for this sales unit. The returned `secret` is shown
     * once — persist it; it keys HMAC verification of every delivery.
     */
    registerWebhook(body: RegisterWebhookRequest) {
      return request<RegisterWebhookResponse>({
        method: "POST",
        path: "/webhooks/v1/webhooks",
        body,
      });
    },

    listWebhooks() {
      return request<ListWebhooksResponse>({
        method: "GET",
        path: "/webhooks/v1/webhooks",
      });
    },

    deleteWebhook(webhookId: string) {
      return request<void>({
        method: "DELETE",
        path: `/webhooks/v1/webhooks/${webhookId}`,
      });
    },
  };
}
