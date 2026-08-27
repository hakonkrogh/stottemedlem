import type { OrgVippsKeys } from "./vippsKeys";

// What is not yet in order in an organization's back office
// (specs/use-cases/set-up-supporting-membership.md). Warnings are derived, not
// stored: each one is a fact about the organization plus the one place it is
// put right. The overview shows them in full; every other screen only carries
// the count as a badge on the tab that fixes it.

/** The tab an administrator goes to in order to put the warning right. */
export type OrgWarningTab = "innstillinger" | "medlemskap";

export interface OrgWarning {
  id: "profile" | "no-tiers" | "no-vipps-keys" | "payment-events";
  tab: OrgWarningTab;
  /** What is wrong, in the administrator's language. */
  message: string;
  actionLabel: string;
  href: string;
}

export interface OrgWarningInput {
  /** The organization's back-office root, e.g. /o/grorud-musikkorps. */
  orgPath: string;
  orgnr: string | null;
  contactEmail: string | null;
  tierCount: number;
  vippsKeys: OrgVippsKeys | null;
  /** Where this deployment expects the org's payment events to be delivered. */
  webhookUrl: string;
}

export function orgWarnings(input: OrgWarningInput): OrgWarning[] {
  const warnings: OrgWarning[] = [];

  if (input.orgnr === null || input.contactEmail === null) {
    warnings.push({
      id: "profile",
      tab: "innstillinger",
      message:
        "Den offentlige siden mangler informasjon Vipps krever (organisasjonsnummer og kontakt-e-post).",
      actionLabel: "Fyll inn nå",
      href: `${input.orgPath}/innstillinger?rediger=1`,
    });
  }

  if (input.tierCount === 0) {
    warnings.push({
      id: "no-tiers",
      tab: "medlemskap",
      message:
        "Organisasjonen har ingen medlemskap ennå — legg til minst ett med pris, så viser den offentlige siden tilbudet Vipps skal godkjenne.",
      actionLabel: "Sett opp medlemskap",
      href: `${input.orgPath}/medlemskap/ny`,
    });
  }

  if (!input.vippsKeys) {
    warnings.push({
      id: "no-vipps-keys",
      tab: "innstillinger",
      message:
        "Vipps er ikke koblet til ennå — legg inn salgsenhetens API-nøkler for å kunne ta betalt.",
      actionLabel: "Legg inn Vipps-nøkler",
      href: `${input.orgPath}/vipps`,
    });
  } else if (input.vippsKeys.webhook?.url !== input.webhookUrl) {
    // Payment events connect themselves, but until they are connected a
    // payment does not update a membership on its own — so it is worth saying,
    // and worth being able to retry by hand (specs/concepts/vipps-api-keys.md).
    warnings.push({
      id: "payment-events",
      tab: "innstillinger",
      message: input.vippsKeys.webhook
        ? "Betalingsvarslene peker et annet sted enn hit. De kobles om av seg selv, men medlemskap kan bli stående uendret til det er gjort."
        : "Betalingsvarsler er ikke koblet til ennå. De kobles til av seg selv, men til det er gjort blir ikke medlemskap oppdatert automatisk når noen betaler.",
      actionLabel: "Se betalingsvarsler",
      href: `${input.orgPath}/vipps`,
    });
  }

  return warnings;
}
