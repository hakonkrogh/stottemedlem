import type { OrgVippsKeys } from "./vippsKeys";

// What is not yet in order in an organization's back office
// (specs/use-cases/set-up-supporting-membership.md). Warnings are derived, not
// stored: each one is a fact about the organization plus the one place it is
// put right. The overview shows them in full; every other screen only carries
// the count as a badge on the tab that fixes it.

/** The tab an administrator goes to in order to put the warning right. */
export type OrgWarningTab = "innstillinger" | "medlemskap";

export interface OrgWarning {
  id: "profile" | "no-tiers" | "no-vipps-keys" | "payment-events" | "dpa";
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
  /** Has the org accepted the CURRENT data processing agreement? */
  dpaAccepted: boolean;
}

export function orgWarnings(input: OrgWarningInput): OrgWarning[] {
  const warnings: OrgWarning[] = [];

  // An organization created before the agreement existed never saw it, and one
  // on a superseded version has not agreed to what is current. Either way it is
  // asked rather than assumed (specs/concepts/data-processing-agreement.md) —
  // and asked first, because it governs everything the rest of the back office
  // does with member data.
  if (!input.dpaAccepted) {
    warnings.push({
      id: "dpa",
      tab: "innstillinger",
      message:
        "Databehandleravtalen er ikke godtatt ennå. Den sier hvordan støttemedlem.no behandler medlemsopplysningene på vegne av organisasjonen.",
      actionLabel: "Les og godta",
      href: `${input.orgPath}/innstillinger#databehandleravtale`,
    });
  }

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

/**
 * The warnings a place is where you go to fix — exactly what its tab badge
 * counted, so the place can spell the number out.
 */
export function warningsForTab(warnings: OrgWarning[], tab: OrgWarningTab): OrgWarning[] {
  return warnings.filter((warning) => warning.tab === tab);
}

/** One step on the way from a new organization to its first supporter. */
export interface SetupStep {
  id: "created" | "dpa" | "profile" | "tiers" | "vipps";
  title: string;
  done: boolean;
  /** Why the step matters and where to do it, while it is not done. */
  warning?: OrgWarning;
}

/**
 * The setup guide a new organization follows
 * (specs/use-cases/set-up-supporting-membership.md). Derived from the same
 * warnings as everything else, so the guide and the badges cannot disagree:
 * a step is done when nothing it owns is still warned about. The first step is
 * the one already taken, so a new organization starts with something ticked.
 */
export function setupSteps(warnings: OrgWarning[]): SetupStep[] {
  const find = (...ids: OrgWarning["id"][]) => warnings.find((w) => ids.includes(w.id));
  const step = (
    id: SetupStep["id"],
    title: string,
    warning: OrgWarning | undefined,
  ): SetupStep => ({ id, title, done: warning === undefined, warning });
  return [
    { id: "created", title: "Opprett organisasjonen", done: true },
    step("dpa", "Godta databehandleravtalen", find("dpa")),
    step("profile", "Fyll inn organisasjonsnummer og kontakt-e-post", find("profile")),
    step("tiers", "Sett opp minst ett medlemskap med pris", find("no-tiers")),
    step("vipps", "Koble til Vipps", find("no-vipps-keys", "payment-events")),
  ];
}

/**
 * Can supporters join and pay yet? Only what STOPS a payment counts here: a
 * public page Vipps will accept (profile), something to buy (a membership),
 * and a way to be paid (Vipps keys). Until then the front page shows the
 * setup guide in place of the plain warnings.
 */
export function readyForMembers(warnings: OrgWarning[]): boolean {
  return !warnings.some(
    (w) => w.id === "profile" || w.id === "no-tiers" || w.id === "no-vipps-keys",
  );
}
