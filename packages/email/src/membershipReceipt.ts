import type { EmailAttachment, EmailMessage } from "./types.js";

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
  /**
   * The member's card (specs/concepts/member-card.md) — the part of this
   * message the member actually wants. One heart per supported year, the
   * address they may share, and optionally the card as a picture to keep.
   */
  hearts: number;
  recruits?: number;
  cardUrl: string;
  /** The card rendered as a PNG, base64-encoded, when one could be made. */
  cardPngBase64?: string | null;
}

/** Ten to a row, like everywhere else the hearts are drawn. */
const HEARTS_PER_ROW = 10;

function heartRows(count: number): string[] {
  const rows: string[] = [];
  for (let left = count; left > 0; left -= HEARTS_PER_ROW) {
    rows.push("❤️".repeat(Math.min(left, HEARTS_PER_ROW)));
  }
  return rows;
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

  // The card leads (specs/concepts/member-card.md): the receipt's bookkeeping
  // detail is what the law wants, but the card is what the member wants, so it
  // comes first and the paperwork follows it.
  const heartLine =
    receipt.hearts === 1 ? "1 år som støttemedlem" : `${receipt.hearts} år som støttemedlem`;
  const recruits = receipt.recruits ?? 0;
  const cardName = memberName?.trim() || receipt.memberEmail;
  const cardLines = [
    "— DITT MEDLEMSBEVIS —",
    `${cardName} — støttemedlem i ${orgName}`,
    `Gyldig ${periodText}`,
    ...heartRows(receipt.hearts),
    recruits > 0
      ? `${heartLine} · vervet ${recruits} ${recruits === 1 ? "medlem" : "medlemmer"}`
      : heartLine,
    "",
    "Se og del beviset:",
    receipt.cardUrl,
  ];

  const lines = [
    greeting,
    "",
    lead,
    "",
    ...cardLines,
    "",
    "Kvittering:",
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
  const heartsHtml = heartRows(receipt.hearts)
    .map((row) => `<div style="font-size:19px;line-height:1.45;letter-spacing:2px">${row}</div>`)
    .join("");
  // Table-wrapped and inline-styled, because that is the only layout every
  // mail client agrees on. The hearts are the emoji character here — an email
  // can render those, unlike the rasterized card.
  const cardHtml = `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;width:100%;margin:1.25rem 0">
<tr><td style="background:#ffffff;border:1px solid #e6dccb;border-radius:14px;padding:20px 22px">
<div style="font-size:11px;letter-spacing:2.5px;font-weight:700;color:#3d6b3f">STØTTEMEDLEM</div>
<div style="font-size:22px;font-weight:700;color:#2b2118;padding-top:6px">${escapeHtml(cardName)}</div>
<div style="font-size:15px;color:#6b5d4d;padding-top:2px">Gyldig ${escapeHtml(periodText)} · ${org}</div>
<div style="padding-top:10px">${heartsHtml}</div>
<div style="font-size:13px;color:#6b5d4d;padding-top:4px">${escapeHtml(
    recruits > 0
      ? `${heartLine} · vervet ${recruits} ${recruits === 1 ? "medlem" : "medlemmer"}`
      : heartLine,
  )}</div>
<div style="font-size:14px;padding-top:12px"><a href="${escapeHtml(receipt.cardUrl)}">Se og del medlemsbeviset ditt</a></div>
</td></tr></table>`;

  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:#2b2118;max-width:34rem">
<p>${escapeHtml(greeting)}</p>
<p>${escapeHtml(lead)}</p>
${cardHtml}
<p style="font-size:13px;color:#6b5d4d;margin-bottom:0.3rem">Kvittering</p>
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

  // The card as a file, so the member keeps it even if their mail client
  // never loads a picture and even after the message is filed away.
  const attachments: EmailAttachment[] = receipt.cardPngBase64
    ? [
        {
          filename: "medlemsbevis.png",
          contentBase64: receipt.cardPngBase64,
          contentType: "image/png",
        },
      ]
    : [];

  return {
    to: receipt.memberEmail,
    fromName: orgName,
    replyTo: receipt.orgContactEmail ?? undefined,
    ...(attachments.length > 0 ? { attachments } : {}),
    subject:
      receipt.kind === "join"
        ? `Kvittering: støttemedlemskap i ${orgName} — ${kr(paidNok)}`
        : `Kvittering: fornyet støttemedlemskap i ${orgName} — ${kr(paidNok)}`,
    text: lines.join("\n"),
    html,
  };
}
