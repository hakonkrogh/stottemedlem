// Fictitious supporters for the member-list stories — never a real person's
// details, since stories are committed and screenshotted.
import type { MemberOverview, Membership, SupportingMember } from "@stottemedlem/db";
import type { PaymentView } from "../lib/refunds";

const ORG_ID = "org-1";

export function fixtureMember(
  id: string,
  name: string | null,
  email: string | null,
  phone: string | null,
): SupportingMember {
  return {
    id,
    orgId: ORG_ID,
    name,
    email,
    phone,
    vippsSub: `sub-${id}`,
    cardToken: `kort-${id}`,
    referredByMemberId: null,
    messagesDeclinedAt: null,
    createdAt: "2026-01-04",
  };
}

export function fixturePeriod(
  memberId: string,
  year: number,
  paidNok: number,
  tierName = "Støttemedlem",
): Membership {
  return {
    id: `ms-${memberId}-${year}`,
    orgId: ORG_ID,
    memberId,
    agreementId: `agr-${memberId}`,
    tierId: "tier-1",
    tierName,
    periodYear: year,
    periodStart: `${year}-01-01`,
    periodEnd: `${year}-12-31`,
    annualFeeNok: 300,
    paidNok,
    createdAt: `${year}-01-01`,
  };
}

/** A supporter who joined, paid, and whose arrangement still runs. */
export const continuing: MemberOverview = {
  member: fixtureMember("m-1", "Ingrid Solheim", "ingrid@eksempel.example", "4711111111"),
  latest: fixturePeriod("m-1", 2026, 300),
  status: "active",
  renewing: true,
  hearts: 3,
  recruits: 2,
};

/** Paid for this year, then ended the arrangement — still a member until 31 Dec. */
export const endingAfterThisYear: MemberOverview = {
  member: fixtureMember("m-2", "Bjørn Aas", "bjorn@eksempel.example", "4722222222"),
  latest: fixturePeriod("m-2", 2026, 240),
  status: "active",
  renewing: false,
  hearts: 1,
  recruits: 0,
};

/** Supported for two years and stopped — the one to invite back. */
export const lapsed: MemberOverview = {
  member: fixtureMember("m-3", "Marit Fjeld", "marit@eksempel.example", null),
  latest: fixturePeriod("m-3", 2024, 250),
  status: "lapsed",
  renewing: false,
  hearts: 2,
  recruits: 0,
};

/** Consented to a contact address but no name. */
export const withoutName: MemberOverview = {
  member: fixtureMember("m-4", null, "ukjent@eksempel.example", null),
  latest: fixturePeriod("m-4", 2026, 125),
  status: "active",
  renewing: true,
  hearts: 1,
  recruits: 0,
};

/** Approved seconds ago; the first payment has not landed yet. */
export const nothingPaidYet: MemberOverview = {
  member: fixtureMember("m-5", "Nyinnmeldt Person", null, "4744444444"),
  latest: null,
  status: "lapsed",
  renewing: true,
  hearts: 0,
  recruits: 0,
};

/** Paying, but joined without sharing an address — nobody can be told anything. */
export const noWayToReach: MemberOverview = {
  member: fixtureMember("m-6", "Sigrun Vik", null, "4755555555"),
  latest: fixturePeriod("m-6", 2026, 300),
  status: "active",
  renewing: true,
  hearts: 12,
  recruits: 0,
};

/** One payment as the member's page presents it (specs/use-cases/refund-a-payment.md). */
export function fixturePayment(
  year: number,
  amountNok: number,
  state: PaymentView["state"] = "paid",
  refusal: PaymentView["refusal"] = null,
  extra: Partial<PaymentView> = {},
): PaymentView {
  return {
    chargeId: `chr-${year}`,
    periodYear: year,
    amountNok,
    type: "RECURRING",
    on: `${year}-01-02`,
    state,
    refusal,
    ...extra,
  };
}

export const everyone: MemberOverview[] = [
  withoutName,
  endingAfterThisYear,
  continuing,
  lapsed,
  noWayToReach,
  nothingPaidYet,
];
