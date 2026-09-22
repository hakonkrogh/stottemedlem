import type { MemberContactDetails, MemberPostalAddress } from "@stottemedlem/db";

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

// The member's postal address, typed by the member on their own page or by an
// administrator (specs/use-cases/collect-postal-addresses.md). Any part may
// be left out: a person types what they know, and a partial address is still
// more than none. Only a postal code that cannot be one is refused.

export interface MemberPostalAddressFormValues {
  streetAddress: string;
  postalCode: string;
  city: string;
  country: string;
}

export type MemberPostalAddressFieldErrors = Partial<
  Record<keyof MemberPostalAddressFormValues, string>
>;

export interface ParsedMemberPostalAddressForm {
  values: MemberPostalAddressFormValues;
  fieldErrors: MemberPostalAddressFieldErrors;
  /** Present only when everything supplied was valid. */
  address?: MemberPostalAddress;
}

export function parseMemberPostalAddressForm(form: FormData): ParsedMemberPostalAddressForm {
  const values: MemberPostalAddressFormValues = {
    streetAddress: String(form.get("streetAddress") ?? "").trim(),
    postalCode: String(form.get("postalCode") ?? "").trim(),
    city: String(form.get("city") ?? "").trim(),
    country: String(form.get("country") ?? "").trim(),
  };
  const fieldErrors: MemberPostalAddressFieldErrors = {};
  // A Norwegian postal code is four digits; abroad, anything short enough to
  // be one is let through, since the product cannot know every country's form.
  const norwegian = values.country === "" || /^(no|nor|norge|noreg|norway)$/i.test(values.country);
  if (values.postalCode && norwegian && !/^\d{4}$/.test(values.postalCode)) {
    fieldErrors.postalCode = "Et norsk postnummer har fire siffer.";
  } else if (values.postalCode && values.postalCode.length > 12) {
    fieldErrors.postalCode = "Oppgi et gyldig postnummer.";
  }
  if (Object.keys(fieldErrors).length > 0) return { values, fieldErrors };
  return {
    values,
    fieldErrors,
    address: {
      streetAddress: blankToNull(values.streetAddress),
      postalCode: blankToNull(values.postalCode),
      city: blankToNull(values.city),
      country: blankToNull(values.country),
    },
  };
}

/** Prefill the address form from what is currently recorded. */
export function memberPostalAddressFormValues(
  member: MemberPostalAddress,
): MemberPostalAddressFormValues {
  return {
    streetAddress: member.streetAddress ?? "",
    postalCode: member.postalCode ?? "",
    city: member.city ?? "",
    country: member.country ?? "",
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
