import { env } from "cloudflare:workers";
import {
  memberSelfServicePath,
  periodLabel,
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
  listUnappliedCaptures,
  type MembershipAgreement,
  type MembershipTier,
  type Organization,
  recordCharge,
  recordDraftedAgreement,
} from "@stottemedlem/db";
import type { Agreement, Charge, ChargeStatus, VippsClient } from "@stottemedlem/vipps";
import { periods } from "./periods";

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
  /** What they pay now: pro-rated for the rest of the calendar year. */
  paidNok: number;
}

/**
 * Draft the agreement a supporting membership is: a yearly, fixed-price
 * arrangement at the tier's annual fee, with the first (pro-rated) period
 * charged on approval, asking for the profile data a member list needs.
 *
 * Nothing about membership is created here — only the intent to pay. The
 * membership follows from money actually arriving.
 */
export async function startJoin(
  db: Db,
  vipps: VippsClient,
  org: Organization,
  tier: MembershipTier,
  origin: string,
): Promise<JoinDraft> {
  const period = periods.periodFor();
  const paidNok = periods.proratedJoinFeeNok(tier.annualFeeNok, new Date());
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
      initialCharge: {
        amount: toOre(paidNok),
        description:
          paidNok === tier.annualFeeNok
            ? `${tier.name} ${periodLabel(period.year)}`
            : `${tier.name} — resten av ${periodLabel(period.year)}`,
        transactionType: "DIRECT_CAPTURE",
      },
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
export async function applyCharge(db: Db, vippsAgreementId: string, charge: Charge): Promise<void> {
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

  if (charge.status !== "CHARGED") return;

  const local = await findAgreementByVippsId(db, vippsAgreementId);
  if (!local) return;
  await grantMembershipForCapturedCharge(db, charge.id, {
    periodYear,
    // A renewal covers the whole period; a first, pro-rated charge covers
    // from the day it was paid.
    periodStart: charge.type === "RECURRING" ? periods.fullPeriod(periodYear).start : period.start,
    periodEnd: period.end,
    annualFeeNok: local.annualFeeNok,
    paidNok: fromOre(charge.amount),
  });
}

/** Fetch one payment from Vipps and apply it. */
export async function syncCharge(
  db: Db,
  vipps: VippsClient,
  vippsAgreementId: string,
  vippsChargeId: string,
): Promise<void> {
  await applyCharge(db, vippsAgreementId, await vipps.getCharge(vippsAgreementId, vippsChargeId));
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
