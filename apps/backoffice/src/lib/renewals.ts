import { periodLabel, stableUuid } from "@stottemedlem/core";
import {
  type Db,
  findChargeForPeriod,
  listActiveAgreementsWithTier,
  listMemberFeeStandings,
  recordCharge,
  renewalFeeNok,
  updateAgreementFee,
} from "@stottemedlem/db";
import type { VippsClient } from "@stottemedlem/vipps";
import { periods } from "./periods";

// The two jobs that keep memberships running year after year without anyone
// touching them: moving members onto a changed fee
// (specs/use-cases/change-the-annual-fee.md) and creating each year's renewal
// payment (specs/use-cases/renew-annual-membership.md). Both are idempotent
// and safe to run every night, because both work by comparing what should be
// true with what is, rather than by remembering that they ran.

const toOre = (nok: number) => nok * 100;

/**
 * Move every member of a repriced tier onto its current fee, with the payment
 * provider — which is what the member sees in their app and what future
 * charges are measured against. A member already signed up at the right amount
 * is left alone, so this is cheap to run repeatedly.
 *
 * It does not touch a renewal that has already been arranged: a member who was
 * told what their next payment would be is charged that
 * (specs/use-cases/change-the-annual-fee.md).
 */
export async function repriceAgreements(
  db: Db,
  vipps: VippsClient,
  orgId: string,
): Promise<{ repriced: number; failed: number }> {
  let repriced = 0;
  let failed = 0;

  for (const { agreement, tier } of await listActiveAgreementsWithTier(db, orgId)) {
    if (agreement.annualFeeNok === tier.annualFeeNok) continue;
    try {
      await vipps.updateAgreement(
        agreement.vippsAgreementId,
        { pricing: { amount: toOre(tier.annualFeeNok) } },
        crypto.randomUUID(),
      );
      await updateAgreementFee(db, agreement.id, tier.annualFeeNok);
      repriced++;
    } catch (error) {
      // One member's failure must not stop the rest; tonight's run tries again.
      console.error(`could not reprice ${agreement.vippsAgreementId}`, error);
      failed++;
    }
  }

  return { repriced, failed };
}

/**
 * Arrange next year's payment for everyone still with us. Vipps charges
 * nothing on its own: every renewal exists because this job created it.
 *
 * The amount is not simply the tier's current fee. A member is charged what
 * they have been told they will be charged, and told long enough ago to have
 * done something about it (specs/use-cases/change-the-annual-fee.md) — so a
 * price rise announced last week finds its members still on last year's
 * amount, and reaches them a year later instead. A fee change arriving after
 * the charge is made finds it already there and waits, as before.
 */
export async function createDueRenewalCharges(
  db: Db,
  vipps: VippsClient,
  orgId: string,
  today: Date = new Date(),
): Promise<{ created: number; failed: number }> {
  let created = 0;
  let failed = 0;
  if (!periods.isRenewalWindow(today)) return { created, failed };

  const periodYear = periods.renewalPeriodKey(today);
  const due = periods.fullPeriod(periodYear).start;

  for (const standing of await listMemberFeeStandings(db, orgId, today, periods.feeNoticeDays)) {
    const { agreement, tier } = standing;
    // Already arranged — the guard that makes running this nightly harmless.
    if (await findChargeForPeriod(db, agreement.id, periodYear)) continue;
    // What this member may be charged, which is not always what the tier costs.
    const annualFeeNok = renewalFeeNok(standing);
    try {
      const { chargeId } = await vipps.createCharge(
        agreement.vippsAgreementId,
        {
          amount: toOre(annualFeeNok),
          description: `${tier.name} ${periodLabel(periodYear)}`,
          due,
          // Vipps retries a failed charge daily for this many days. A yearly
          // membership can afford to be patient: a card that fails on 1 January
          // is far more likely to be a full wallet than a member leaving. (The
          // accelerated staging calendar keeps it to one real day, or the
          // retries would outlive the period they pay for.)
          retryDays: periods.retryDays,
          transactionType: "DIRECT_CAPTURE",
          externalId: `${agreement.externalId}:${periodYear}`,
        },
        // Derived from the agreement and the period, not random: if this run
        // creates the charge and then fails to write it down, tomorrow's run
        // asks Vipps for the same charge instead of billing the member twice.
        await stableUuid(`renewal:${agreement.id}:${periodYear}`),
      );
      await recordCharge(db, agreement.vippsAgreementId, {
        vippsChargeId: chargeId,
        externalId: `${agreement.externalId}:${periodYear}`,
        periodYear,
        type: "RECURRING",
        status: "PENDING",
        amountNok: annualFeeNok,
        due,
      });
      created++;
    } catch (error) {
      console.error(`could not create renewal for ${agreement.vippsAgreementId}`, error);
      failed++;
    }
  }

  return { created, failed };
}
