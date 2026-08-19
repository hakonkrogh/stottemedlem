#!/usr/bin/env node
/**
 * Smoke test for WorkOS Vault — the encrypted per-org store holding each
 * organization's Vipps API keys (src/lib/vippsKeys.ts). Round-trips a
 * throwaway object (create → read by name → update → delete) so you know
 * Vault is enabled for the WorkOS environment before relying on it.
 *
 * The API key comes from WORKOS_API_KEY in the environment, falling back to
 * apps/backoffice/.dev.vars. Run from the repo root:
 *   pnpm --filter @stottemedlem/backoffice run vault-smoke
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WorkOS } from "@workos-inc/node";

const here = dirname(fileURLToPath(import.meta.url));
const devVarsPath = join(here, "../.dev.vars");

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

const apiKey = process.env.WORKOS_API_KEY ?? loadDevVars().WORKOS_API_KEY;
if (!apiKey) {
  console.error(`WORKOS_API_KEY not set (environment or ${devVarsPath}).`);
  process.exit(1);
}

const workos = new WorkOS(apiKey);
const name = `vault-smoke:${randomUUID()}`;

console.log(`WorkOS Vault smoke test (object "${name}")`);

try {
  const created = await workos.vault.createObject({
    name,
    value: "smoke-1",
    context: { organizationId: "vault-smoke" },
  });
  console.log(`✓ createObject → ${created.id}`);

  const read = await workos.vault.readObjectByName({ name });
  if (read.value !== "smoke-1") throw new Error(`read back unexpected value: ${read.value}`);
  console.log("✓ readObjectByName returned the stored value");

  await workos.vault.updateObject({ id: created.id, value: "smoke-2" });
  const reread = await workos.vault.readObject({ id: created.id });
  if (reread.value !== "smoke-2") throw new Error("update not reflected on read");
  console.log("✓ updateObject + readObject round-trip");

  await workos.vault.deleteObject({ id: created.id });
  console.log("✓ deleteObject");
  console.log("Vault is enabled and working for this WorkOS environment.");
} catch (error) {
  console.error("Vault smoke test FAILED:", error.message ?? error);
  console.error(
    "If this is a 401/402/403, Vault may not be enabled for this WorkOS environment — " +
      "check the WorkOS dashboard (Vault) or contact WorkOS.",
  );
  process.exit(1);
}
