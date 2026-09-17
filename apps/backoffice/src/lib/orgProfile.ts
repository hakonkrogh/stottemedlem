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
  profile?: OrganizationProfile;
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
