import { isRenewalWindow, renewalPeriodYear, stableUuid } from "@stottemedlem/core";
import {
  type Db,
  findChargeForPeriod,
  listActiveAgreementsWithTier,
  recordCharge,
  updateAgreementFee,
} from "@stottemedlem/db";
import type { VippsClient } from "@stottemedlem/vipps";

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
 * The amount is the tier's fee as it stands now, so a fee change that arrived
 * before this runs is what the member pays; one that arrives after finds the
 * charge already made and waits for the following year.
 */
export async function createDueRenewalCharges(
  db: Db,
  vipps: VippsClient,
  orgId: string,
  today: Date = new Date(),
): Promise<{ created: number; failed: number }> {
  let created = 0;
  let failed = 0;
  if (!isRenewalWindow(today)) return { created, failed };

  const periodYear = renewalPeriodYear(today);
  const due = `${periodYear}-01-01`;

  for (const { agreement, tier } of await listActiveAgreementsWithTier(db, orgId)) {
    // Already arranged — the guard that makes running this nightly harmless.
    if (await findChargeForPeriod(db, agreement.id, periodYear)) continue;
    try {
      const { chargeId } = await vipps.createCharge(
        agreement.vippsAgreementId,
        {
          amount: toOre(tier.annualFeeNok),
          description: `${tier.name} ${periodYear}`,
          due,
          // Vipps retries a failed charge daily for this many days. A yearly
          // membership can afford to be patient: a card that fails on 1 January
          // is far more likely to be a full wallet than a member leaving.
          retryDays: 7,
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
        amountNok: tier.annualFeeNok,
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
