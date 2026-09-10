import type { Organization } from "@stottemedlem/db";
import type { OrgWarning } from "../lib/orgWarnings";
import OrgSettingsScreen from "./OrgSettingsScreen.astro";
import StoryScreen from "./StoryScreen.astro";
import {
  ALL_WARNINGS,
  FIXTURE_LOGO_URL,
  JOIN_URL,
  ORG,
  ORG_PATH,
  ORG_WITH_IMAGES,
  STORED_KEYS,
  WEBHOOK_URL,
} from "./storyFixtures";

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

// The chrome's own logo is read off the organization the story renders, so the
// mark above the screen and the preview inside it can never contradict each
// other: a story about an org with no logo shows none in either place.
const settings = (props: Record<string, unknown> = {}, warnings: OrgWarning[] = []) => {
  const org = (props.org as Organization | undefined) ?? ORG_WITH_IMAGES;
  return {
    active: "innstillinger",
    warnings,
    logoUrl: org.logoKey ? FIXTURE_LOGO_URL : null,
    slots: {
      default: {
        component: OrgSettingsScreen,
        props: {
          org,
          orgPath: ORG_PATH,
          joinUrl: JOIN_URL,
          values: { orgnr: ORG.orgnr ?? "", contactEmail: ORG.contactEmail ?? "" },
          name: ORG.name,
          vippsKeys: storedKeys,
          paymentEventsConnected: true,
          warnings,
          ...props,
        },
      },
    },
  };
};

/**
 * What is stored, presented — the form only opens when asked for. The
 * organization is shown as the public page shows it: the very same identity
 * header, inside the public page's own column.
 */
export const Default = { args: settings() };

/** Only a logo uploaded: it sits in its circle beside the name. */
export const LogoOnly = {
  args: settings({ org: { ...ORG_WITH_IMAGES, bannerKey: null } }),
};

/** Only a banner uploaded: the wide backdrop, the name below it. */
export const BannerOnly = {
  args: settings({ org: { ...ORG_WITH_IMAGES, logoKey: null } }),
};

/** The banner cropped around the focal point the organization chose. */
export const BannerFocalPoint = {
  args: settings({ org: { ...ORG_WITH_IMAGES, bannerFocusX: 50, bannerFocusY: 0 } }),
};

/** Nothing uploaded yet: the preview says so, and shows the name alone. */
export const NoImages = { args: settings({ org: ORG }) };

/** The one edit action, opened — with the banner's focal-point picker. */
export const Editing = { args: settings({ editing: true }) };

/** Saving closes the form again and says so. */
export const Saved = { args: settings({ saved: true }) };

/** The acceptance of the data processing agreement is confirmed in words too. */
export const DpaJustAccepted = { args: settings({ dpaJustAccepted: true }) };

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
