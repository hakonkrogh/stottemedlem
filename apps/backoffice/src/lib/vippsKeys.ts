import { env } from "cloudflare:workers";
import { createVippsClient, VippsApiError } from "@stottemedlem/vipps";
import { NotFoundException, type WorkOS } from "@workos-inc/node";

// Each organization brings its own Vipps MobilePay sales-unit credentials
// (specs/concepts/vipps-api-keys.md). They are stored as ONE WorkOS Vault
// object per org — encrypted with a key derived from the org's id as context,
// so orgs are cryptographically isolated from each other. Which Vipps
// environment the keys must belong to is decided by VIPPS_API_BASE_URL:
// apitest.vipps.no everywhere except production, so test keys entered locally
// or on staging can never be confused with production keys.

/**
 * Where an organization's payment events are delivered, and the secret that
 * proves a delivery really came from Vipps. Stored beside the keys because it
 * is the same kind of thing: a per-org secret that must never be readable by
 * another organization. Vipps shows the secret once, at registration.
 */
export interface OrgWebhookRegistration {
  id: string;
  secret: string;
  /** The receiver URL registered — changes whenever the deployment's does. */
  url: string;
  registeredAt: string;
}

/** The credential set an org copies from portal.vippsmobilepay.com → For utviklere. */
export interface OrgVippsKeys {
  clientId: string;
  clientSecret: string;
  subscriptionKey: string;
  merchantSerialNumber: string;
  /** ISO timestamp of the last successful live validation against Vipps. */
  validatedAt: string;
  /** Absent until payment events have been connected for this deployment. */
  webhook?: OrgWebhookRegistration;
}

/** Vault object name; unique per WorkOS environment, one object per org. */
function vaultObjectName(workosOrgId: string): string {
  return `vipps-keys:${workosOrgId}`;
}

/** The stored keys for an org, or null if none have been added yet. */
export async function readOrgVippsKeys(
  workos: WorkOS,
  workosOrgId: string,
): Promise<OrgVippsKeys | null> {
  let value: string | undefined;
  try {
    ({ value } = await workos.vault.readObjectByName({ name: vaultObjectName(workosOrgId) }));
  } catch (error) {
    if (error instanceof NotFoundException) return null;
    throw error;
  }
  if (!value) return null;
  return JSON.parse(value) as OrgVippsKeys;
}

/** Create or replace the org's keys. Callers must have validated them first. */
export async function saveOrgVippsKeys(
  workos: WorkOS,
  workosOrgId: string,
  keys: OrgVippsKeys,
): Promise<void> {
  const name = vaultObjectName(workosOrgId);
  const value = JSON.stringify(keys);
  try {
    const existing = await workos.vault.readObjectByName({ name });
    await workos.vault.updateObject({ id: existing.id, value });
  } catch (error) {
    if (!(error instanceof NotFoundException)) throw error;
    await workos.vault.createObject({
      name,
      value,
      context: { organizationId: workosOrgId },
    });
  }
}

/**
 * Store (or replace) where this deployment receives the org's payment events.
 * Kept alongside the keys so a single Vault read gives everything the webhook
 * receiver needs to verify a delivery.
 */
export async function saveOrgWebhookRegistration(
  workos: WorkOS,
  workosOrgId: string,
  webhook: OrgWebhookRegistration,
): Promise<void> {
  const keys = await readOrgVippsKeys(workos, workosOrgId);
  if (!keys) throw new Error("cannot register webhooks before the org has Vipps keys");
  await saveOrgVippsKeys(workos, workosOrgId, { ...keys, webhook });
}

export type VippsKeysValidation = { ok: true } | { ok: false; message: string };

/**
 * Prove the credential set works against THIS environment's Vipps API before
 * it is stored: fetch an access token (validates client id/secret +
 * subscription key) and list webhook registrations (validates the MSN belongs
 * to the same sales unit). Read-only; no token cache so nothing is persisted
 * for keys that are never saved.
 */
export async function validateVippsKeys(
  keys: Pick<
    OrgVippsKeys,
    "clientId" | "clientSecret" | "subscriptionKey" | "merchantSerialNumber"
  >,
): Promise<VippsKeysValidation> {
  const client = createVippsClient({ baseUrl: env.VIPPS_API_BASE_URL, ...keys });
  try {
    await client.getAccessToken();
    await client.listWebhooks();
    return { ok: true };
  } catch (error) {
    if (error instanceof VippsApiError) {
      if (error.status === 401 || error.status === 403) {
        return {
          ok: false,
          message:
            "Vipps avviste nøklene. Sjekk at alle fire verdiene er kopiert riktig fra " +
            `portalen, og at de hører til ${vippsEnvironmentLabel()}.`,
        };
      }
      return {
        ok: false,
        message: `Vipps svarte med feil (HTTP ${error.status}). Prøv igjen om litt.`,
      };
    }
    throw error;
  }
}

/** Human label for the Vipps environment this deployment talks to. */
export function vippsEnvironmentLabel(): string {
  return env.VIPPS_API_BASE_URL.includes("apitest")
    ? "testmiljøet (apitest.vipps.no)"
    : "produksjonsmiljøet (api.vipps.no)";
}

// ── Form parsing (mirrors lib/orgProfile.ts) ────────────────────────────────

export interface VippsKeysFormValues {
  clientId: string;
  clientSecret: string;
  subscriptionKey: string;
  merchantSerialNumber: string;
}

export type VippsKeysFieldErrors = Partial<Record<keyof VippsKeysFormValues, string>>;

export interface ParsedVippsKeysForm {
  values: VippsKeysFormValues;
  fieldErrors: VippsKeysFieldErrors;
  /** Present only when every field validated. */
  keys?: VippsKeysFormValues;
}

export function parseVippsKeysForm(form: FormData): ParsedVippsKeysForm {
  const values: VippsKeysFormValues = {
    clientId: String(form.get("clientId") ?? "").trim(),
    clientSecret: String(form.get("clientSecret") ?? "").trim(),
    subscriptionKey: String(form.get("subscriptionKey") ?? "").trim(),
    merchantSerialNumber: String(form.get("merchantSerialNumber") ?? "").trim(),
  };
  const fieldErrors: VippsKeysFieldErrors = {};

  if (!values.clientId) fieldErrors.clientId = "Lim inn client_id fra Vipps-portalen.";
  if (!values.clientSecret) fieldErrors.clientSecret = "Lim inn client_secret fra Vipps-portalen.";
  if (!values.subscriptionKey) {
    fieldErrors.subscriptionKey = "Lim inn subscription key fra Vipps-portalen.";
  }
  if (!/^\d{4,7}$/.test(values.merchantSerialNumber)) {
    fieldErrors.merchantSerialNumber = "Oppgi salgsenhetens MSN (4–7 siffer).";
  }

  if (Object.keys(fieldErrors).length > 0) return { values, fieldErrors };
  return { values, fieldErrors, keys: values };
}

/** Mask a stored secret for display: last four characters only. */
export function maskSecret(secret: string): string {
  return `••••${secret.slice(-4)}`;
}
