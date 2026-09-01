import { env } from "cloudflare:workers";
import { formatOrganisasjonsnummer, memberSelfServicePath, periodLabel } from "@stottemedlem/core";
import {
  type CaptureOwedReceipt,
  type Db,
  listCapturesOwedReceipt,
  type Organization,
  recordMemberNotice,
} from "@stottemedlem/db";
import { type EmailMessage, type EmailSender, membershipReceipt } from "@stottemedlem/email";
import { storedCardPng } from "./cardImage";
import { loadMemberCardForMemberId, memberCardUrl, renderMemberCardSvg } from "./memberCard";

// The receipt for every captured payment (specs/concepts/payment-receipt.md).
//
// Like the fee notices this works by comparison, not by memory: a capture owes
// a receipt until a `receipt` notice points at its charge, so the sweep can run
// from anywhere and a send that failed is simply still owed. The unique index
// on the charge makes a double send impossible even if two of them race.
//
// WHERE it runs is deliberate. Sending means drawing member cards, and a
// drawing costs a Worker an order of magnitude more than an ordinary request
// does — enough that a handful of them ends the request outright, which on
// staging cost a supporter their receipt page and made Vipps retry a delivery
// nobody could answer (2026-08-31). So the paths that NOTICE a capture — the
// receipt page and the webhook receiver — only ask for the sweep
// (`requestReceiptSweep`), and it happens on the queue and in the nightly run,
// where taking a while is free and a failure is retried for us.

/**
 * How far back a capture is chased. A receipt is worth sending promptly or not
 * at all: past this window the sweep lets go, which is also what keeps the
 * feature's first deploy from showering members with receipts for
 * long-settled payments.
 */
export const RECEIPT_LOOKBACK_DAYS = 14;

/**
 * How many receipts one run may send.
 *
 * Each one draws a member's card, and a run that lets that work grow without
 * limit is a run that eventually exceeds what a Worker may spend and sends
 * NOTHING — the failure that made this a queue in the first place. A capped
 * run always finishes, always makes progress, and hands the rest to the next
 * one, which is exactly what "still owed" already means.
 */
export const MAX_RECEIPTS_PER_RUN = 5;

export interface ReceiptReport {
  /** Receipts sent, and recorded as sent. */
  sent: number;
  /** Captures owed a receipt with no address to send it to. */
  unreachable: number;
  /** Captures whose receipt the provider would not take today. */
  failed: number;
  /** Captures this run left for the next one, having reached its cap. */
  remaining: number;
}

export function isNoteworthy(report: ReceiptReport): boolean {
  return report.sent > 0 || report.unreachable > 0 || report.failed > 0;
}

/** Whether the run stopped at its cap with work still owed and progress made. */
export function hasMoreToSend(report: ReceiptReport): boolean {
  return report.remaining > 0 && report.sent > 0;
}

/** Bytes as base64, in chunks so a whole image never blows the argument limit. */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

/**
 * Send the receipt for every recent capture that still owes one, and write
 * down each send that the provider accepted. A member without an address gets
 * no email — the receipt page carries the same content for them — and is
 * counted rather than hidden (specs/concepts/member-notice.md).
 */
export async function sendOwedReceipts(
  db: Db,
  org: Organization,
  origin: string,
  sender: EmailSender,
  today: Date = new Date(),
): Promise<ReceiptReport> {
  const report: ReceiptReport = { sent: 0, unreachable: 0, failed: 0, remaining: 0 };
  const since = new Date(today.getTime() - RECEIPT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const owed = await listCapturesOwedReceipt(db, org.id, since);
  if (owed.length === 0) return report;

  const messages: EmailMessage[] = [];
  const recipients: CaptureOwedReceipt[] = [];
  for (const capture of owed) {
    // Oldest first (the query orders by capture time), so the receipt that has
    // been owed longest is never the one left behind.
    if (messages.length >= MAX_RECEIPTS_PER_RUN) {
      report.remaining = owed.length - messages.length - report.unreachable;
      break;
    }
    const { charge, membership, member, agreement } = capture;
    if (!member.email || !agreement.manageToken) {
      report.unreachable++;
      continue;
    }
    // The card leads the receipt (specs/concepts/member-card.md). It is
    // assembled from the member's history, so it is always current — and it
    // rides along as a picture too, for the mail clients that will not load
    // one. A card that cannot be drawn must never cost the member their
    // receipt: the message goes out without it.
    const card = await loadMemberCardForMemberId(db, member.id);
    const cardToken = card?.member.cardToken ?? null;
    let cardPngBase64: string | null = null;
    if (card && cardToken) {
      try {
        cardPngBase64 = toBase64(await storedCardPng(cardToken, await renderMemberCardSvg(card)));
      } catch {
        cardPngBase64 = null;
      }
    }

    messages.push(
      membershipReceipt({
        orgName: org.name,
        orgNumber: org.orgnr ? formatOrganisasjonsnummer(org.orgnr) : null,
        orgContactEmail: org.contactEmail,
        memberName: member.name,
        memberEmail: member.email,
        tierName: membership.tierName,
        periodText: periodLabel(membership.periodYear),
        periodStart: membership.periodStart,
        periodEnd: membership.periodEnd,
        paidNok: charge.amountNok,
        paidDate: charge.capturedAt ?? charge.updatedAt,
        kind: charge.type === "RECURRING" ? "renewal" : "join",
        manageUrl: `${origin}${memberSelfServicePath(org.slug, agreement.manageToken)}`,
        hearts: card?.hearts ?? 0,
        recruits: card?.recruits ?? 0,
        cardUrl: cardToken ? memberCardUrl(cardToken) : `${origin}/bli-medlem/${org.slug}`,
        cardPngBase64,
      }),
    );
    recipients.push(capture);
  }
  if (messages.length === 0) return report;

  const results = await sender.send(messages);
  for (const [index, capture] of recipients.entries()) {
    if (!results[index]?.sent) {
      report.failed++;
      continue;
    }
    await recordMemberNotice(db, {
      orgId: org.id,
      memberId: capture.member.id,
      agreementId: capture.agreement.id,
      kind: "receipt",
      tierId: capture.membership.tierId,
      feeNok: capture.charge.amountNok,
      chargeId: capture.charge.id,
    });
    report.sent++;
  }
  return report;
}

// ── Asking for the sweep ────────────────────────────────────────────────────

/** The queue's request for one organization's owed receipts to be sent. */
export interface ReceiptSweepMessage {
  kind: "receipts";
  /** Whose receipts. */
  orgSlug: string;
  /**
   * The public origin the member's own links must point at, taken from the
   * request that noticed the capture — a preview deployment or a local tunnel
   * has no other way to know its outside address.
   */
  origin: string;
}

export function isReceiptSweepMessage(body: unknown): body is ReceiptSweepMessage {
  if (typeof body !== "object" || body === null) return false;
  const message = body as Partial<ReceiptSweepMessage>;
  return (
    message.kind === "receipts" &&
    typeof message.orgSlug === "string" &&
    typeof message.origin === "string"
  );
}

/**
 * Hand the sweep to the queue and return — what a request does instead of
 * sending receipts itself.
 *
 * Never throws: a receipt is owed until it is sent, so the nightly run is
 * already the backstop for a queue that would not take the message. Losing the
 * prompt send is worth far less than losing the page the supporter is waiting
 * for.
 */
export async function requestReceiptSweep(orgSlug: string, origin: string): Promise<void> {
  try {
    await env.VIPPS_EVENTS.send({
      kind: "receipts",
      orgSlug,
      origin,
    } satisfies ReceiptSweepMessage);
  } catch {
    // The nightly sweep will find the same capture still owed.
  }
}
