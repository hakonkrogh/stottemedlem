/**
 * Types for the subset of the Vipps MobilePay API surface stottemedlem uses:
 * Access Token, Recurring v3 (agreements + charges), Webhooks v1.
 *
 * Field shapes follow the official OpenAPI specs, verified against
 * docs/research/vipps-recurring-payments.md and developer.vippsmobilepay.com
 * (2026-08). Only fields we read or send are modelled; responses may carry
 * more.
 */

// ── Access token ─────────────────────────────────────────────────────────

/** Response from `POST /accesstoken/get`. */
export interface AccessTokenResponse {
  token_type: "Bearer";
  /** Seconds until expiry: 3600 in the test environment, 86400 in production. */
  expires_in: number;
  ext_expires_in: number;
  /** Unix timestamp (seconds) when the token expires. */
  expires_on: number;
  not_before: number;
  resource: string;
  access_token: string;
}

// ── Recurring v3: agreements ─────────────────────────────────────────────

export type AgreementStatus = "PENDING" | "ACTIVE" | "STOPPED" | "EXPIRED";

export interface AgreementInterval {
  unit: "YEAR" | "MONTH" | "WEEK" | "DAY";
  /** 1–31. Yearly membership: `{ unit: "YEAR", count: 1 }`. */
  count: number;
}

/** Fixed-price agreement pricing — the model for the annual fee. */
export interface AgreementPricingRequest {
  type: "LEGACY";
  /** Minor units (øre): 250 NOK → 25000. */
  amount: number;
  currency: "NOK";
}

export interface AgreementPricingResponse {
  type: "LEGACY" | "VARIABLE";
  amount: number;
  currency: string;
}

export type ChargeTransactionType = "DIRECT_CAPTURE" | "RESERVE_CAPTURE";

/** The optional first-year charge bundled into agreement approval. */
export interface InitialCharge {
  /** Minor units (øre). */
  amount: number;
  description: string;
  transactionType: ChargeTransactionType;
  /** Optional; when set it becomes the chargeId. */
  orderId?: string;
  externalId?: string;
}

export interface DraftAgreementRequest {
  pricing: AgreementPricingRequest;
  interval: AgreementInterval;
  /** Where the user lands after approving/cancelling in Vipps. */
  merchantRedirectUrl: string;
  /**
   * The member's self-service page. Must offer actual management (stop the
   * membership) — required for Norwegian merchants.
   */
  merchantAgreementUrl: string;
  productName: string;
  productDescription?: string;
  /** MSISDN incl. country code; skips the number prompt in the Vipps flow. */
  phoneNumber?: string;
  initialCharge?: InitialCharge;
  /** Space-separated userinfo scopes, e.g. "name email phoneNumber". */
  scope?: string;
  /** Our key for the agreement, e.g. the local membership id. */
  externalId?: string;
}

export interface DraftAgreementResponse {
  agreementId: string;
  uuid: string;
  /** Send the user here to approve the agreement. */
  vippsConfirmationUrl: string;
  /** Present when the draft included an initialCharge. */
  chargeId?: string;
}

export interface Agreement {
  id: string;
  uuid?: string;
  status: AgreementStatus;
  pricing: AgreementPricingResponse;
  interval: AgreementInterval;
  productName: string;
  productDescription?: string;
  merchantAgreementUrl?: string;
  merchantRedirectUrl?: string;
  externalId?: string;
  /** ISO timestamps. */
  created?: string;
  start?: string | null;
  stop?: string | null;
  /** Present when scope was requested; fetch userinfo within 168 hours. */
  sub?: string;
  userinfoUrl?: string;
}

export interface UpdateAgreementRequest {
  productName?: string;
  productDescription?: string;
  merchantAgreementUrl?: string;
  externalId?: string;
  /** Only `amount` (+ optional suggestedMaxAmount for VARIABLE) can change. */
  pricing?: { amount: number };
  /** The only allowed transition; irreversible. No other fields alongside. */
  status?: "STOPPED";
}

// ── Recurring v3: charges ────────────────────────────────────────────────

export type ChargeStatus =
  | "PENDING"
  | "DUE"
  | "RESERVED"
  | "CHARGED"
  | "PARTIALLY_CAPTURED"
  | "FAILED"
  | "CANCELLED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "PROCESSING";

export type ChargeType = "INITIAL" | "RECURRING" | "UNSCHEDULED";

export interface CreateChargeRequest {
  /** Minor units (øre). Capped at 5× the agreement price. */
  amount: number;
  description: string;
  /** Due date `YYYY-MM-DD`; min 1 day ahead, max 2 years. ~30+ days is best. */
  due: string;
  /** 0–14 daily retries after due; Vipps recommends ≥ 2, we default to 7. */
  retryDays: number;
  transactionType: ChargeTransactionType;
  /** Optional; when set it becomes the chargeId. */
  orderId?: string;
  /** Our key for the charge, e.g. the local membership-period id. */
  externalId?: string;
}

export interface CreateChargeResponse {
  chargeId: string;
}

export interface Charge {
  id: string;
  status: ChargeStatus;
  type: ChargeType;
  amount: number;
  currency?: string;
  description: string;
  due: string;
  retryDays: number;
  transactionType: ChargeTransactionType;
  externalId?: string;
  transactionId?: string;
  failureReason?: string | null;
  failureDescription?: string | null;
}

// ── Webhooks v1 ──────────────────────────────────────────────────────────

/** The ten recurring event types; register all of them per sales unit. */
export const RECURRING_WEBHOOK_EVENTS = [
  "recurring.agreement-activated.v1",
  "recurring.agreement-rejected.v1",
  "recurring.agreement-stopped.v1",
  "recurring.agreement-expired.v1",
  "recurring.charge-reserved.v1",
  "recurring.charge-captured.v1",
  "recurring.charge-canceled.v1",
  "recurring.charge-refunded.v1",
  "recurring.charge-failed.v1",
  "recurring.charge-creation-failed.v1",
] as const;

export type RecurringWebhookEvent = (typeof RECURRING_WEBHOOK_EVENTS)[number];

export interface RegisterWebhookRequest {
  /** Publicly reachable HTTPS receiver, e.g. https://…/webhooks/vipps. */
  url: string;
  events: readonly string[];
}

export interface RegisterWebhookResponse {
  id: string;
  /**
   * HMAC key for validating deliveries to this registration. Returned once —
   * persist it (encrypted) or delete + re-register to rotate.
   */
  secret: string;
}

export interface WebhookRegistration {
  id: string;
  url: string;
  events: string[];
}

export interface ListWebhooksResponse {
  webhooks: WebhookRegistration[];
}

// ── Userinfo ─────────────────────────────────────────────────────────────

/**
 * The profile-sharing scopes an agreement may request. Passed space-separated
 * as `DraftAgreementRequest.scope`; what the member consents to is what
 * `Userinfo` carries afterwards.
 */
export const MEMBER_USERINFO_SCOPE = "name email phoneNumber" as const;

export interface UserinfoAddress {
  address_type?: string;
  country?: string;
  formatted?: string;
  postal_code?: string;
  region?: string;
  street_address?: string;
}

/**
 * Consented profile data for one member, keyed by the agreement's `sub`.
 * Field names are OIDC snake_case (`phone_number`), unlike the camelCase
 * scope names. Fetchable for only 168 hours after consent — persist name and
 * contact details at signup, never later (docs/research/vipps-recurring-payments.md,
 * finding 12).
 */
export interface Userinfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
  phone_number?: string;
  phone_number_verified?: boolean;
  birthdate?: string;
  address?: UserinfoAddress;
  other_addresses?: UserinfoAddress[];
}
