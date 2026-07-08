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
