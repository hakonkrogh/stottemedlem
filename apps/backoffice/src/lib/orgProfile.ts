import { isValidOrganisasjonsnummer } from "@stottemedlem/core";
import type { OrganizationProfile } from "@stottemedlem/db";

// Shared parsing/validation for the public-profile fields the org landing page
// needs (specs/concepts/org-landing-page.md). The membership offer itself
// (tiers with prices) is managed separately on the back office's medlemskap
// page (specs/concepts/membership-tier.md).

export interface ProfileFormValues {
  orgnr: string;
  contactEmail: string;
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
  };
  const fieldErrors: ProfileFieldErrors = {};

  if (!isValidOrganisasjonsnummer(values.orgnr)) {
    fieldErrors.orgnr = "Oppgi et gyldig organisasjonsnummer (9 siffer).";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail)) {
    fieldErrors.contactEmail = "Oppgi en gyldig e-postadresse.";
  }

  if (Object.keys(fieldErrors).length > 0) return { values, fieldErrors };
  return {
    values,
    fieldErrors,
    profile: {
      orgnr: values.orgnr.replaceAll(" ", ""),
      contactEmail: values.contactEmail,
    },
  };
}

/** Prefill values for the settings form from a stored organization row. */
export function profileFormValues(org: {
  orgnr: string | null;
  contactEmail: string | null;
}): ProfileFormValues {
  return {
    orgnr: org.orgnr ?? "",
    contactEmail: org.contactEmail ?? "",
  };
}
