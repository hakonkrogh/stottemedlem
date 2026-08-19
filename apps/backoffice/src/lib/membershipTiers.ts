import {
  VIPPS_PRODUCT_DESCRIPTION_MAX_LENGTH,
  VIPPS_PRODUCT_NAME_MAX_LENGTH,
} from "@stottemedlem/core";
import type { MembershipTierInput } from "@stottemedlem/db";

// Parsing/validation for the membership-tier forms on the medlemskap page
// (specs/concepts/membership-tier.md). The length limits are Vipps' agreement
// productName/productDescription limits — a tier must always project onto a
// Vipps agreement losslessly, so they are enforced at input time.

export interface TierFormValues {
  name: string;
  description: string;
  annualFee: string;
}

export type TierFieldErrors = Partial<Record<keyof TierFormValues, string>>;

export interface ParsedTierForm {
  values: TierFormValues;
  fieldErrors: TierFieldErrors;
  /** Present only when every field validated. */
  input?: MembershipTierInput;
}

/** Parse an annual-fee field: whole NOK, at least 1. */
export function parseAnnualFee(value: string): { fee: number } | { error: string } {
  const fee = Number(value.replace(",", "."));
  if (!Number.isInteger(fee) || fee < 1) return { error: "Oppgi årsbeløpet i hele kroner." };
  return { fee };
}

export function parseTierForm(form: FormData): ParsedTierForm {
  const values: TierFormValues = {
    name: String(form.get("name") ?? "").trim(),
    description: String(form.get("description") ?? "").trim(),
    annualFee: String(form.get("annualFee") ?? "").trim(),
  };
  const fieldErrors: TierFieldErrors = {};

  if (!values.name) {
    fieldErrors.name = "Gi medlemskapet et navn.";
  } else if (values.name.length > VIPPS_PRODUCT_NAME_MAX_LENGTH) {
    fieldErrors.name = `Navnet kan være maks ${VIPPS_PRODUCT_NAME_MAX_LENGTH} tegn (det vises i Vipps-appen).`;
  }
  if (values.description.length > VIPPS_PRODUCT_DESCRIPTION_MAX_LENGTH) {
    fieldErrors.description = `Beskrivelsen kan være maks ${VIPPS_PRODUCT_DESCRIPTION_MAX_LENGTH} tegn (den vises i Vipps-appen).`;
  }
  const parsedFee = parseAnnualFee(values.annualFee);
  const fee = "fee" in parsedFee ? parsedFee.fee : Number.NaN;
  if ("error" in parsedFee) {
    fieldErrors.annualFee = parsedFee.error;
  }

  if (Object.keys(fieldErrors).length > 0) return { values, fieldErrors };
  return {
    values,
    fieldErrors,
    input: {
      name: values.name,
      description: values.description || null,
      annualFeeNok: fee,
    },
  };
}

/** Prefill values for a tier's edit form from its stored row. */
export function tierFormValues(tier: {
  name: string;
  description: string | null;
  annualFeeNok: number;
}): TierFormValues {
  return {
    name: tier.name,
    description: tier.description ?? "",
    annualFee: String(tier.annualFeeNok),
  };
}
