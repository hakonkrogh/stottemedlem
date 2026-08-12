/**
 * @stottemedlem/core — shared domain types and logic.
 *
 * This is the canonical example of a shared workspace package: pure TypeScript,
 * built to `dist/` with `tsc`, and consumed by apps via the `workspace:*`
 * protocol. Add more shared packages (e.g. `ui`, `utils`) alongside this one.
 */

export type MembershipTier = "supporter" | "standard" | "patron";

export interface Member {
  id: string;
  name: string;
  email: string;
  tier: MembershipTier;
  joinedAt: Date;
}

/** Human-friendly label for a membership tier. */
export function tierLabel(tier: MembershipTier): string {
  switch (tier) {
    case "supporter":
      return "Støttemedlem";
    case "standard":
      return "Medlem";
    case "patron":
      return "Æresmedlem";
  }
}

/** Greet a member by name. */
export function greetMember(member: Member): string {
  return `Velkommen, ${member.name}! (${tierLabel(member.tier)})`;
}

/**
 * Canonical public origin, punycode form of støttemedlem.no. Anything printed
 * or embedded off-site (QR payloads, embed snippets) must use this ASCII form —
 * a raw ø breaks some scanners/clients.
 */
export const CANONICAL_ORIGIN = "https://xn--stttemedlem-hgb.no";

/** Display form of the canonical origin, for UI copy only. */
export const CANONICAL_ORIGIN_DISPLAY = "https://støttemedlem.no";

/** URL-safe slug from an organization's public name (Norwegian-aware). */
export function slugifyOrganizationName(name: string): string {
  const slug = name
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "o")
    .replaceAll("å", "a")
    .normalize("NFKD")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 63);
  return slug || "min-organisasjon";
}

/**
 * The organization's join entry point (see specs/concepts/join-entry-point.md) —
 * the stable URL QR codes and shared links carry. Must never change once
 * printed; the destination behind it can.
 */
export function joinEntryPointUrl(slug: string): string {
  return `${CANONICAL_ORIGIN}/bli-med/${slug}`;
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
