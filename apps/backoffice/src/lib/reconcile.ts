import {
  type AgreementToReconcile,
  countAbandonedDrafts,
  type Db,
  listChargesForAgreement,
  markAgreementReconciled,
  selectAgreementsToReconcile,
} from "@stottemedlem/db";
import type { Charge, ChargeStatus, VippsClient } from "@stottemedlem/vipps";
import { logger } from "./log";
import { applyCharge, syncAgreement } from "./membership";
import { periods } from "./periods";

// Reconciliation (specs/concepts/payment-reconciliation.md): the nightly pass
// that reads memberships back from Vipps instead of waiting to be told about
// them. Payment events are delivered at-least-once, which is not the same as
// always: a delivery can be lost outright — a receiver that was down, an
// address that no longer exists — and the money itself never notices. Without
// this pass, the member list is only as correct as the network was.
//
// It works by comparison, never by memory: for each agreement it visits, it
// asks Vipps what the agreement is and what has been paid against it, and
// makes our record say the same. That makes it safe to run every night, safe
// to run twice, and safe to have skipped.

/**
 * How far back an unresolved payment is worth chasing, and how long an
 * unapproved draft is still worth asking about. Real days, from the period
 * scheme: the accelerated staging calendar shortens both with everything else.
 */
const CHARGE_LOOKBACK_DAYS = periods.chargeLookbackDays;
const DRAFT_LOOKBACK_DAYS = periods.draftLookbackDays;
/**
 * Agreements visited per organization per run. The sweep is bounded so a night
 * costs a predictable amount however large the organization grows; agreements
 * are visited oldest-check-first, so a member never stops coming round.
 */
const AGREEMENTS_PER_RUN = 250;

/**
 * Statuses in which a charge can still take money, or already has. A cancelled
 * or definitively failed charge can double-bill nobody and is not a duplicate.
 */
const CAN_TAKE_MONEY: ReadonlySet<ChargeStatus> = new Set([
  "PENDING",
  "DUE",
  "RESERVED",
  "PROCESSING",
  "CHARGED",
  "PARTIALLY_CAPTURED",
  "PARTIALLY_REFUNDED",
]);

export interface ReconcileReport {
  /** Agreements read back from Vipps. */
  visited: number;
  /** Agreements whose status differed from ours and now matches. */
  agreementsCorrected: number;
  /** Payments whose state differed from ours, or that we had never recorded. */
  chargesCorrected: number;
  /** Payments Vipps knew about and we did not — the ones nothing would find. */
  chargesUnknown: number;
  /**
   * Periods with more than one renewal charge that can take money. One year,
   * one renewal — a second live charge for the same period is the double
   * charge the product promises never to make, so it is shouted about, never
   * absorbed quietly into the books.
   */
  duplicateRenewals: number;
  /** Agreements that could not be read; tomorrow's run tries again. */
  failed: number;
  /** Drafts too old to keep asking about, reported rather than dropped quietly. */
  abandonedDrafts: number;
}

const emptyReport = (): ReconcileReport => ({
  visited: 0,
  agreementsCorrected: 0,
  chargesCorrected: 0,
  chargesUnknown: 0,
  duplicateRenewals: 0,
  failed: 0,
  abandonedDrafts: 0,
});

// The alarm below alerts the operator directly (stable message, ids in
// context — specs/concepts/operational-alerting.md); the per-agreement
// console lines elsewhere stay detail under the nightly job's own reporting.
const log = logger("reconcile");

/**
 * Say so, loudly, when one period holds two renewal charges that can both
 * take money. Reconciliation only reads — the discrepancy is for a person to
 * resolve — but a double charge must never look like ordinary bookkeeping.
 */
function reportDuplicateRenewals(
  vippsAgreementId: string,
  remoteCharges: Charge[],
  report: ReconcileReport,
): void {
  const byPeriod = new Map<number, Charge[]>();
  for (const charge of remoteCharges) {
    if (charge.type !== "RECURRING" || !CAN_TAKE_MONEY.has(charge.status)) continue;
    const periodYear = periods.periodFor(new Date(charge.due)).year;
    byPeriod.set(periodYear, [...(byPeriod.get(periodYear) ?? []), charge]);
  }
  for (const [periodYear, charges] of byPeriod) {
    if (charges.length < 2) continue;
    report.duplicateRenewals++;
    log.error("more than one renewal charge can take money for the same period", undefined, {
      vippsAgreementId,
      periodYear,
      charges: charges.map((charge) => `${charge.id} ${charge.status}`),
    });
  }
}

/**
 * Re-read one agreement and everything paid against it, and correct our record
 * where it disagrees. Returns what changed, so the run can report whether it
 * found anything rather than only that it happened.
 */
async function reconcileAgreement(
  db: Db,
  vipps: VippsClient,
  { agreement }: AgreementToReconcile,
  report: ReconcileReport,
): Promise<void> {
  const before = agreement.status;
  const { local } = await syncAgreement(db, vipps, agreement.vippsAgreementId);
  if (local && local.status !== before) report.agreementsCorrected++;

  // Vipps' own list, not ours: this is the only step that can find a payment
  // we have no row for at all — a charge created against Vipps whose response
  // never made it back to us.
  const remoteCharges = await vipps.listCharges(agreement.vippsAgreementId);
  reportDuplicateRenewals(agreement.vippsAgreementId, remoteCharges, report);
  const known = new Map(
    (await listChargesForAgreement(db, agreement.id)).map((row) => [row.vippsChargeId, row]),
  );

  for (const charge of remoteCharges) {
    const recorded = known.get(charge.id);
    if (recorded) {
      // Captured money is only fully accounted for once the membership it
      // bought exists; anything else is accounted for by its status alone.
      const settled = charge.status !== "CHARGED" || Boolean(recorded.membershipId);
      if (recorded.status === charge.status && settled) continue;
      if (recorded.status !== charge.status) report.chargesCorrected++;
    } else {
      report.chargesUnknown++;
    }
    await applyCharge(db, vipps, agreement.vippsAgreementId, charge);
  }

  await markAgreementReconciled(db, agreement.id);
  report.visited++;
}

/**
 * Bring one organization's memberships in line with what the payment provider
 * actually holds. One agreement's failure never stops the rest — the sweep is
 * a series of independent comparisons, and tonight's misses are tomorrow's
 * first candidates.
 */
export async function reconcileOrganization(
  db: Db,
  vipps: VippsClient,
  orgId: string,
  today: Date = new Date(),
): Promise<ReconcileReport> {
  const report = emptyReport();

  const candidates = await selectAgreementsToReconcile(db, orgId, {
    chargeLookbackDays: CHARGE_LOOKBACK_DAYS,
    draftLookbackDays: DRAFT_LOOKBACK_DAYS,
    limit: AGREEMENTS_PER_RUN,
    today,
  });

  for (const candidate of candidates) {
    try {
      await reconcileAgreement(db, vipps, candidate, report);
    } catch (error) {
      console.error(`could not reconcile ${candidate.agreement.vippsAgreementId}`, error);
      report.failed++;
    }
  }

  report.abandonedDrafts = await countAbandonedDrafts(db, orgId, {
    today,
    draftLookbackDays: DRAFT_LOOKBACK_DAYS,
  });

  return report;
}

/** Whether a run found anything worth a line in the log. */
export function isNoteworthy(report: ReconcileReport): boolean {
  return (
    report.agreementsCorrected > 0 ||
    report.chargesCorrected > 0 ||
    report.chargesUnknown > 0 ||
    report.duplicateRenewals > 0 ||
    report.failed > 0
  );
}
