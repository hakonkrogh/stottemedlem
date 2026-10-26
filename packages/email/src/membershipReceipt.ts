import { type MembershipReceipt, receiptRows } from "./receiptFacts.js";
import type { EmailAttachment, EmailMessage } from "./types.js";

export type { MembershipReceipt } from "./receiptFacts.js";

/** Punycode: a raw ø in a URL breaks in too many mail clients. */
const BRAND_URL = "https://xn--stttemedlem-hgb.no";
const BRAND_NAME = "støttemedlem.no";

/** The inline part the HTML body shows: the attached card, by content id. */
const CARD_CONTENT_ID = "medlemsbevis";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The message for one captured membership payment
 * (specs/concepts/payment-receipt.md) — sent on joining and on every renewal,
 * and never something a member can decline: it documents money already taken.
 *
 * It reads as a thank-you, because that is what a payment to a marching band
 * or a choir deserves: the member's card is the first thing in it, shown in
 * the message and kept as a file, and the paperwork rides along as a PDF
 * with a link to the same receipt on the web. The facts the law asks of
 * payment documentation (`receiptRows`) stay in the PDF — and move into the
 * body only when no PDF could be made, so no member is ever sent a receipt
 * that says nothing.
 */
export function membershipReceipt(receipt: MembershipReceipt): EmailMessage {
  const { orgName, memberName, manageUrl } = receipt;
  const org = escapeHtml(orgName);

  const greeting = memberName?.trim() ? `Hei ${memberName.trim()},` : "Hei,";
  const contactNote = receipt.orgContactEmail
    ? `E-posten er sendt fra en adresse som ikke kan besvares. Har du spørsmål, kontakt ${orgName} på ${receipt.orgContactEmail}.`
    : `E-posten er sendt fra en adresse som ikke kan besvares. Har du spørsmål, ta kontakt med ${orgName} direkte.`;

  // The thank-you is the message. A renewal is somebody choosing the
  // organization again, and the lead says so before anything else.
  const lead =
    receipt.kind === "join"
      ? `Tusen takk for støtten! Du er nå støttemedlem i ${orgName}. ❤️`
      : `Tusen takk for at du støtter ${orgName} enda et år! Du er fantastisk. ❤️`;

  // The card comes before the paperwork (specs/concepts/member-card.md). It is
  // the attached picture itself the HTML body shows, never a likeness drawn in
  // text; the plain-text body can only say the card is attached and link it.
  const hasCard = Boolean(receipt.cardPngBase64);
  const cardText = hasCard
    ? "Medlemsbeviset ditt ligger vedlagt. Du kan også se og dele det her:"
    : "Se og del medlemsbeviset ditt:";
  const cardHtml = hasCard
    ? `<p style="margin:1.5rem 0 0.5rem"><a href="${escapeHtml(receipt.cardUrl)}"><img src="cid:${CARD_CONTENT_ID}" alt="Medlemsbeviset ditt i ${org}" width="320" style="display:block;max-width:100%;height:auto;border:0"></a></p>
<p style="margin-top:0.5rem">Dette er medlemsbeviset ditt. Det ligger også vedlagt, og du kan <a href="${escapeHtml(receipt.cardUrl)}">se og dele det her</a>.</p>`
    : `<p><a href="${escapeHtml(receipt.cardUrl)}">Se og del medlemsbeviset ditt</a>.</p>`;

  // The paperwork. In the PDF when there is one; in the body when there is
  // not, so the facts the member is owed are never missing.
  const hasPdf = Boolean(receipt.receiptPdfBase64);
  const rows = receiptRows(receipt);
  const receiptText = hasPdf
    ? [
        "Kvitteringen for betalingen ligger vedlagt (kvittering.pdf). Du finner den også på nett:",
        receipt.receiptUrl,
      ]
    : [
        "Dette er kvitteringen din. Ta vare på den.",
        "",
        ...rows.map(([label, value]) => `${label}: ${value}`),
        "",
        "Du finner den også på nett:",
        receipt.receiptUrl,
      ];
  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:0.2rem 1rem 0.2rem 0;color:#6b5d4d;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>` +
        `<td style="padding:0.2rem 0">${escapeHtml(value)}</td></tr>`,
    )
    .join("\n");
  const receiptHtml = hasPdf
    ? `<p>Kvitteringen for betalingen ligger vedlagt som PDF. Du finner den også <a href="${escapeHtml(receipt.receiptUrl)}">på nett</a>.</p>`
    : `<p style="margin-bottom:0.3rem">Dette er kvitteringen din. Ta vare på den.</p>
<table style="border-collapse:collapse;font-size:15px">
${htmlRows}
</table>
<p>Du finner den også <a href="${escapeHtml(receipt.receiptUrl)}">på nett</a>.</p>`;

  const lines = [
    greeting,
    "",
    lead,
    "",
    cardText,
    receipt.cardUrl,
    "",
    ...receiptText,
    "",
    "Medlemskapet fornyes automatisk. Vil du ikke fortsette, kan du stoppe det her:",
    manageUrl,
    "",
    `Hilsen ${orgName}`,
    "",
    "---",
    `Sendt via ❤️ ${BRAND_NAME} på vegne av ${orgName}. Dette er kvitteringen for en`,
    "gjennomført betaling og sendes ved hver betaling. Den kan ikke avmeldes.",
    contactNote,
  ];

  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:#2b2118;max-width:34rem">
<p>${escapeHtml(greeting)}</p>
<p style="font-size:19px;line-height:1.45">${escapeHtml(lead)}</p>
${cardHtml}
${receiptHtml}
<p>Medlemskapet fornyes automatisk. Vil du ikke fortsette, kan du
<a href="${escapeHtml(manageUrl)}">stoppe det her</a>.</p>
<p>Hilsen ${org}</p>
<hr style="border:0;border-top:1px solid #e6ddd1;margin:2rem 0 1rem">
<p style="font-size:13px;color:#6b5d4d">Sendt via <a href="${BRAND_URL}" style="color:#6b5d4d">❤️ ${BRAND_NAME}</a>
på vegne av ${org}. Dette er kvitteringen for en gjennomført betaling og sendes ved hver betaling.
Den kan ikke avmeldes. ${escapeHtml(contactNote)}</p>
</div>`;

  // The card as a file, so the member keeps it even after the message is
  // filed away — and the same file is what the body shows. Then the receipt.
  const attachments: EmailAttachment[] = [];
  if (receipt.cardPngBase64) {
    attachments.push({
      filename: "medlemsbevis.png",
      contentBase64: receipt.cardPngBase64,
      contentType: "image/png",
      contentId: CARD_CONTENT_ID,
    });
  }
  if (receipt.receiptPdfBase64) {
    attachments.push({
      filename: "kvittering.pdf",
      contentBase64: receipt.receiptPdfBase64,
      contentType: "application/pdf",
    });
  }

  return {
    to: receipt.memberEmail,
    fromName: orgName,
    replyTo: receipt.orgContactEmail ?? undefined,
    ...(attachments.length > 0 ? { attachments } : {}),
    subject:
      receipt.kind === "join"
        ? `Velkommen som støttemedlem i ${orgName}`
        : `Takk for at du støtter ${orgName} enda et år`,
    text: lines.join("\n"),
    html,
  };
}
