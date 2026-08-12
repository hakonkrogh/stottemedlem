import { isValidOrganisasjonsnummer } from "@stottemedlem/core";
import type { OrganizationProfile } from "@stottemedlem/db";

// Shared parsing/validation for the public-profile fields the org landing page
// needs (specs/concepts/org-landing-page.md): collected at org creation and
// editable/completable later on the settings page.

export interface ProfileFormValues {
  orgnr: string;
  contactEmail: string;
  annualFee: string;
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
    annualFee: String(form.get("annualFee") ?? "").trim(),
  };
  const fieldErrors: ProfileFieldErrors = {};

  if (!isValidOrganisasjonsnummer(values.orgnr)) {
    fieldErrors.orgnr = "Oppgi et gyldig organisasjonsnummer (9 siffer).";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail)) {
    fieldErrors.contactEmail = "Oppgi en gyldig e-postadresse.";
  }
  const fee = Number(values.annualFee.replace(",", "."));
  if (!Number.isInteger(fee) || fee < 1) {
    fieldErrors.annualFee = "Oppgi årsbeløpet i hele kroner.";
  }

  if (Object.keys(fieldErrors).length > 0) return { values, fieldErrors };
  return {
    values,
    fieldErrors,
    profile: {
      orgnr: values.orgnr.replaceAll(" ", ""),
      contactEmail: values.contactEmail,
      annualFeeNok: fee,
    },
  };
}

/** Prefill values for the settings form from a stored organization row. */
export function profileFormValues(org: {
  orgnr: string | null;
  contactEmail: string | null;
  annualFeeNok: number | null;
}): ProfileFormValues {
  return {
    orgnr: org.orgnr ?? "",
    contactEmail: org.contactEmail ?? "",
    annualFee: org.annualFeeNok === null ? "" : String(org.annualFeeNok),
  };
}
