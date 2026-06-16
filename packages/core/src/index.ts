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
