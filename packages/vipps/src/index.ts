/**
 * @stottemedlem/vipps — typed client for the Vipps MobilePay APIs the product
 * uses: Access Token, Recurring v3 (yearly agreements + charges), Webhooks v1
 * (registration + delivery HMAC verification).
 *
 * Environment selection is the caller's `baseUrl`: VIPPS_TEST_BASE_URL
 * (apitest.vipps.no — build and verify everything here first) or
 * VIPPS_PROD_BASE_URL. Consumed by apps/backoffice via src/lib/vipps.ts.
 */

export {
  createVippsClient,
  type TokenCache,
  VIPPS_PROD_BASE_URL,
  VIPPS_TEST_BASE_URL,
  VippsApiError,
  type VippsClient,
  type VippsConfig,
} from "./client.js";
export * from "./types.js";
export {
  contentSha256,
  signWebhookDelivery,
  verifyWebhookDelivery,
  type WebhookDelivery,
} from "./webhook-verification.js";
