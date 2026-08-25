import type { MemberContactDetails } from "@stottemedlem/db";

// Correcting how a member is recorded (specs/use-cases/curate-member-list.md).
// Every field is optional: the details come from the supporter's payment
// profile, and the product would rather list someone with a missing phone
// number than refuse to list them at all. An administrator may clear a field
// for the same reason — a wrong address is worse than none.

export interface MemberContactFormValues {
  name: string;
  email: string;
  phone: string;
}

export type MemberContactFieldErrors = Partial<Record<keyof MemberContactFormValues, string>>;

export interface ParsedMemberContactForm {
  values: MemberContactFormValues;
  fieldErrors: MemberContactFieldErrors;
  /** Present only when everything supplied was valid. */
  details?: MemberContactDetails;
}

const blankToNull = (value: string) => (value === "" ? null : value);

export function parseMemberContactForm(form: FormData): ParsedMemberContactForm {
  const values: MemberContactFormValues = {
    name: String(form.get("name") ?? "").trim(),
    email: String(form.get("email") ?? "").trim(),
    phone: String(form.get("phone") ?? "").trim(),
  };
  const fieldErrors: MemberContactFieldErrors = {};

  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    fieldErrors.email = "Oppgi en gyldig e-postadresse, eller la feltet stå tomt.";
  }
  if (values.phone && !/^[+\d][\d\s]{6,19}$/.test(values.phone)) {
    fieldErrors.phone = "Oppgi et gyldig telefonnummer, eller la feltet stå tomt.";
  }

  if (Object.keys(fieldErrors).length > 0) return { values, fieldErrors };
  return {
    values,
    fieldErrors,
    details: {
      name: blankToNull(values.name),
      email: blankToNull(values.email),
      phone: blankToNull(values.phone.replaceAll(" ", "")),
    },
  };
}

/** Prefill the correction form from what is currently recorded. */
export function memberContactFormValues(member: {
  name: string | null;
  email: string | null;
  phone: string | null;
}): MemberContactFormValues {
  return { name: member.name ?? "", email: member.email ?? "", phone: member.phone ?? "" };
}
