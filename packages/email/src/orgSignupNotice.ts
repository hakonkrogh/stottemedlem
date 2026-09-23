import type { EmailMessage } from "./types.js";

const BRAND_NAME = "støttemedlem.no";

export interface OrgSignupNotice {
  /** The product's own people: where the notice goes. */
  to: string;
  orgName: string;
  orgnr: string;
  slug: string;
  /** The organization's public join page, in the form a machine reads (punycode). */
  joinUrl: string;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * What the product's own people are told when an organization signs itself
 * up (specs/use-cases/sign-up-for-early-access.md). Nobody writes to us first
 * any more, so this is how we learn one has arrived and may want a hand.
 *
 * It names the organization and nothing about the person who created it: the
 * name and the organization number are public facts, a volunteer's own
 * address is not, and the operator can look the rest up where it is kept.
 */
export function orgSignupNotice(notice: OrgSignupNotice): EmailMessage {
  const { orgName, orgnr, slug, joinUrl } = notice;
  const lines = [
    `En ny organisasjon har meldt seg på: ${orgName}.`,
    "",
    `Organisasjonsnummer: ${orgnr}`,
    `Kortnavn: ${slug}`,
    `Innmeldingsside: ${joinUrl}`,
    "",
    "-- ",
    `Sendt av ${BRAND_NAME} fordi en ny organisasjon meldte seg på.`,
  ];
  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:#2b2118;max-width:34rem">
<p>En ny organisasjon har meldt seg på: <strong>${escapeHtml(orgName)}</strong>.</p>
<p>Organisasjonsnummer: ${escapeHtml(orgnr)}<br>
Kortnavn: ${escapeHtml(slug)}<br>
Innmeldingsside: <a href="${escapeHtml(joinUrl)}">${escapeHtml(joinUrl)}</a></p>
<p style="font-size:13px;color:#6b5d4d">Sendt av ${BRAND_NAME} fordi en ny organisasjon meldte seg på.</p>
</div>`;

  return {
    to: notice.to,
    fromName: BRAND_NAME,
    subject: `Ny organisasjon: ${orgName}`,
    text: lines.join("\n"),
    html,
  };
}
