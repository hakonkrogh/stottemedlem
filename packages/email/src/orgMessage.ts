import type { EmailMessage } from "./types.js";

/** Punycode: a raw ø in a URL breaks in too many mail clients. */
const BRAND_URL = "https://xn--stttemedlem-hgb.no";
const BRAND_NAME = "støttemedlem.no";

export interface OrgMessageEmail {
  orgName: string;
  /** The organization's public address, so a reply reaches them and not us. */
  orgContactEmail?: string | null;
  memberEmail: string;
  /** The subject exactly as the administrator wrote it. */
  subject: string;
  /** Plain text; a blank line separates paragraphs. */
  body: string;
  /** The one-click decline this message must carry (specs/concepts/org-message.md). */
  unsubscribeUrl: string;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The administrator's plain text, split into paragraphs on blank lines. Line
 * breaks *within* a paragraph are kept — an address or a signature written on
 * separate lines should stay on separate lines.
 */
export function bodyParagraphs(body: string): string[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * An organization's own message to a supporting member
 * (specs/concepts/org-message.md) — written by an administrator, carried by
 * us. The words are entirely theirs; what the product adds is the wrapper
 * every such message must have: who it is from, who carried it, and the
 * one-click way to decline the next one.
 */
export function orgMessage(input: OrgMessageEmail): EmailMessage {
  const { orgName, subject, body, unsubscribeUrl } = input;
  const paragraphs = bodyParagraphs(body);

  const text = [
    ...paragraphs.flatMap((paragraph) => [paragraph, ""]),
    "—",
    `Sendt via ${BRAND_NAME} på vegne av ${orgName}. Du får denne meldingen fordi du er`,
    `støttemedlem i ${orgName}.`,
    "Vil du ikke ha slike meldinger, kan du melde deg av her:",
    unsubscribeUrl,
  ];

  const org = escapeHtml(orgName);
  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:#2b2118;max-width:34rem">
${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("\n")}
<hr style="border:0;border-top:1px solid #e6ddd1;margin:2rem 0 1rem">
<p style="font-size:13px;color:#6b5d4d">Sendt via <a href="${BRAND_URL}" style="color:#6b5d4d">${BRAND_NAME}</a>
på vegne av ${org}. Du får denne meldingen fordi du er støttemedlem i ${org}.
<a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b5d4d">Meld deg av slike meldinger</a>.</p>
</div>`;

  return {
    to: input.memberEmail,
    fromName: orgName,
    replyTo: input.orgContactEmail ?? undefined,
    subject,
    text: text.join("\n"),
    html,
  };
}
