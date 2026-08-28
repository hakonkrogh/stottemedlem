import { formatOrganisasjonsnummer, memberSelfServicePath, periodLabel } from "@stottemedlem/core";
import {
  type CaptureOwedReceipt,
  type Db,
  listCapturesOwedReceipt,
  type Organization,
  recordMemberNotice,
} from "@stottemedlem/db";
import { type EmailMessage, type EmailSender, membershipReceipt } from "@stottemedlem/email";

// The receipt for every captured payment (specs/concepts/payment-receipt.md).
//
// Like the fee notices this works by comparison, not by memory: a capture owes
// a receipt until a `receipt` notice points at its charge, so the same sweep
// runs from the receipt page, the webhook receiver, and the nightly cron —
// whoever gets there first sends it, and a send that failed is simply still
// owed. The unique index on the charge makes a double send impossible even if
// two of them race.

/**
 * How far back a capture is chased. A receipt is worth sending promptly or not
 * at all: past this window the sweep lets go, which is also what keeps the
 * feature's first deploy from showering members with receipts for
 * long-settled payments.
 */
export const RECEIPT_LOOKBACK_DAYS = 14;

export interface ReceiptReport {
  /** Receipts sent, and recorded as sent. */
  sent: number;
  /** Captures owed a receipt with no address to send it to. */
  unreachable: number;
  /** Captures whose receipt the provider would not take today. */
  failed: number;
}

export function isNoteworthy(report: ReceiptReport): boolean {
  return report.sent > 0 || report.unreachable > 0 || report.failed > 0;
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
  const report: ReceiptReport = { sent: 0, unreachable: 0, failed: 0 };
  const since = new Date(today.getTime() - RECEIPT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const owed = await listCapturesOwedReceipt(db, org.id, since);
  if (owed.length === 0) return report;

  const messages: EmailMessage[] = [];
  const recipients: CaptureOwedReceipt[] = [];
  for (const capture of owed) {
    const { charge, membership, member, agreement } = capture;
    if (!member.email || !agreement.manageToken) {
      report.unreachable++;
      continue;
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
