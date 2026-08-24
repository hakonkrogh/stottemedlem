/**
 * Shared configuration for the Vipps CLI scripts (smoke.mjs, recurring-test.mjs).
 *
 * Credentials come from the environment, falling back to
 * apps/backoffice/.dev.vars (see .dev.vars.example there) so one file feeds
 * both the dev server and these scripts. Everything here is TEST-environment
 * only: the scripts refuse to run against api.vipps.no, because they create
 * real agreements and charges.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { VIPPS_TEST_BASE_URL } from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
export const packageRoot = join(here, "..");
export const repoRoot = join(here, "../../..");
export const devVarsPath = join(repoRoot, "apps/backoffice/.dev.vars");
/** Written by scripts/tunnel.sh; the public HTTPS origin of the local tunnel. */
export const tunnelFilePath = join(repoRoot, ".vipps-tunnel");
/** Remembers the agreement/charge/webhook ids between CLI invocations. */
export const statePath = join(packageRoot, ".vipps-test-state.json");

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

/** Environment first, then .dev.vars, then empty. */
export function envVar(name) {
  return process.env[name] ?? devVars[name] ?? "";
}

/**
 * The four sales-unit credentials plus the base URL. Exits with instructions
 * rather than throwing, and refuses anything but the test environment.
 */
export function loadVippsConfig() {
  const config = {
    baseUrl: envVar("VIPPS_API_BASE_URL") || VIPPS_TEST_BASE_URL,
    clientId: envVar("VIPPS_CLIENT_ID"),
    clientSecret: envVar("VIPPS_CLIENT_SECRET"),
    subscriptionKey: envVar("VIPPS_SUBSCRIPTION_KEY"),
    merchantSerialNumber: envVar("VIPPS_MSN"),
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
      "Test keys live in portal.vippsmobilepay.com → For utviklere, on the TEST sales unit.",
    );
    process.exit(1);
  }

  if (config.baseUrl !== VIPPS_TEST_BASE_URL) {
    console.error(`Refusing to run against ${config.baseUrl} — test environment only.`);
    console.error(`Set VIPPS_API_BASE_URL="${VIPPS_TEST_BASE_URL}".`);
    process.exit(1);
  }

  return config;
}

/**
 * The public HTTPS origin Vipps must be able to reach: the redirect target,
 * the mandatory management page, and the webhook receiver. Explicit flag wins,
 * then VIPPS_TEST_PUBLIC_URL, then whatever `pnpm --filter @stottemedlem/vipps
 * run tunnel` wrote to .vipps-tunnel.
 */
export function publicBaseUrl(explicit) {
  const fromFile = () => {
    try {
      return readFileSync(tunnelFilePath, "utf8").trim();
    } catch {
      return "";
    }
  };
  const url = (explicit || envVar("VIPPS_TEST_PUBLIC_URL") || fromFile()).replace(/\/+$/, "");
  if (!url) return null;
  if (!url.startsWith("https://")) {
    console.error(`Public URL must be HTTPS (Vipps rejects anything else): ${url}`);
    process.exit(1);
  }
  return url;
}

export function readState() {
  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    return {};
  }
}

export function writeState(patch) {
  const next = { ...readState(), ...patch };
  writeFileSync(statePath, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}
