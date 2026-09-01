import { env } from "cloudflare:workers";
import {
  memberSelfServicePath,
  periodLabel,
  redundantJoinAction,
  refundRefusal,
  stableUuid,
  tierAgreementExternalId,
  VIPPS_PRODUCT_NAME_MAX_LENGTH,
  vippsProductDescription,
} from "@stottemedlem/core";
import {
  activateAgreement,
  closeAgreement,
  type Db,
  findAgreementByVippsId,
  grantMembershipForCapturedCharge,
  hasOtherRunningAgreement,
  listUnappliedCaptures,
  type MembershipAgreement,
  type MembershipCharge,
  type MembershipTier,
  type Organization,
  recordCharge,
  recordDraftedAgreement,
  revokeMembershipForRefundedCharge,
} from "@stottemedlem/db";
import type { Agreement, Charge, ChargeStatus, VippsClient } from "@stottemedlem/vipps";
import { logger } from "./log";
import { periods } from "./periods";
import { RefundNotPossible } from "./refunds";

// Giving a redundant payment back is the product acting on the organization's
// money without being asked, so it says so where an operator can see it
// (specs/concepts/operational-alerting.md).
const log = logger("membership");

// Joining, and everything that happens afterwards (specs/use-cases/
// join-as-supporting-member.md). Both entry points — the webhook receiver and
// the receipt page's polling — run through the same functions here, because
// either may arrive first and neither may be trusted alone: a supporter
// returning from Vipps proves nothing, and webhook delivery is at-least-once.

/** Vipps speaks minor units; the product speaks whole kroner. */
const toOre = (nok: number) => nok * 100;
const fromOre = (ore: number) => Math.round(ore / 100);

/**
 * The public HTTPS origin Vipps must reach: where the supporter comes back to,
 * where they manage the membership, and where events are delivered. Taken from
 * the request the supporter actually arrived on, so a preview deployment or a
 * local tunnel works without configuration; `PUBLIC_ORIGIN` overrides it when
 * the outside address differs from the one the Worker sees.
 */
export function publicOrigin(request: Request): string {
  return (env.PUBLIC_ORIGIN || new URL(request.url).origin).replace(/\/+$/, "");
}

export interface JoinDraft {
  /** Where to send the supporter to approve in Vipps. */
  confirmationUrl: string;
  /** What they pay now: pro-rated for the rest of the calendar year, or 0. */
  paidNok: number;
}

/** The circumstances of one join, beyond who is being joined. */
export interface JoinOptions {
  /**
   * The member whose card was scanned to get here, when the join began that
   * way (specs/use-cases/earn-hearts-and-recruit.md). Held on the agreement
   * until Vipps says who is joining.
   */
  referredByMemberId?: string | null;
  /**
   * The supporter already holds the current period, so this arrangement asks
   * for nothing now and starts charging at the next renewal. Only ever true
   * where the supporter is known BEFORE the payment app is — resuming from
   * their own page (specs/concepts/member-self-service.md), never a join from
   * the public page, where nobody has a name yet.
   */
  periodAlreadyPaid?: boolean;
}

/**
 * Draft the agreement a supporting membership is: a yearly, fixed-price
 * arrangement at the tier's annual fee, with the first (pro-rated) period
 * charged on approval, asking for the profile data a member list needs.
 *
 * Nothing about membership is created here — only the intent to pay. The
 * membership follows from money actually arriving.
 *
 * The one exception is `periodAlreadyPaid`: an arrangement resumed inside a
 * period its supporter has already bought asks for nothing on approval and
 * begins charging at the next renewal, because there is nothing left to buy.
 */
export async function startJoin(
  db: Db,
  vipps: VippsClient,
  org: Organization,
  tier: MembershipTier,
  origin: string,
  { referredByMemberId = null, periodAlreadyPaid = false }: JoinOptions = {},
): Promise<JoinDraft> {
  const period = periods.periodFor();
  const paidNok = periodAlreadyPaid ? 0 : periods.proratedJoinFeeNok(tier.annualFeeNok, new Date());
  // Our own id for this arrangement, carried on the Vipps agreement so a
  // delivery we have never seen before can still be traced back.
  const externalId = tierAgreementExternalId(tier.key, crypto.randomUUID());
  // Minted before the agreement exists, because Vipps needs the management URL
  // in the draft itself.
  const manageToken = crypto.randomUUID();

  const draft = await vipps.draftAgreement(
    {
      // The agreement's price is the FULL annual fee — that is what renewals
      // cost and what the member sees in their app. Only this first charge is
      // reduced, because only part of the year remains.
      pricing: { type: "LEGACY", amount: toOre(tier.annualFeeNok), currency: "NOK" },
      // YEAR in production; the accelerated staging calendar signs members up
      // by the week, so its agreements must permit a charge every week.
      interval: periods.agreementInterval,
      // Vipps appends NOTHING to the redirect (verified 2026-08-27: a bare
      // URL bounced real supporters back to the join page), so the address
      // itself must say which arrangement the supporter returns from — the
      // manage token, minted just above, is already that reference.
      merchantRedirectUrl: `${origin}/bli-medlem/${org.slug}/kvittering?n=${encodeURIComponent(manageToken)}`,
      // The member's own page, reached from their Vipps app. The token is what
      // makes it theirs — see the manage_token column.
      merchantAgreementUrl: `${origin}${memberSelfServicePath(org.slug, manageToken)}`,
      productName: `${tier.name} — ${org.name}`.slice(0, VIPPS_PRODUCT_NAME_MAX_LENGTH),
      productDescription: vippsProductDescription(
        tier.description ?? `Årlig støttemedlemskap i ${org.name}.`,
      ),
      // No first charge when the period is already theirs: Vipps makes the
      // initial charge optional, so an arrangement can be set going again
      // without asking for money that would only have to be given back.
      ...(periodAlreadyPaid
        ? {}
        : {
            initialCharge: {
              amount: toOre(paidNok),
              description:
                paidNok === tier.annualFeeNok
                  ? `${tier.name} ${periodLabel(period.year)}`
                  : `${tier.name} — resten av ${periodLabel(period.year)}`,
              transactionType: "DIRECT_CAPTURE" as const,
            },
          }),
      // The minimum identity needed to list someone as a supporting member.
      scope: "name email phoneNumber",
      externalId,
    },
    // Vipps validates the Idempotency-Key as a UUID — our externalId (which
    // carries a colon) is rejected outright. It is a retry key, not a business
    // key: the externalId above is what ties the agreement to this product.
    crypto.randomUUID(),
  );

  await recordDraftedAgreement(db, {
    orgId: org.id,
    tierId: tier.id,
    vippsAgreementId: draft.agreementId,
    externalId,
    annualFeeNok: tier.annualFeeNok,
    manageToken,
    referredByMemberId,
  });

  // The first charge exists from this moment on Vipps' side, so record it now:
  // its capture event may arrive before the supporter is back on our page.
  if (draft.chargeId) {
    await recordCharge(db, draft.agreementId, {
      vippsChargeId: draft.chargeId,
      periodYear: period.year,
      type: "INITIAL",
      status: "PENDING",
      amountNok: paidNok,
      due: period.start,
    });
  }

  return { confirmationUrl: draft.vippsConfirmationUrl, paidNok };
}

/**
 * Bring our record of an agreement in line with what Vipps says about it, and
 * attach the person once they have consented. Safe to run repeatedly and from
 * either direction — the webhook and the receipt page both call it, and
 * whichever gets there first wins harmlessly.
 */
export async function syncAgreement(
  db: Db,
  vipps: VippsClient,
  vippsAgreementId: string,
): Promise<{ local: MembershipAgreement | null; remote: Agreement }> {
  const remote = await vipps.getAgreement(vippsAgreementId);
  let local = await findAgreementByVippsId(db, vippsAgreementId);

  if (remote.status === "ACTIVE" && local && !local.memberId && remote.sub) {
    // The consent window is 168 hours, so capture identity the first time we
    // can and never depend on being able to ask again.
    const profile = await vipps.getUserinfo(remote.sub).catch(() => null);
    const activated = await activateAgreement(db, vippsAgreementId, {
      vippsSub: remote.sub,
      name: profile?.name ?? null,
      email: profile?.email ?? null,
      phone: profile?.phone_number ?? null,
    });
    local = activated?.agreement ?? local;
  }

  if (
    (remote.status === "STOPPED" || remote.status === "EXPIRED") &&
    local?.status !== remote.status
  ) {
    local = (await closeAgreement(db, vippsAgreementId, remote.status)) ?? local;
  }

  return { local, remote };
}

/**
 * Record what happened to one payment, and — when it was captured — let the
 * membership it paid for come into existence. This is the only path from money
 * to membership (specs/concepts/membership.md).
 *
 * Takes the payment as Vipps describes it, whoever asked: the webhook
 * receiver, the receipt page, or the nightly sweep that reads charges back
 * without waiting to be told (specs/concepts/payment-reconciliation.md).
 */
export async function applyCharge(
  db: Db,
  vipps: VippsClient,
  vippsAgreementId: string,
  charge: Charge,
): Promise<void> {
  // The period a payment belongs to follows from when it was due, read
  // through the environment's period scheme — a calendar year in production,
  // an ISO week on accelerated staging.
  const period = periods.periodFor(new Date(charge.due));
  const periodYear = period.year;

  await recordCharge(db, vippsAgreementId, {
    vippsChargeId: charge.id,
    externalId: charge.externalId ?? null,
    periodYear,
    type: charge.type === "RECURRING" ? "RECURRING" : "INITIAL",
    status: charge.status as ChargeStatus,
    amountNok: fromOre(charge.amount),
    due: charge.due.slice(0, 10),
    failureReason: charge.failureDescription ?? charge.failureReason ?? null,
  });

  // Money given back in full takes its period with it, whoever gave it back:
  // our own refund action, Vipps' portal, or a refund the sweep discovered
  // (specs/use-cases/refund-a-payment.md). A PARTIALLY_REFUNDED charge — which
  // can only come from the portal, since the product never offers one — leaves
  // the membership standing: the year was still paid for.
  if (charge.status === "REFUNDED") {
    await revokeMembershipForRefundedCharge(db, charge.id);
    return;
  }

  if (charge.status !== "CHARGED") return;

  const local = await findAgreementByVippsId(db, vippsAgreementId);
  if (!local) return;
  const membership = await grantMembershipForCapturedCharge(db, charge.id, {
    periodYear,
    // A renewal covers the whole period; a first, pro-rated charge covers
    // from the day it was paid.
    periodStart: charge.type === "RECURRING" ? periods.fullPeriod(periodYear).start : period.start,
    periodEnd: period.end,
    annualFeeNok: local.annualFeeNok,
    paidNok: fromOre(charge.amount),
  });
  if (membership) await settleRedundantPayment(db, vipps, local, membership, charge);
}

/**
 * Give back money that bought nothing, the moment it is recognized as such.
 *
 * A supporting member pays for a period once (specs/concepts/membership.md).
 * Whether a payment is the second one for its period cannot be known before it
 * is taken: who is joining comes from the payment app's consent, which arrives
 * with the capture and not before — so the guard cannot live on the join page,
 * only here, where the money and the person are known together. Reached from
 * all three directions (webhook, receipt page, nightly sweep), so it settles
 * whichever way the news comes in.
 *
 * The arrangement is ended BEFORE the refund, for the reason a refund always
 * is (see `refundMembershipPayment`): the state never to leave behind is money
 * handed back on an arrangement that goes on charging.
 */
async function settleRedundantPayment(
  db: Db,
  vipps: VippsClient,
  agreement: MembershipAgreement,
  membership: { agreementId: string | null; periodYear: number },
  charge: Charge,
): Promise<void> {
  if (!agreement.memberId) return;
  const action = redundantJoinAction({
    chargeStatus: charge.status,
    agreementId: agreement.id,
    periodBoughtByAgreementId: membership.agreementId,
    otherAgreementRunning: await hasOtherRunningAgreement(db, agreement.memberId, agreement.id),
  });
  if (!action) return;

  const capturedOre = charge.summary?.captured ?? charge.amount;
  // Recorded, not alerted: a supporter who ended their arrangement and joined
  // again inside a period they had already paid for is an expected way to
  // arrive here, and the product resolves it by itself. Only the refund
  // failing below leaves something for a person to do.
  log.info("a payment landed on a period already paid for, and is being given back", {
    vippsAgreementId: agreement.vippsAgreementId,
    vippsChargeId: charge.id,
    periodYear: membership.periodYear,
    refundedNok: fromOre(capturedOre),
    action,
  });

  // A refund we cannot make must not cost the supporter their page or the
  // organization its books: the payment stands, correctly documented, and the
  // alarm is what brings a person to it (specs/concepts/operational-alerting.md).
  try {
    if (action === "refund-and-stop" && agreement.status === "ACTIVE") {
      await vipps.updateAgreement(
        agreement.vippsAgreementId,
        { status: "STOPPED" },
        await stableUuid(`stop:${agreement.vippsAgreementId}`),
      );
      await closeAgreement(db, agreement.vippsAgreementId, "STOPPED");
    }

    await vipps.refundCharge(
      agreement.vippsAgreementId,
      charge.id,
      {
        amount: capturedOre,
        description: `Allerede betalt for ${periodLabel(membership.periodYear)}`.slice(0, 100),
      },
      // The same derived key the administrator's own refund would use, so a
      // human pressing refund afterwards lands on this refund rather than
      // asking for a second one.
      await stableUuid(`refund:${charge.id}`),
    );

    // Read the outcome back, which is what records the refunded status and
    // releases this charge from the period it did not buy. The re-entry stops
    // here: the charge now reads REFUNDED, and `applyCharge` returns above
    // without granting anything.
    await syncCharge(db, vipps, agreement.vippsAgreementId, charge.id);
  } catch (error) {
    log.error("could not give back a payment for a period already paid for", error, {
      vippsAgreementId: agreement.vippsAgreementId,
      vippsChargeId: charge.id,
      periodYear: membership.periodYear,
    });
  }
}

/** Fetch one payment from Vipps and apply it. */
export async function syncCharge(
  db: Db,
  vipps: VippsClient,
  vippsAgreementId: string,
  vippsChargeId: string,
): Promise<void> {
  await applyCharge(
    db,
    vipps,
    vippsAgreementId,
    await vipps.getCharge(vippsAgreementId, vippsChargeId),
  );
}

/**
 * One payment event from Vipps, as delivered to the webhook receiver. Only the
 * fields the product acts on are modelled; deliveries carry more.
 */
export interface VippsEvent {
  eventType: string;
  agreementId: string;
  chargeId?: string;
  /** MERCHANT | USER | ADMIN — who ended an agreement, when one ends. */
  actor?: string;
  occurred?: string;
}

/**
 * Apply one event, whatever it is and whenever it arrives.
 *
 * The agreement is always synced first, because activation and the first
 * charge's capture are delivered within a second of each other and the capture
 * regularly wins the race — a membership cannot be granted before the person
 * behind it is known. Any capture that arrived too early is settled here once
 * it can be. Every step is idempotent, so redelivery is harmless.
 */
export async function applyVippsEvent(
  db: Db,
  vipps: VippsClient,
  event: VippsEvent,
): Promise<void> {
  const { local } = await syncAgreement(db, vipps, event.agreementId);

  if (event.chargeId) {
    await syncCharge(db, vipps, event.agreementId, event.chargeId);
  }

  if (!local) return;
  for (const pending of await listUnappliedCaptures(db, local.id)) {
    await syncCharge(db, vipps, event.agreementId, pending.vippsChargeId);
  }
}

// ── Refunds (specs/use-cases/refund-a-payment.md) ───────────────────────────

export interface RefundResult {
  /** What actually went back, as Vipps reported having captured it. */
  refundedNok: number;
  /** Whether a still-running yearly arrangement was ended along with it. */
  arrangementEnded: boolean;
}

/**
 * Give one payment back, and let the year it bought go with it.
 *
 * Two things move, in this order for a reason. **The arrangement is ended
 * first**, because the state this must never leave behind is money handed back
 * on an agreement that renews anyway — the same mistake taken again next year.
 * A failure after the stop leaves a member who is not being re-billed and a
 * refund the administrator can simply try again; a failure after the refund,
 * with the stop still to come, would not be recoverable by retrying.
 *
 * The amount is never ours to choose: Vipps is authoritative for money, so we
 * refund what it says was captured (specs/concepts/membership.md). And nothing
 * is written down until the provider has confirmed it — the resulting status
 * and the period's disappearance both come from reading the charge back.
 */
export async function refundMembershipPayment(
  db: Db,
  vipps: VippsClient,
  agreement: MembershipAgreement,
  charge: MembershipCharge,
): Promise<RefundResult> {
  const refusal = refundRefusal(charge);
  if (refusal) throw new RefundNotPossible(refusal);

  const remote = await vipps.getCharge(agreement.vippsAgreementId, charge.vippsChargeId);
  const capturedOre = remote.summary?.captured ?? remote.amount;
  if (remote.status !== "CHARGED" || capturedOre <= 0) {
    // Vipps knows something we did not; believe it rather than the local row.
    await applyCharge(db, vipps, agreement.vippsAgreementId, remote);
    throw new RefundNotPossible(
      remote.status === "REFUNDED" || remote.status === "PARTIALLY_REFUNDED"
        ? "already-refunded"
        : "not-captured",
    );
  }

  let arrangementEnded = false;
  if (agreement.status === "ACTIVE") {
    await vipps.updateAgreement(
      agreement.vippsAgreementId,
      { status: "STOPPED" },
      await stableUuid(`stop:${agreement.vippsAgreementId}`),
    );
    await closeAgreement(db, agreement.vippsAgreementId, "STOPPED");
    arrangementEnded = true;
  }

  await vipps.refundCharge(
    agreement.vippsAgreementId,
    charge.vippsChargeId,
    {
      // Vipps requires an amount even for a full refund, and 1–100 characters
      // of description that end up in the organization's own books.
      amount: capturedOre,
      description: `Refundert støttemedlemskap ${periodLabel(charge.periodYear)}`.slice(0, 100),
    },
    // Derived, not random: an administrator who presses again after a timeout
    // must land on the same refund rather than ask for a second one.
    await stableUuid(`refund:${charge.vippsChargeId}`),
  );

  // The refund answers 204 with no body, so the outcome is read back: this is
  // what records the refunded status and takes the period away.
  await syncCharge(db, vipps, agreement.vippsAgreementId, charge.vippsChargeId);
  return { refundedNok: fromOre(capturedOre), arrangementEnded };
}
