#!/usr/bin/env node
/**
 * Read-only smoke test against the Vipps MobilePay TEST environment
 * (apitest.vipps.no): fetches an access token and lists webhook registrations.
 * Proves all four credentials (client id/secret, subscription key, MSN) work
 * before any real integration code runs. Creates/charges nothing.
 *
 * Keys come from the environment, falling back to apps/backoffice/.dev.vars
 * (see .dev.vars.example there; keys live in portal.vippsmobilepay.com →
 * For utviklere after the Faste betalinger order is submitted).
 *
 * Run: pnpm --filter @stottemedlem/vipps run smoke
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createVippsClient, VIPPS_TEST_BASE_URL } from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const devVarsPath = join(here, "../../../apps/backoffice/.dev.vars");

function loadDevVars() {
  let text;
  try {
    text = readFileSync(devVarsPath, "utf8");
  } catch {
    return {};
  }
  const vars = {};
  for (const line of text.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/.exec(line);
    if (match) vars[match[1]] = match[2];
  }
  return vars;
}

const devVars = loadDevVars();
const get = (name) => process.env[name] ?? devVars[name] ?? "";

const config = {
  baseUrl: get("VIPPS_API_BASE_URL") || VIPPS_TEST_BASE_URL,
  clientId: get("VIPPS_CLIENT_ID"),
  clientSecret: get("VIPPS_CLIENT_SECRET"),
  subscriptionKey: get("VIPPS_SUBSCRIPTION_KEY"),
  merchantSerialNumber: get("VIPPS_MSN"),
};

const missing = Object.entries({
  VIPPS_CLIENT_ID: config.clientId,
  VIPPS_CLIENT_SECRET: config.clientSecret,
  VIPPS_SUBSCRIPTION_KEY: config.subscriptionKey,
  VIPPS_MSN: config.merchantSerialNumber,
})
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  console.error(`Missing Vipps credentials: ${missing.join(", ")}`);
  console.error(`Set them in the environment or in ${devVarsPath}`);
  console.error(
    "Test keys appear in portal.vippsmobilepay.com → For utviklere once the Faste betalinger order is submitted.",
  );
  process.exit(1);
}

if (config.baseUrl !== VIPPS_TEST_BASE_URL) {
  console.error(`Refusing to smoke-test against ${config.baseUrl} — test environment only.`);
  process.exit(1);
}

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
