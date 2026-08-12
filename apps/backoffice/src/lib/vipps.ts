import { env } from "cloudflare:workers";
import { createVippsClient, type TokenCache, type VippsClient } from "@stottemedlem/vipps";

/**
 * Vipps client for this environment's platform sales unit. `VIPPS_API_BASE_URL`
 * selects the environment: apitest.vipps.no everywhere except production
 * (wrangler.jsonc / .dev.vars). v1 uses one credential set per environment;
 * per-org sales-unit keys (encrypted in D1) come with org onboarding.
 */
export function getVipps(): VippsClient {
  return createVippsClient({
    baseUrl: env.VIPPS_API_BASE_URL,
    clientId: env.VIPPS_CLIENT_ID,
    clientSecret: env.VIPPS_CLIENT_SECRET,
    subscriptionKey: env.VIPPS_SUBSCRIPTION_KEY,
    merchantSerialNumber: env.VIPPS_MSN,
    tokenCache: kvTokenCache(),
  });
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
