import { isValidOrganisasjonsnummer, normalizeWebsiteUrl } from "@stottemedlem/core";
import type { OrganizationProfile } from "@stottemedlem/db";

// Shared parsing/validation for the public-profile fields the join page
// needs (specs/concepts/join-page.md). The membership offer itself
// (tiers with prices) is managed separately on the back office's medlemskap
// page (specs/concepts/membership-tier.md).

export interface ProfileFormValues {
  orgnr: string;
  contactEmail: string;
  websiteUrl: string;
}

export type ProfileFieldErrors = Partial<Record<keyof ProfileFormValues, string>>;

export interface ParsedProfileForm {
  values: ProfileFormValues;
  fieldErrors: ProfileFieldErrors;
  /** Present only when every field validated. */
  profile?: Omit<OrganizationProfile, "postalAddressReason" | "postalAddressesDeclinedAt">;
}

export function parseProfileForm(form: FormData): ParsedProfileForm {
  const values: ProfileFormValues = {
    orgnr: String(form.get("orgnr") ?? "").trim(),
    contactEmail: String(form.get("contactEmail") ?? "").trim(),
    websiteUrl: String(form.get("websiteUrl") ?? "").trim(),
  };
  const fieldErrors: ProfileFieldErrors = {};

  if (!isValidOrganisasjonsnummer(values.orgnr)) {
    fieldErrors.orgnr = "Oppgi et gyldig organisasjonsnummer (9 siffer).";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail)) {
    fieldErrors.contactEmail = "Oppgi en gyldig e-postadresse.";
  }
  // The website is optional; only an address that was written and cannot be
  // read as one is an error.
  const websiteUrl = normalizeWebsiteUrl(values.websiteUrl);
  if (values.websiteUrl !== "" && websiteUrl === null) {
    fieldErrors.websiteUrl = "Oppgi en gyldig nettadresse, for eksempel www.organisasjonen.no.";
  }

  if (Object.keys(fieldErrors).length > 0) return { values, fieldErrors };
  return {
    values,
    fieldErrors,
    profile: {
      orgnr: values.orgnr.replaceAll(" ", ""),
      contactEmail: values.contactEmail,
      websiteUrl,
    },
  };
}

// Whether the organization asks its supporters for a postal address, and in
// which words (specs/use-cases/collect-postal-addresses.md). Every
// organization asks unless it opts out, and reads the standard reason unless
// it writes its own; its own form section, on the settings page only.

export interface PostalAddressChoiceValues {
  collectPostalAddress: boolean;
  /** The organization's own reason; empty means the standard one stands. */
  postalAddressReason: string;
}

export interface ParsedPostalAddressChoice {
  values: PostalAddressChoiceValues;
  error?: string;
  /** Present only when the choice validated: what to store. */
  choice?: { postalAddressReason: string | null; postalAddressesDeclinedAt: string | null };
}

export const POSTAL_ADDRESS_REASON_MAX_LENGTH = 200;

/**
 * Parse the choice. The moment an organization opted out is kept once made:
 * saving the settings again with the box still unticked does not move it.
 */
export function parsePostalAddressChoice(
  form: FormData,
  org: { postalAddressesDeclinedAt: string | null },
): ParsedPostalAddressChoice {
  const values: PostalAddressChoiceValues = {
    collectPostalAddress: form.get("collectPostalAddress") === "1",
    postalAddressReason: String(form.get("postalAddressReason") ?? "").trim(),
  };
  if (values.postalAddressReason.length > POSTAL_ADDRESS_REASON_MAX_LENGTH) {
    return {
      values,
      error: `Hold begrunnelsen under ${POSTAL_ADDRESS_REASON_MAX_LENGTH} tegn.`,
    };
  }
  return {
    values,
    choice: {
      postalAddressReason: values.postalAddressReason || null,
      postalAddressesDeclinedAt: values.collectPostalAddress
        ? null
        : (org.postalAddressesDeclinedAt ?? new Date().toISOString()),
    },
  };
}

/** Prefill the address choice from a stored organization row. */
export function postalAddressChoiceValues(org: {
  postalAddressReason: string | null;
  postalAddressesDeclinedAt: string | null;
}): PostalAddressChoiceValues {
  return {
    collectPostalAddress: !org.postalAddressesDeclinedAt,
    postalAddressReason: org.postalAddressReason ?? "",
  };
}

/** Prefill values for the settings form from a stored organization row. */
export function profileFormValues(org: {
  orgnr: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
}): ProfileFormValues {
  return {
    orgnr: org.orgnr ?? "",
    contactEmail: org.contactEmail ?? "",
    websiteUrl: org.websiteUrl ?? "",
  };
}
