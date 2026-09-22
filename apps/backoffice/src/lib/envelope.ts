import { formatPhoneNumber, postalAddressLines } from "@stottemedlem/core";
import type { SupportingMember } from "@stottemedlem/db";

// What stands under each card on the printed sheets
// (specs/use-cases/print-member-cards.md): the member's postal address the way
// it goes on an envelope, and their phone number, for the person putting the
// card in one. Two lines at most, since the space under a card is the margin
// that is cut away.

/**
 * The lines under one card. Where the organization asks for addresses and the
 * member has none, the sheet says so in the same place, so the person stuffing
 * envelopes learns it there rather than from an empty spot.
 */
export function envelopeLines(
  member: Pick<SupportingMember, "streetAddress" | "postalCode" | "city" | "country" | "phone">,
  postalAddresses: boolean,
): string[] {
  const phone = member.phone ? formatPhoneNumber(member.phone) : null;
  const address = postalAddressLines(member);
  if (address.length === 0) {
    const missing = postalAddresses ? "Adresse mangler" : null;
    return [[missing, phone].filter(Boolean).join(" · ")].filter(Boolean);
  }
  // Street first, then postal code, place and country together, with the
  // phone number beside them: two lines, however much of the address there is.
  const [first, ...rest] = address;
  const second = [rest.join(", "), phone].filter(Boolean).join(" · ");
  return [first, second].filter((line): line is string => Boolean(line));
}
