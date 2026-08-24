#!/usr/bin/env node
/**
 * Read-only smoke test against the Vipps MobilePay TEST environment
 * (apitest.vipps.no): fetches an access token and lists webhook registrations.
 * Proves all four credentials (client id/secret, subscription key, MSN) work
 * before any real integration code runs. Creates/charges nothing.
 *
 * Keys come from the environment, falling back to apps/backoffice/.dev.vars
 * (see scripts/config.mjs). To exercise a real agreement end to end instead,
 * use scripts/recurring-test.mjs (docs/vipps-local-recurring-test.md).
 *
 * Run: pnpm --filter @stottemedlem/vipps run smoke
 */
import { createVippsClient } from "../dist/index.js";
import { loadVippsConfig } from "./config.mjs";

const config = loadVippsConfig();
console.log(`Vipps smoke test → ${config.baseUrl} (MSN ${config.merchantSerialNumber})`);

const client = createVippsClient(config);

const token = await client.getAccessToken();
console.log(`✓ access token issued (${token.length} chars, redacted)`);

const { webhooks } = await client.listWebhooks();
console.log(`✓ webhooks API reachable — ${webhooks.length} registration(s) for this sales unit`);
for (const hook of webhooks) {
  console.log(`  - ${hook.id}: ${hook.url} (${hook.events.length} event types)`);
}

console.log("Smoke test passed: credentials are valid for the test environment.");
