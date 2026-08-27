import { memberSelfServicePath, periodLabel } from "@stottemedlem/core";
import {
  agreementsChargedForPeriod,
  type Db,
  listMemberFeeStandings,
  type MemberFeeStanding,
  type Organization,
  owesFeeChangeNotice,
  recordMemberNotice,
} from "@stottemedlem/db";
import { type EmailMessage, type EmailSender, feeChangeNotice } from "@stottemedlem/email";
import { periods } from "./periods";

// Telling members what they will be charged, before they are charged it
// (specs/concepts/member-notice.md, specs/use-cases/change-the-annual-fee.md).
//
// Like every other job here this works by comparison, not by memory: it asks
// who is on a price they have not been told about, rather than remembering
// that a fee changed. So it is safe to run on every fee change AND every
// night — the second run has nothing left to do, and anything that failed the
// first time is simply still owed.

export interface NoticeReport {
  /** Members told, and recorded as told. */
  told: number;
  /** Members owed a notice with no way to reach them. */
  unreachable: number;
  /** Members owed a notice the provider would not take today. */
  failed: number;
}

export function isNoteworthy(report: NoticeReport): boolean {
  return report.told > 0 || report.unreachable > 0 || report.failed > 0;
}

/**
 * Which members are on a price they have not heard about. Exported because the
 * back office shows this before and after a change: an organization is told
 * plainly who it will have to reach itself.
 */
export async function membersOwedFeeNotice(
  db: Db,
  orgId: string,
  today: Date = new Date(),
): Promise<MemberFeeStanding[]> {
  return (await listMemberFeeStandings(db, orgId, today, periods.feeNoticeDays)).filter(
    owesFeeChangeNotice,
  );
}

/**
 * Tell everyone who is owed a fee-change notice, and write down that they were
 * told. Only a message the provider accepted is recorded — a member we failed
 * to reach is still owed one, and being wrong in that direction would let us
 * charge them a price they never saw.
 */
export async function sendOwedFeeChangeNotices(
  db: Db,
  org: Organization,
  origin: string,
  sender: EmailSender,
  today: Date = new Date(),
): Promise<NoticeReport> {
  const report: NoticeReport = { told: 0, unreachable: 0, failed: 0 };
  const owed = await membersOwedFeeNotice(db, org.id, today);
  if (owed.length === 0) return report;

  // A renewal already booked cannot change price, so for those members the new
  // fee first applies the period after — and the notice must say so.
  const upcoming = periods.renewalPeriodKey(today);
  const arranged = await agreementsChargedForPeriod(db, org.id, upcoming);

  const messages: EmailMessage[] = [];
  const recipients: MemberFeeStanding[] = [];
  for (const standing of owed) {
    const { member, tier, agreement } = standing;
    if (!member.email || !agreement.manageToken) {
      report.unreachable++;
      continue;
    }
    messages.push(
      feeChangeNotice({
        orgName: org.name,
        orgContactEmail: org.contactEmail,
        memberName: member.name,
        memberEmail: member.email,
        tierName: tier.name,
        previousFeeNok: standing.knownFeeNok,
        newFeeNok: tier.annualFeeNok,
        effectivePeriod: periodLabel(
          arranged.has(agreement.id) ? periods.nextPeriodKey(upcoming) : upcoming,
        ),
        manageUrl: `${origin}${memberSelfServicePath(org.slug, agreement.manageToken)}`,
      }),
    );
    recipients.push(standing);
  }
  if (messages.length === 0) return report;

  const results = await sender.send(messages);
  for (const [index, standing] of recipients.entries()) {
    if (!results[index]?.sent) {
      report.failed++;
      continue;
    }
    await recordMemberNotice(db, {
      orgId: org.id,
      memberId: standing.member.id,
      agreementId: standing.agreement.id,
      kind: "fee-change",
      tierId: standing.tier.id,
      feeNok: standing.tier.annualFeeNok,
      previousFeeNok: standing.knownFeeNok,
    });
    report.told++;
  }
  return report;
}
