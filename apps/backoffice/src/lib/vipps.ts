import { env } from "cloudflare:workers";
import { createVippsClient, type TokenCache, type VippsClient } from "@stottemedlem/vipps";
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
  const keys = await readOrgVippsKeys(workos, workosOrgId);
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

/** Access-token cache in the VIPPS_TOKENS KV namespace (TTL from expires_in). */
function kvTokenCache(): TokenCache {
  return {
    get: (key) => env.VIPPS_TOKENS.get(key),
    put: async (key, value, ttlSeconds) => {
      await env.VIPPS_TOKENS.put(key, value, { expirationTtl: ttlSeconds });
    },
  };
}
