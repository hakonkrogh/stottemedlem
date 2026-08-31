import type { EmailMessage } from "./types.js";

/** Punycode: a raw ø in a URL breaks in too many mail clients. */
const BRAND_URL = "https://xn--stttemedlem-hgb.no";
const BRAND_NAME = "støttemedlem.no";

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
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Norwegian thousands separator, so "1 200 kr" rather than "1200 kr". */
const kr = (nok: number) => `${nok.toLocaleString("nb-NO").replace(/ /g, " ")} kr`;

/** "2026-03-14" (or a full timestamp) as people read it: "14. mars 2026". */
const dato = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Oslo",
  });

/**
 * The receipt for one captured membership payment
 * (specs/concepts/payment-receipt.md) — sent on joining and on every renewal,
 * and never something a member can decline: it documents money already taken.
 *
 * The lines are the ones bokføringsforskriften § 5-1-6b requires of payment
 * documentation for membership fees (the information in § 5-1-1 nr. 2–5):
 * both parties, what the payment was for, the period it covers, and the
 * amount with its payment date. Membership fees in ideal organizations are
 * exempt from VAT (merverdiavgiftsloven § 3-13), and the receipt says so —
 * in plain words. The member never sees a statute cited: the receipt adheres
 * to the law without referring to it (specs/concepts/payment-receipt.md).
 */
export function membershipReceipt(receipt: MembershipReceipt): EmailMessage {
  const { orgName, orgNumber, memberName, tierName, periodText, paidNok, manageUrl } = receipt;

  const greeting = memberName?.trim() ? `Hei ${memberName.trim()},` : "Hei,";
  const contactNote = receipt.orgContactEmail
    ? `E-posten er sendt fra en adresse som ikke leses. Har du spørsmål, kontakt ${orgName} på ${receipt.orgContactEmail}.`
    : `E-posten er sendt fra en adresse som ikke leses. Har du spørsmål, ta kontakt med ${orgName} direkte.`;
  const lead =
    receipt.kind === "join"
      ? `Takk for støtten! Du er nå støttemedlem i ${orgName}. Dette er kvitteringen din — ta vare på den.`
      : `Støttemedlemskapet ditt i ${orgName} er fornyet. Dette er kvitteringen din — ta vare på den.`;

  const rows: Array<[string, string]> = [
    ["Organisasjon", orgNumber ? `${orgName} (org.nr. ${orgNumber})` : orgName],
    ["Medlem", memberName?.trim() || receipt.memberEmail],
    ["Gjelder", `Medlemskontingent — «${tierName}»`],
    ["Periode", `${dato(receipt.periodStart)} – ${dato(receipt.periodEnd)} (${periodText})`],
    ["Betalt", `${kr(paidNok)} den ${dato(receipt.paidDate)}, via Vipps`],
    ["Merverdiavgift", "0 kr — medlemskontingent er unntatt mva"],
  ];

  const lines = [
    greeting,
    "",
    lead,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "Medlemskapet fornyes automatisk. Vil du ikke fortsette, kan du stoppe det her:",
    manageUrl,
    "",
    `Hilsen ${orgName}`,
    "",
    "—",
    `Sendt via ❤️ ${BRAND_NAME} på vegne av ${orgName}. Dette er kvitteringen for en`,
    "gjennomført betaling og sendes ved hver betaling — den kan ikke avmeldes.",
    contactNote,
  ];

  const org = escapeHtml(orgName);
  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:0.2rem 1rem 0.2rem 0;color:#6b5d4d;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>` +
        `<td style="padding:0.2rem 0">${escapeHtml(value)}</td></tr>`,
    )
    .join("\n");
  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:#2b2118;max-width:34rem">
<p>${escapeHtml(greeting)}</p>
<p>${escapeHtml(lead)}</p>
<table style="border-collapse:collapse;font-size:15px">
${htmlRows}
</table>
<p>Medlemskapet fornyes automatisk. Vil du ikke fortsette, kan du
<a href="${escapeHtml(manageUrl)}">stoppe det her</a>.</p>
<p>Hilsen ${org}</p>
<hr style="border:0;border-top:1px solid #e6ddd1;margin:2rem 0 1rem">
<p style="font-size:13px;color:#6b5d4d">Sendt via <a href="${BRAND_URL}" style="color:#6b5d4d">❤️ ${BRAND_NAME}</a>
på vegne av ${org}. Dette er kvitteringen for en gjennomført betaling og sendes ved hver betaling
— den kan ikke avmeldes. ${escapeHtml(contactNote)}</p>
</div>`;

  return {
    to: receipt.memberEmail,
    fromName: orgName,
    replyTo: receipt.orgContactEmail ?? undefined,
    subject:
      receipt.kind === "join"
        ? `Kvittering: støttemedlemskap i ${orgName} — ${kr(paidNok)}`
        : `Kvittering: fornyet støttemedlemskap i ${orgName} — ${kr(paidNok)}`,
    text: lines.join("\n"),
    html,
  };
}
