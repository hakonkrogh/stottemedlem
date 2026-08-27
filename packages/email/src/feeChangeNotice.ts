import type { EmailMessage } from "./types.js";

/** Punycode: a raw ø in a URL breaks in too many mail clients. */
const BRAND_URL = "https://xn--stttemedlem-hgb.no";
const BRAND_NAME = "støttemedlem.no";

export interface FeeChangeNotice {
  orgName: string;
  /** The organization's public address, so a reply reaches them and not us. */
  orgContactEmail?: string | null;
  memberName?: string | null;
  memberEmail: string;
  tierName: string;
  previousFeeNok: number;
  newFeeNok: number;
  /**
   * The first annual period charged at the new fee, as people read it —
   * "2027", or "uke 36/2026" on the accelerated staging calendar
   * (periodLabel in @stottemedlem/core).
   */
  effectivePeriod: string;
  /** The member's own page — where they can stop, which is the point. */
  manageUrl: string;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Norwegian thousands separator, so "1 200 kr" rather than "1200 kr". */
const kr = (nok: number) => `${nok.toLocaleString("nb-NO").replace(/ /g, " ")} kr`;

/**
 * What a supporting member is told when their organization changes the price
 * (specs/use-cases/change-the-annual-fee.md).
 *
 * It says the old amount as well as the new one, because the payment app will
 * show them the new number regardless — what it cannot tell them is that
 * anything changed. And it ends with the way out: a notice a member can do
 * nothing about is a nuisance (specs/concepts/member-notice.md).
 */
export function feeChangeNotice(notice: FeeChangeNotice): EmailMessage {
  const { orgName, memberName, tierName, previousFeeNok, newFeeNok, effectivePeriod, manageUrl } =
    notice;

  const greeting = memberName?.trim() ? `Hei ${memberName.trim()},` : "Hei,";
  const direction = newFeeNok > previousFeeNok ? "øker" : "settes ned";

  const lines = [
    greeting,
    "",
    `Du er støttemedlem i ${orgName} med medlemskapet «${tierName}». Prisen ${direction}:`,
    `fra ${effectivePeriod} koster medlemskapet ${kr(newFeeNok)} i året. I dag betaler du ${kr(previousFeeNok)}.`,
    "",
    "Den nye prisen gjelder fra fornyelsen ved årsskiftet. Det du har betalt for i år står,",
    "og du blir ikke belastet noe ekstra nå.",
    "",
    "Vil du ikke fortsette, kan du stoppe medlemskapet her:",
    manageUrl,
    "",
    `Hilsen ${orgName}`,
    "",
    "—",
    `Sendt via ${BRAND_NAME} på vegne av ${orgName}. Du får denne meldingen fordi du`,
    "betaler for et medlemskap som endrer pris.",
  ];

  const org = escapeHtml(orgName);
  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:#2b2118;max-width:34rem">
<p>${escapeHtml(greeting)}</p>
<p>Du er støttemedlem i ${org} med medlemskapet «${escapeHtml(tierName)}». Prisen ${direction}:
fra <strong>${escapeHtml(effectivePeriod)}</strong> koster medlemskapet <strong>${kr(newFeeNok)}</strong> i året.
I dag betaler du ${kr(previousFeeNok)}.</p>
<p>Den nye prisen gjelder fra fornyelsen ved årsskiftet. Det du har betalt for i år står, og du
blir ikke belastet noe ekstra nå.</p>
<p>Vil du ikke fortsette, kan du <a href="${escapeHtml(manageUrl)}">stoppe medlemskapet her</a>.</p>
<p>Hilsen ${org}</p>
<hr style="border:0;border-top:1px solid #e6ddd1;margin:2rem 0 1rem">
<p style="font-size:13px;color:#6b5d4d">Sendt via <a href="${BRAND_URL}" style="color:#6b5d4d">${BRAND_NAME}</a>
på vegne av ${org}. Du får denne meldingen fordi du betaler for et medlemskap som endrer pris.</p>
</div>`;

  return {
    to: notice.memberEmail,
    fromName: orgName,
    replyTo: notice.orgContactEmail ?? undefined,
    subject: `${orgName}: støttemedlemskapet koster ${kr(newFeeNok)} fra ${effectivePeriod}`,
    text: lines.join("\n"),
    html,
  };
}
