import type { Organization } from "@stottemedlem/db";
import type { OrgWarning } from "../lib/orgWarnings";
import OrgSettingsScreen from "./OrgSettingsScreen.astro";
import StoryScreen from "./StoryScreen.astro";
import {
  ALL_WARNINGS,
  JOIN_URL,
  ORG,
  ORG_OPTED_OUT_OF_ADDRESSES,
  ORG_PATH,
  ORG_WITH_IMAGES,
  STORED_KEYS,
  storyIdentity,
  TERMS_URL,
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

// The chrome's identity is read off the organization the story renders, so
// what stands above the screen is what that organization has uploaded: these
// stories are where the chrome's four shapes (name alone, logo only, banner
// only, both) are reviewed, since the settings are where the imagery is set.
const settings = (props: Record<string, unknown> = {}, warnings: OrgWarning[] = []) => {
  const org = (props.org as Organization | undefined) ?? ORG_WITH_IMAGES;
  return {
    active: "innstillinger",
    warnings,
    identity: storyIdentity(org),
    slots: {
      default: {
        component: OrgSettingsScreen,
        props: {
          org,
          orgPath: ORG_PATH,
          joinUrl: JOIN_URL,
          termsUrl: TERMS_URL,
          values: {
            orgnr: ORG.orgnr ?? "",
            contactEmail: ORG.contactEmail ?? "",
            websiteUrl: ORG.websiteUrl ?? "",
          },
          name: ORG.name,
          postalAddress: { collectPostalAddress: true, postalAddressReason: "" },
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
 * What is stored, presented — the form only opens when asked for. Above it
 * the chrome shows the organization as the public page shows it, with the
 * two public addresses written out among the details.
 */
export const Default = { args: settings() };

/** Only a logo uploaded: the chrome shows it in its circle beside the name. */
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

/** Nothing uploaded yet: the chrome shows the name alone. */
export const NoImages = { args: settings({ org: ORG }) };

/**
 * An organization that opted out of postal addresses
 * (specs/use-cases/collect-postal-addresses.md): its supporters share the
 * three details and nothing more.
 */
export const OptedOutOfAddresses = {
  args: settings({
    org: ORG_OPTED_OUT_OF_ADDRESSES,
    postalAddress: { collectPostalAddress: false, postalAddressReason: "" },
  }),
};

/** An organization that put its own words in place of the standard reason. */
export const OwnAddressReason = {
  args: settings({
    org: {
      ...ORG_WITH_IMAGES,
      postalAddressReason: "Vi sender takkekort og medlemsbevis før jul.",
    },
    postalAddress: {
      collectPostalAddress: true,
      postalAddressReason: "Vi sender takkekort og medlemsbevis før jul.",
    },
  }),
};

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
      org: { ...ORG, orgnr: null, contactEmail: null, websiteUrl: null },
      values: { orgnr: "", contactEmail: "", websiteUrl: "" },
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
    values: { orgnr: "12345", contactEmail: "post@", websiteUrl: "korpset" },
    fieldErrors: {
      orgnr: "Oppgi et gyldig organisasjonsnummer (9 siffer).",
      contactEmail: "Oppgi en gyldig e-postadresse.",
      websiteUrl: "Oppgi en gyldig nettadresse, for eksempel www.organisasjonen.no.",
    },
  }),
};
