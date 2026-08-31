import {
  anonymizeMember,
  type Db,
  MEMBER_IDENTITY_RETENTION_YEARS,
  selectMembersDueForErasure,
} from "@stottemedlem/db";

// The retention rule, running on its own (specs/concepts/member-data.md).
//
// A privacy notice that promises "we delete this after five years" is a
// promise the product has to keep without anybody remembering to. So the
// nightly run visits every organization and erases the members whose identity
// has outlived the payment history that justified keeping it — the same
// erasure a member can ask for themselves, just arriving by the calendar.
//
// Nothing here needs the payment provider: it only removes what we hold.

export interface RetentionReport {
  /** Members whose identity was erased on this run. */
  erased: number;
  /** Members that were due but could not be erased; they are due again tomorrow. */
  failed: number;
}

/** Worth a line in the log: a quiet night is most nights, and says nothing. */
export function isNoteworthy(report: RetentionReport): boolean {
  return report.erased > 0 || report.failed > 0;
}

/**
 * Erase every member of one organization whose identity is past its retention.
 * Idempotent — a member erased last night is not due tonight — and safe to
 * interrupt: each member is erased on their own, so a failure costs one
 * member's turn rather than the run.
 */
export async function eraseMembersPastRetention(
  db: Db,
  orgId: string,
  currentPeriodKey: number,
): Promise<RetentionReport> {
  const due = await selectMembersDueForErasure(db, orgId, currentPeriodKey);
  let erased = 0;
  let failed = 0;
  for (const memberId of due) {
    try {
      const outcome = await anonymizeMember(db, memberId);
      if (outcome?.erased) erased++;
      else failed++;
    } catch (error) {
      console.error("retention sweep could not erase member", error);
      failed++;
    }
  }
  return { erased, failed };
}

export { MEMBER_IDENTITY_RETENTION_YEARS };
