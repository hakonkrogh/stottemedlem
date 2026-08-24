import { env } from "cloudflare:workers";
import {
  createVippsClient,
  type TokenCache,
  VIPPS_TEST_BASE_URL,
  type VippsClient,
} from "@stottemedlem/vipps";
import type { WorkOS } from "@workos-inc/node";
import { readOrgVippsKeys } from "./vippsKeys";

/**
 * Vipps client for one organization's own sales unit, using the keys its
 * administrator added on /o/[slug]/vipps (stored per org in WorkOS Vault —
 * see lib/vippsKeys.ts). `VIPPS_API_BASE_URL` selects the environment:
 * apitest.vipps.no everywhere except production (wrangler.jsonc / .dev.vars).
 * Null when the org hasn't connected Vipps yet.
 */
export async function getVippsForOrg(
  workos: WorkOS,
  workosOrgId: string,
): Promise<VippsClient | null> {
  const keys = (await readStoredKeys(workos, workosOrgId)) ?? testEnvironmentKeys();
  if (!keys) return null;
  return createVippsClient({
    baseUrl: env.VIPPS_API_BASE_URL,
    clientId: keys.clientId,
    clientSecret: keys.clientSecret,
    subscriptionKey: keys.subscriptionKey,
    merchantSerialNumber: keys.merchantSerialNumber,
    tokenCache: kvTokenCache(),
  });
}

/**
 * The org's own keys from Vault. Against the Vipps test environment a Vault
 * that is unreachable or unconfigured must not take the public join page down
 * — local development has the test sales unit in .dev.vars to fall back on.
 * In production a Vault failure is real and propagates.
 */
async function readStoredKeys(workos: WorkOS, workosOrgId: string) {
  try {
    return await readOrgVippsKeys(workos, workosOrgId);
  } catch (error) {
    if (env.VIPPS_API_BASE_URL !== VIPPS_TEST_BASE_URL) throw error;
    console.warn("Vault unavailable; falling back to test keys", error);
    return null;
  }
}

/**
 * Development affordance: one shared TEST sales unit from .dev.vars, used when
 * an org has no keys of its own in Vault — so the payment flow can be
 * exercised locally without a WorkOS account (see .dev.vars.example and
 * docs/vipps-local-recurring-test.md).
 *
 * Deliberately refused unless this deployment talks to apitest.vipps.no, so a
 * production organization can only ever be charged through the keys its own
 * administrator connected — never through ambient configuration.
 */
function testEnvironmentKeys() {
  if (env.VIPPS_API_BASE_URL !== VIPPS_TEST_BASE_URL) return null;
  const clientId = env.VIPPS_CLIENT_ID;
  const clientSecret = env.VIPPS_CLIENT_SECRET;
  const subscriptionKey = env.VIPPS_SUBSCRIPTION_KEY;
  const merchantSerialNumber = env.VIPPS_MSN;
  if (!clientId || !clientSecret || !subscriptionKey || !merchantSerialNumber) return null;
  return { clientId, clientSecret, subscriptionKey, merchantSerialNumber };
}

/**
 * The secret that proves a delivery came from Vipps, when the organization has
 * no registration of its own in Vault. Same test-environment-only bargain as
 * the keys above: it lets the whole payment loop be exercised locally against
 * one shared test sales unit, and is refused outright in production, where
 * every organization's deliveries are verified with its own secret.
 */
export function testEnvironmentWebhookSecret(): string | null {
  if (env.VIPPS_API_BASE_URL !== VIPPS_TEST_BASE_URL) return null;
  return env.VIPPS_WEBHOOK_SECRET || null;
}

/** Access-token cache in the VIPPS_TOKENS KV namespace (TTL from expires_in). */
function kvTokenCache(): TokenCache {
  return {
    get: (key) => env.VIPPS_TOKENS.get(key),
    put: async (key, value, ttlSeconds) => {
      await env.VIPPS_TOKENS.put(key, value, { expirationTtl: ttlSeconds });
    },
  };
}
