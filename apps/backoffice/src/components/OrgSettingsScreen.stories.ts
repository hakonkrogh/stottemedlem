import type { OrgWarning } from "../lib/orgWarnings";
import OrgSettingsScreen from "./OrgSettingsScreen.astro";
import StoryScreen from "./StoryScreen.astro";
import { ALL_WARNINGS, ORG, ORG_PATH, STORED_KEYS, WEBHOOK_URL } from "./storyFixtures";

export default {
  title: "Backoffice/Innstillinger",
  component: StoryScreen,
};

const storedKeys = {
  clientId: STORED_KEYS.clientId,
  clientSecret: "secret-value-9f2a",
  subscriptionKey: "subscription-value-41cd",
  merchantSerialNumber: STORED_KEYS.merchantSerialNumber,
  validatedAt: "2026-08-27T09:00:00.000Z",
  webhook: { id: "wh-1", secret: "s", url: WEBHOOK_URL, registeredAt: "2026-08-27T09:00:00.000Z" },
};

const settings = (props: Record<string, unknown> = {}, warnings: OrgWarning[] = []) => ({
  active: "innstillinger",
  warnings,
  slots: {
    default: {
      component: OrgSettingsScreen,
      props: {
        org: ORG,
        orgPath: ORG_PATH,
        values: { orgnr: ORG.orgnr ?? "", contactEmail: ORG.contactEmail ?? "" },
        name: ORG.name,
        vippsKeys: storedKeys,
        paymentEventsConnected: true,
        warnings,
        ...props,
      },
    },
  },
});

/** What is stored, presented — the form only opens when asked for. */
export const Default = { args: settings() };

/** The one edit action, opened. */
export const Editing = { args: settings({ editing: true }) };

/** Saving closes the form again and says so. */
export const Saved = { args: settings({ saved: true }) };

/**
 * Anything the organization has not given yet reads as missing, not blank —
 * and the tab's badge is spelled out here, each with the action that fixes it.
 */
export const Incomplete = {
  args: settings(
    {
      org: { ...ORG, orgnr: null, contactEmail: null },
      values: { orgnr: "", contactEmail: "" },
      vippsKeys: null,
      paymentEventsConnected: false,
    },
    ALL_WARNINGS.filter((w) => w.tab === "innstillinger"),
  ),
};

/** A rejected save keeps the form open with what was typed. */
export const WithErrors = {
  args: settings({
    editing: true,
    values: { orgnr: "12345", contactEmail: "post@" },
    fieldErrors: {
      orgnr: "Oppgi et gyldig organisasjonsnummer (9 siffer).",
      contactEmail: "Oppgi en gyldig e-postadresse.",
    },
  }),
};
