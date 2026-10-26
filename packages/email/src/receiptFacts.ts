/**
 * The facts one receipt states, shared by every form the receipt takes: the
 * PDF that rides with the email, the email body when no PDF could be made,
 * and the lines the render skill prints (specs/concepts/payment-receipt.md).
 */
export interface MembershipReceipt {
  /** The selling party (bokføringsforskriften § 5-1-1 nr. 2). */
  orgName: string;
  /** Norwegian organisasjonsnummer, already formatted for reading. */
  orgNumber?: string | null;
  /**
   * The organization's public address. The receipt is sent from an unread
   * noreply address, so this is where the member is told to take questions —
   * and where a reply lands, when the organization has one.
   */
  orgContactEmail?: string | null;
  /** The buying party (§ 5-1-1 nr. 2). */
  memberName?: string | null;
  memberEmail: string;
  tierName: string;
  /** The annual period the payment bought, as people read it — "2026". */
  periodText: string;
  /** The period's first and last day, ISO dates (§ 5-1-1 nr. 4). */
  periodStart: string;
  periodEnd: string;
  /** What was actually paid (§ 5-1-1 nr. 5) — pro-rated on a mid-year join. */
  paidNok: number;
  /** When the payment was captured, ISO date or datetime. */
  paidDate: string;
  /** A first payment reads differently from a renewal. */
  kind: "join" | "renewal";
  /** The member's own page — where the automatic renewal can be stopped. */
  manageUrl: string;
  /**
   * The receipt page on the web: the same receipt, where the member can
   * always look at it again. Addressed to the member alone, like `manageUrl`.
   */
  receiptUrl: string;
  /**
   * The public address of the member's card
   * (specs/concepts/member-card.md), offered before the paperwork so the
   * member can look at the card and share it.
   */
  cardUrl: string;
  /** The card rendered as a PNG, base64-encoded, when one could be made. */
  cardPngBase64?: string | null;
  /**
   * The receipt as a PDF, base64-encoded, when one could be made
   * (`membershipReceiptPdf`). Without it the email body carries the facts
   * itself, so the member is never sent a receipt that says nothing.
   */
  receiptPdfBase64?: string | null;
}

/** Norwegian thousands separator, so "1 200 kr" rather than "1200 kr". */
export const kr = (nok: number) => `${nok.toLocaleString("nb-NO").replace(/ /g, " ")} kr`;

/** "2026-03-14" (or a full timestamp) as people read it: "14. mars 2026". */
export const dato = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Oslo",
  });

/**
 * The lines bokføringsforskriften § 5-1-6b requires of payment documentation
 * for membership fees (the information in § 5-1-1 nr. 2–5): both parties,
 * what the payment was for, the period it covers, and the amount with its
 * payment date. Membership fees in ideal organizations are exempt from VAT
 * (merverdiavgiftsloven § 3-13), and the receipt says so — in plain words.
 * The member never sees a statute cited: the receipt adheres to the law
 * without referring to it (specs/concepts/payment-receipt.md).
 */
export function receiptRows(receipt: MembershipReceipt): Array<[string, string]> {
  const { orgName, orgNumber, memberName } = receipt;
  return [
    ["Organisasjon", orgNumber ? `${orgName} (org.nr. ${orgNumber})` : orgName],
    ["Medlem", memberName?.trim() || receipt.memberEmail],
    ["Gjelder", `Medlemskontingent («${receipt.tierName}»)`],
    [
      "Periode",
      `${dato(receipt.periodStart)} – ${dato(receipt.periodEnd)} (${receipt.periodText})`,
    ],
    ["Betalt", `${kr(receipt.paidNok)} den ${dato(receipt.paidDate)}, via Vipps`],
    ["Merverdiavgift", "0 kr (medlemskontingent er unntatt mva)"],
  ];
}
