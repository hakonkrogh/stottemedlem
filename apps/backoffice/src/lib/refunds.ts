import { paymentState, type RefundRefusal, refundRefusal } from "@stottemedlem/core";
import type { MembershipCharge } from "@stottemedlem/db";

// A member's payments as their page presents them
// (specs/use-cases/refund-a-payment.md). The rules themselves — what can still
// be given back, and what a payment's status means — live in @stottemedlem/core
// where they are tested; this is the shaping the screen needs, kept apart from
// membership.ts so the screen and its stories never pull in the Worker
// environment that the payment loop needs.

export type { PaymentState, RefundRefusal } from "@stottemedlem/core";

export class RefundNotPossible extends Error {
  constructor(readonly refusal: RefundRefusal) {
    super(`refund not possible: ${refusal}`);
    this.name = "RefundNotPossible";
  }
}

/**
 * One payment as the member's page presents it.
 *
 * Period and amount are NOT enough to tell two payments apart — a member who
 * joined, stopped and joined again has two payments for the same period at the
 * same price, and on the accelerated staging calendar that happens within
 * minutes. Since each row carries a button that moves money, every row also
 * says what kind of payment it was and the day it was taken.
 */
export interface PaymentView {
  /** Vipps' charge id: the address the refund action is offered at. */
  chargeId: string;
  periodYear: number;
  amountNok: number;
  /** The joining payment, or one of the renewals that followed it. */
  type: MembershipCharge["type"];
  /** The day the money moved; the day it was due when it never did. */
  on: string;
  state: ReturnType<typeof paymentState>;
  /** Null when this payment can be given back; otherwise why it cannot. */
  refusal: RefundRefusal | null;
}

export function paymentViews(charges: MembershipCharge[], now: Date = new Date()): PaymentView[] {
  return charges.map((charge) => ({
    chargeId: charge.vippsChargeId,
    periodYear: charge.periodYear,
    amountNok: charge.amountNok,
    type: charge.type,
    on: charge.capturedAt ?? charge.due,
    state: paymentState(charge.status),
    refusal: refundRefusal(charge, now),
  }));
}
