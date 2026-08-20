/**
 * @stottemedlem/core — shared domain types and logic.
 *
 * This is the canonical example of a shared workspace package: pure TypeScript,
 * built to `dist/` with `tsc`, and consumed by apps via the `workspace:*`
 * protocol. Add more shared packages (e.g. `ui`, `utils`) alongside this one.
 */

// --- Membership tiers (specs/concepts/membership-tier.md) -------------------
//
// The product hosts the tier catalogue (Vipps has no product-catalogue API);
// each tier is projected onto every Vipps agreement created for it. The Vipps
// Recurring v3 limits below are from the OpenAPI spec and cap what a tier may
// carry, so a tier always projects losslessly.

/** Vipps Recurring v3: max length of an agreement's `productName`. */
export const VIPPS_PRODUCT_NAME_MAX_LENGTH = 45;
/** Vipps Recurring v3: max length of an agreement's `productDescription`. */
export const VIPPS_PRODUCT_DESCRIPTION_MAX_LENGTH = 100;
/** Vipps Recurring v3: max length of an agreement's `externalId`. */
export const VIPPS_EXTERNAL_ID_MAX_LENGTH = 64;

/**
 * Max length of a membership tier key. Chosen so the agreement externalId
 * convention (`<tierKey>:<membershipId>` with a UUID membership id) always
 * fits Vipps' 64-char `externalId` limit: 24 + 1 + 36 = 61.
 */
export const MEMBERSHIP_TIER_KEY_MAX_LENGTH = 24;

/**
 * The name of the minimal first membership every organization states at
 * creation (specs/concepts/membership-tier.md) — renameable afterwards.
 */
export const DEFAULT_MEMBERSHIP_TIER_NAME = "Støttemedlemskap";

/**
 * Max length of a tier's own description. Deliberately LONGER than Vipps'
 * `productDescription` (and multi-line): the description is written for the
 * organization's landing page, and `vippsProductDescription` derives the
 * shorter single-line form the payment provider's field can hold.
 */
export const MEMBERSHIP_TIER_DESCRIPTION_MAX_LENGTH = 200;

/**
 * Clean up a pasted/typed tier description without narrowing what may be
 * written: any printable text is kept (Norwegian letters, punctuation, emoji);
 * only line endings are normalized, tabs become spaces, other control
 * characters are dropped, and runs of blank lines collapse to one.
 */
export function normalizeMembershipTierDescription(input: string): string {
  return input
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\t", " ")
    .replaceAll(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
    .replaceAll(/ +\n/g, "\n")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * The single-line form of a tier description that fits a Vipps agreement's
 * `productDescription`: line breaks and runs of whitespace collapse to single
 * spaces, and anything longer than the limit is cut at a word boundary with
 * an ellipsis. The full description stays on the landing page.
 */
export function vippsProductDescription(description: string): string {
  const singleLine = description.replaceAll(/\s+/g, " ").trim();
  if (singleLine.length <= VIPPS_PRODUCT_DESCRIPTION_MAX_LENGTH) return singleLine;
  const cut = singleLine.slice(0, VIPPS_PRODUCT_DESCRIPTION_MAX_LENGTH - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed =
    lastSpace > VIPPS_PRODUCT_DESCRIPTION_MAX_LENGTH / 2 ? cut.slice(0, lastSpace) : cut;
  return `${trimmed.trimEnd()}…`;
}

/**
 * A membership tier's stable key, derived from its name when the tier is
 * created and never changed afterwards (renames change the name, not the key).
 * Unique within the organization — callers add a `-2`/`-3` suffix on collision.
 */
export function membershipTierKey(name: string): string {
  const key = slugify(name).slice(0, MEMBERSHIP_TIER_KEY_MAX_LENGTH).replace(/-+$/, "");
  return key || "medlemskap";
}

/**
 * The agreement `externalId` convention that ties a Vipps agreement back to
 * the tier it was created for (and the local membership record): the tier key,
 * a colon, then the membership id. Guaranteed to fit Vipps' 64-char limit for
 * UUID membership ids.
 */
export function tierAgreementExternalId(tierKey: string, membershipId: string): string {
  const externalId = `${tierKey}:${membershipId}`;
  if (externalId.length > VIPPS_EXTERNAL_ID_MAX_LENGTH) {
    throw new Error(`agreement externalId exceeds ${VIPPS_EXTERNAL_ID_MAX_LENGTH} chars`);
  }
  return externalId;
}

/** Recover the tier key from an agreement `externalId` written by the convention above. */
export function tierKeyFromAgreementExternalId(externalId: string): string | null {
  const colon = externalId.indexOf(":");
  return colon > 0 ? externalId.slice(0, colon) : null;
}

/**
 * Canonical public origin, punycode form of støttemedlem.no. Anything printed
 * or embedded off-site (QR payloads, embed snippets) must use this ASCII form —
 * a raw ø breaks some scanners/clients.
 */
export const CANONICAL_ORIGIN = "https://xn--stttemedlem-hgb.no";

/** Display form of the canonical origin, for UI copy only. */
export const CANONICAL_ORIGIN_DISPLAY = "https://støttemedlem.no";

/** URL-safe slug from Norwegian text: lowercase ASCII words joined by hyphens. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "o")
    .replaceAll("å", "a")
    .normalize("NFKD")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

/** URL-safe slug from an organization's public name (Norwegian-aware). */
export function slugifyOrganizationName(name: string): string {
  const slug = slugify(name).slice(0, 63);
  return slug || "min-organisasjon";
}

/**
 * The organization's join entry point (see specs/concepts/join-entry-point.md) —
 * the stable URL QR codes and shared links carry. Must never change once
 * printed; the destination behind it can. The shareable entry point is always
 * the bare URL — the product offers no per-membership link. The optional tier
 * key (`?medlemskap=<tierKey>`) only carries the choice a supporter already
 * made on the landing page onward into joining.
 */
export function joinEntryPointUrl(slug: string, tierKey?: string): string {
  const url = `${CANONICAL_ORIGIN}/bli-med/${slug}`;
  return tierKey ? `${url}?medlemskap=${encodeURIComponent(tierKey)}` : url;
}

/**
 * The organization's public landing page (see specs/concepts/org-landing-page.md) —
 * the address an admin pastes into forms that require "your website" (e.g. the
 * Vipps Faste betalinger order). Stable once the slug is assigned.
 */
export function orgLandingPageUrl(slug: string): string {
  return `${CANONICAL_ORIGIN}/org/${slug}`;
}

/** The organization's standard sales-terms (salgsvilkår) page, linked from the landing page. */
export function orgTermsUrl(slug: string): string {
  return `${CANONICAL_ORIGIN}/org/${slug}/vilkar`;
}

/**
 * Validate a Norwegian organisasjonsnummer: 9 digits with a MOD11 check digit
 * (weights 3,2,7,6,5,4,3,2). Accepts digits with optional spaces.
 */
/** Display form of an organisasjonsnummer: "923609016" → "923 609 016". */
export function formatOrganisasjonsnummer(orgnr: string): string {
  const digits = orgnr.replaceAll(" ", "");
  if (!/^\d{9}$/.test(digits)) return orgnr;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function isValidOrganisasjonsnummer(input: string): boolean {
  const digits = input.replaceAll(" ", "");
  if (!/^\d{9}$/.test(digits)) return false;
  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const remainder = sum % 11;
  const control = remainder === 0 ? 0 : 11 - remainder;
  if (control === 10) return false;
  return control === Number(digits[8]);
}
