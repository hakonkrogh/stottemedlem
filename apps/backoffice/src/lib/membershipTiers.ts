import {
  DEFAULT_MEMBERSHIP_TIER_NAME,
  MEMBERSHIP_TIER_DESCRIPTION_MAX_LENGTH,
  normalizeMembershipTierDescription,
  VIPPS_PRODUCT_NAME_MAX_LENGTH,
} from "@stottemedlem/core";
import type { MembershipTierInput } from "@stottemedlem/db";

// Parsing/validation for the membership-tier forms
// (specs/concepts/membership-tier.md). The NAME is capped at Vipps'
// productName limit because it is shown verbatim on the agreement in the
// Vipps app. The DESCRIPTION is the organization's own landing-page text —
// longer and multi-line — and `vippsProductDescription` derives the shorter
// single-line form when an agreement is created.

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
    description: normalizeMembershipTierDescription(String(form.get("description") ?? "")),
    annualFee: String(form.get("annualFee") ?? "").trim(),
  };
  const fieldErrors: TierFieldErrors = {};

  if (!values.name) {
    fieldErrors.name = "Gi medlemskapet et navn.";
  } else if (values.name.length > VIPPS_PRODUCT_NAME_MAX_LENGTH) {
    fieldErrors.name = `Navnet kan være maks ${VIPPS_PRODUCT_NAME_MAX_LENGTH} tegn (det vises i Vipps-appen).`;
  }
  if (values.description.length > MEMBERSHIP_TIER_DESCRIPTION_MAX_LENGTH) {
    fieldErrors.description = `Beskrivelsen kan være maks ${MEMBERSHIP_TIER_DESCRIPTION_MAX_LENGTH} tegn.`;
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

/**
 * Standard templates for common tiers (specs/concepts/membership-tier.md):
 * picking one prefills the add-form's name and description with standard
 * texts so the wording doesn't have to be invented. The price is always the
 * administrator's own — templates only carry a *suggested* amount, shown as
 * the fee field's placeholder, never as a value. Texts must stay within the
 * limits parseTierForm enforces.
 */
export interface MembershipTierTemplate {
  /** Selects the template via the medlemskap page's `?mal=<key>` link. */
  key: string;
  name: string;
  description: string;
  /** Suggested annual fee, shown as placeholder only. */
  suggestedFeeNok: number;
}

export const TIER_TEMPLATES: MembershipTierTemplate[] = [
  {
    key: "stottemedlem",
    name: DEFAULT_MEMBERSHIP_TIER_NAME,
    description:
      "Et fast årlig bidrag som går direkte til arbeidet vårt. Du står på medlemslisten år for år.",
    suggestedFeeNok: 300,
  },
  {
    key: "vip",
    name: "VIP-medlemskap",
    description:
      "For deg som vil gi litt ekstra: samme medlemskap, større bidrag og en ekstra stor takk fra oss.",
    suggestedFeeNok: 1000,
  },
];

export function getTierTemplate(key: string | null): MembershipTierTemplate | null {
  return TIER_TEMPLATES.find((t) => t.key === key) ?? null;
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
