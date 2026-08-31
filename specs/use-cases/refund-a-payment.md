# Use case: Refund a supporting member's payment

**Status:** Draft
**Solves:** [Problem: A payment that should never have happened cannot be undone](../problems/honouring-a-refund-request.md)

## Goal
An administrator gives a supporting member their money back, from the back
office, and the register stops claiming that person supported the organization
that year.

## Actors
- **Organization administrator** — the only one who can do this.
- **Supporting member** — asks for it, but never performs it.

## Preconditions
- The member has a payment that actually took money.
- The organization's payment provider is connected
  ([Vipps API keys](../concepts/vipps-api-keys.md)).

## Behaviour
1. The administrator opens the member and sees **what that member has actually
   paid** — each payment, when it was taken, how much, and whether it still
   stands. Payment history is presented, like everything else about a member
   ([presenting and editing](../concepts/presenting-and-editing.md)).
2. **No two payments may read the same.** A member can have two payments for the
   same period at the same price — someone who joined, left and joined again —
   and each one carries a button that moves money. So every payment says which
   one it is: what kind of payment it was, and when it was taken, told **finely
   enough to separate it from the others**. Two joins on the same day need the
   hour; a year apart does not. A person about to give money back must never
   have to guess which money.
3. Beside a payment that can still be given back, the administrator is offered
   to refund it. A payment that cannot be refunded does not offer it, and says
   why rather than failing when pressed.
4. **A refund is all or nothing.** The administrator chooses *which* payment to
   give back, never *how much* of it: the amount is the amount that was taken.
   The product does not offer partial refunds — an organization negotiating a
   part-refund with a supporter is a conversation, not a feature.
5. Refunding is a deliberate, confirmed action. Before it happens the
   administrator is told plainly what it will do: this much money goes back,
   this year stops counting as supported, and the yearly arrangement ends.
6. **Refunding always ends the arrangement too**, when one is still running.
   Money handed back and a renewal taken next year is the same mistake repeated,
   so the product never leaves that state reachable. An administrator who wants
   the member to keep supporting simply does not refund.
7. The money moves at the payment provider first. Only what the provider
   confirms is written down — the product never records a refund it merely
   attempted ([membership](../concepts/membership.md): the provider is
   authoritative for money).
8. Afterwards the register agrees with the money: the refunded period is no
   longer a supported period, so the member is no longer counted as active for
   it, and their [scorecard](../concepts/scorecard.md) loses the heart that
   period gave them. The person themselves is **not** deleted — they are still
   someone the organization has heard from, now with nothing paid.
9. What was paid and given back stays in the books. The payment is not erased;
   it is recorded as refunded, with the period it used to buy. An organization
   must be able to answer "what happened to this person's money" years later.
10. A period that was paid for **twice** keeps standing on the payment that was
    not given back. Refunding one of them gives that money back and takes no
    year away, and the administrator is told so before it happens rather than
    promised a consequence that will not follow.
11. When it does not work, the administrator is told so in plain words and
    nothing is written down. Refusals are real and specific — a payment too old
    to refund (the provider allows this only for a limited time after it was
    taken), a payment already given back, a sales unit whose setup does not
    allow refunds at all.

### When the refund happens somewhere else
12. An administrator can always refund in the payment provider's own portal
    instead, and some will. The register must end up in exactly the same state:
    the refunded period stops counting, whether or not the refund started here.
    This follows from [payment reconciliation](../concepts/payment-reconciliation.md)
    — the record is derived from the money, not from having been told about it.
13. A **partial** refund can only arrive this way, since the product never
    offers one. It is recorded, and it does **not** take the period away: money
    for that year was still paid. The administrator can see that it happened.

## Acceptance criteria
- [ ] An administrator can refund a member's payment without leaving the back
      office.
- [ ] The refund amount is never chosen by hand; it is what was taken.
- [ ] Refunding is confirmed first, and the confirmation states the three
      consequences (money back, period no longer supported, arrangement ended).
- [ ] A live arrangement is ended by the same action that refunds.
- [ ] After a full refund the member is not counted as active for that period,
      and their history no longer claims it.
- [ ] The refunded payment remains visible in the member's payment history,
      marked as refunded.
- [ ] A full refund made in the provider's portal produces the same end state,
      without an administrator doing anything here.
- [ ] A partial refund made in the provider's portal is visible and leaves the
      membership intact.
- [ ] A refund that the provider refuses changes nothing and is reported in
      plain language.
- [ ] Two payments for the same period and amount are distinguishable from each
      other before either is refunded.
- [ ] Refunding one of two payments for the same period leaves that period
      standing, and the confirmation says so instead of promising otherwise.

## Out of scope
- **Partial refunds**, as an action the product offers.
- The supporting member refunding themselves. Ending the arrangement is theirs
  to do ([member self-service page](../concepts/member-self-service.md));
  getting money back is a decision the organization makes.
- Refunding many members at once.
- Any accounting export of refunds beyond the member's own payment history.

## Related
- [Concept: Membership](../concepts/membership.md)
- [Concept: Scorecard](../concepts/scorecard.md) — hearts follow periods, so a
  refunded period takes its heart with it
- [Concept: Back office](../concepts/back-office.md) — this lives under
  **Medlemmer**, on the member's own page
- [Use case: Curate the member list](../use-cases/curate-member-list.md)
- [Use case: Renew annual membership](renew-annual-membership.md) — what ending
  the arrangement means for a period already paid
