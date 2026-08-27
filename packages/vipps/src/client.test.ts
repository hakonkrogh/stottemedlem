import { describe, expect, it } from "vitest";
import {
  createVippsClient,
  type TokenCache,
  VIPPS_TEST_BASE_URL,
  VippsApiError,
} from "./client.js";

interface RecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

/** Fake fetch: replies from a queue and records every request it sees. */
function fakeFetch(responses: Response[]) {
  const requests: RecordedRequest[] = [];
  const impl: typeof fetch = async (input, init) => {
    requests.push({
      url: String(input),
      method: init?.method ?? "GET",
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: typeof init?.body === "string" ? init.body : null,
    });
    const next = responses.shift();
    if (!next) throw new Error("fakeFetch: no response queued");
    return next;
  };
  return { impl, requests };
}

function tokenResponse(expiresIn = 3600): Response {
  return Response.json({
    token_type: "Bearer",
    expires_in: expiresIn,
    ext_expires_in: expiresIn,
    expires_on: 1_700_000_000,
    not_before: 1_699_996_400,
    resource: "00000000-0000-0000-0000-000000000000",
    access_token: "test-token",
  });
}

function memoryCache() {
  const store = new Map<string, { value: string; ttlSeconds: number }>();
  const cache: TokenCache = {
    get: async (key) => store.get(key)?.value ?? null,
    put: async (key, value, ttlSeconds) => {
      store.set(key, { value, ttlSeconds });
    },
  };
  return { cache, store };
}

function client(fetchImpl: typeof fetch, tokenCache?: TokenCache) {
  return createVippsClient({
    baseUrl: VIPPS_TEST_BASE_URL,
    clientId: "client-id",
    clientSecret: "client-secret",
    subscriptionKey: "subscription-key",
    merchantSerialNumber: "123456",
    tokenCache,
    fetch: fetchImpl,
  });
}

describe("getAccessToken", () => {
  it("posts the API keys as headers to /accesstoken/get", async () => {
    const { impl, requests } = fakeFetch([tokenResponse()]);
    expect(await client(impl).getAccessToken()).toBe("test-token");
    expect(requests[0]?.url).toBe("https://apitest.vipps.no/accesstoken/get");
    expect(requests[0]?.headers).toMatchObject({
      client_id: "client-id",
      client_secret: "client-secret",
      "Ocp-Apim-Subscription-Key": "subscription-key",
      "Merchant-Serial-Number": "123456",
      "Vipps-System-Name": "stottemedlem",
    });
  });

  it("caches the token with a safety margin and reuses it", async () => {
    const { impl, requests } = fakeFetch([tokenResponse(3600)]);
    const { cache, store } = memoryCache();
    const c = client(impl, cache);

    await c.getAccessToken();
    await c.getAccessToken();

    expect(requests).toHaveLength(1);
    const entry = [...store.values()][0];
    expect(entry?.ttlSeconds).toBe(3300);
  });

  it("skips caching tokens too short-lived for KV's 60 s minimum TTL", async () => {
    const { impl } = fakeFetch([tokenResponse(300)]);
    const { cache, store } = memoryCache();
    await client(impl, cache).getAccessToken();
    expect(store.size).toBe(0);
  });
});

describe("request plumbing", () => {
  it("sends bearer token, sales-unit headers and Idempotency-Key on draftAgreement", async () => {
    const { impl, requests } = fakeFetch([
      tokenResponse(),
      Response.json({
        agreementId: "agr_123",
        uuid: "9c2ca95c-245f-4a2e-aab2-4a08eb78e6cb",
        vippsConfirmationUrl: "https://apitest.vipps.no/vipps-gateway/confirm",
      }),
    ]);
    const result = await client(impl).draftAgreement(
      {
        pricing: { type: "LEGACY", amount: 25000, currency: "NOK" },
        interval: { unit: "YEAR", count: 1 },
        merchantRedirectUrl: "https://example.no/join/confirm",
        merchantAgreementUrl: "https://example.no/m",
        productName: "Støttemedlemskap",
      },
      "membership-42-draft",
    );

    expect(result.agreementId).toBe("agr_123");
    const call = requests[1];
    expect(call?.url).toBe("https://apitest.vipps.no/recurring/v3/agreements");
    expect(call?.method).toBe("POST");
    expect(call?.headers).toMatchObject({
      Authorization: "Bearer test-token",
      "Ocp-Apim-Subscription-Key": "subscription-key",
      "Merchant-Serial-Number": "123456",
      "Idempotency-Key": "membership-42-draft",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(call?.body ?? "{}")).toMatchObject({ interval: { unit: "YEAR", count: 1 } });
  });

  it("returns undefined for 204 responses (updateAgreement)", async () => {
    const { impl } = fakeFetch([tokenResponse(), new Response(null, { status: 204 })]);
    await expect(
      client(impl).updateAgreement("agr_123", { pricing: { amount: 30000 } }, "tier-change-7"),
    ).resolves.toBeUndefined();
  });

  it("throws VippsApiError with status and body on non-2xx", async () => {
    const { impl } = fakeFetch([
      tokenResponse(),
      new Response('{"type":"about:blank","status":404}', { status: 404 }),
    ]);
    const error = await client(impl)
      .getAgreement("agr_missing")
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(VippsApiError);
    expect((error as VippsApiError).status).toBe(404);
    expect((error as VippsApiError).body).toContain("about:blank");
  });
});

describe("getUserinfo", () => {
  it("fetches the consented profile by the agreement's sub", async () => {
    const { impl, requests } = fakeFetch([
      tokenResponse(),
      Response.json({
        sub: "9fe5d0e3-4702-4113-a154-90bc68063325",
        name: "Test User",
        email: "test@example.no",
        phone_number: "4712345678",
      }),
    ]);

    const profile = await client(impl).getUserinfo("9fe5d0e3-4702-4113-a154-90bc68063325");

    expect(profile.name).toBe("Test User");
    expect(profile.phone_number).toBe("4712345678");
    expect(requests[1]?.url).toBe(
      "https://apitest.vipps.no/vipps-userinfo-api/userinfo/9fe5d0e3-4702-4113-a154-90bc68063325",
    );
    expect(requests[1]?.headers).toMatchObject({ Authorization: "Bearer test-token" });
  });
});

describe("refundCharge", () => {
  it("posts the amount and description to the charge's refund endpoint", async () => {
    const { impl, requests } = fakeFetch([tokenResponse(), new Response(null, { status: 204 })]);

    await expect(
      client(impl).refundCharge(
        "agr_123",
        "chr_WCVbcA",
        { amount: 25000, description: "Refundert støttemedlemskap 2026" },
        "9c2ca95c-245f-4a2e-aab2-4a08eb78e6cb",
      ),
    ).resolves.toBeUndefined();

    const call = requests[1];
    expect(call?.url).toBe(
      "https://apitest.vipps.no/recurring/v3/agreements/agr_123/charges/chr_WCVbcA/refund",
    );
    expect(call?.method).toBe("POST");
    expect(call?.headers).toMatchObject({
      "Idempotency-Key": "9c2ca95c-245f-4a2e-aab2-4a08eb78e6cb",
      "Merchant-Serial-Number": "123456",
    });
    // Vipps requires an amount even for a full refund; minor units, never kroner.
    expect(JSON.parse(call?.body ?? "{}")).toEqual({
      amount: 25000,
      description: "Refundert støttemedlemskap 2026",
    });
  });

  it("surfaces a refusal (e.g. single-settlement sales unit) as VippsApiError", async () => {
    const { impl } = fakeFetch([
      tokenResponse(),
      new Response('{"detail":"Refund is not possible"}', { status: 400 }),
    ]);
    const error = await client(impl)
      .refundCharge("agr_123", "chr_WCVbcA", { amount: 25000, description: "Refusjon" }, "key-1")
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(VippsApiError);
    expect((error as VippsApiError).status).toBe(400);
    expect((error as VippsApiError).body).toContain("Refund is not possible");
  });
});
