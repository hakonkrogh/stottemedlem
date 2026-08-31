# Use case: Renew annual membership

**Status:** Draft
**Solves:** [Problem: Keeping an accurate list of who has paid](../problems/keeping-an-accurate-member-list.md)

## Goal
A supporting member continues their support for another year, and the
organization's list stays accurate as periods turn over.

## Actors
- **Supporting member** — renews their own support.
- **Organization administrator** — observes who has lapsed and who has renewed.

## Preconditions
- The supporter has, or recently had, a [membership](../concepts/membership.md)
  with the organization.

## Behaviour
1. A [membership](../concepts/membership.md) is valid for one
   [annual period](../concepts/annual-period.md) — the calendar year.
2. **Renewal is the default, and it happens by itself.** The supporter agreed
   once to a yearly payment when they joined; at the turn of the year the
   [annual fee](../concepts/annual-fee.md) **current at that moment** — which
   may have [changed](change-the-annual-fee.md) since they joined — is
   collected and the next
   period's membership follows from it. Nobody has to remember anything — not
   the member, not the administrator.
3. The supporter is told what is coming before it is taken, with enough notice
   to opt out, and can end the arrangement at any time — from their own payment
   app or from the organization's own self-service page. Ending it is never
   harder than starting it was. The payment app shows the coming payment and
   announces it shortly before it is taken; when the **amount has changed**
   since last year, that is not enough — the app states a number, not a change
   — so the product sends its own
   [member notice](../concepts/member-notice.md) as well
   ([changing the annual fee](change-the-annual-fee.md)).
4. If the payment does not succeed, the product waits out the payment
   provider's retries rather than judging early. Only when the payment has
   definitively failed does the membership lapse, and the member is then shown
   as lapsed in the [member list](curate-member-list.md).
5. **The renewal counts because it was paid, not because the product was told
   about it.** Notification of a payment can be lost, so the product also goes
   and checks
   ([payment reconciliation](../concepts/payment-reconciliation.md)): a renewal
   that succeeded is picked up regardless, and the member is never shown as
   lapsed for a payment they made.
6. Once the renewal payment is captured, the member receives its
   [payment receipt](../concepts/payment-receipt.md) by email — the
   documentation of the payment just taken, one per payment, not something the
   member can decline. This does not contradict the no-reminder rule below:
   a reminder *before* an unchanged renewal repeats what the payment app
   already says, while the receipt documents money *after* it moved — which
   the app's own notification does not do in a form fit for anyone's books.
7. A lapsed supporter can come back by joining again; renewal and return both
   reuse the supporter's existing identity — they do not re-register as a new
   person, and their membership history accumulates across periods.
8. **Ending is not final for the supporter, only for the arrangement.** A
   payment app cannot revive an arrangement once ended, so resuming always
   means a new one — but that is the product's problem, not the member's. The
   member's own
   [self-service page](../concepts/member-self-service.md) offers picking the
   membership back up right where it says it has ended, and from then on they
   are renewing again, whichever arrangement carries it. Resuming inside a
   period they have already paid for **costs nothing** — only the continuation
   starts again; resuming after lapsing is an ordinary join and pays for the
   period. Coming back through the public
   [join page](join-as-supporting-member.md) instead reaches the same place,
   the long way: nobody there knows who they are until they have paid, so a
   payment for a period they already hold is taken and then returned.
9. The valid-until date after renewal is 31 December of the new period.

## Acceptance criteria
- [ ] A continuing membership renews into the next period without the member or
      the administrator doing anything.
- [ ] The member is warned before the renewal payment is taken and can stop the
      arrangement before it is.
- [ ] A membership becomes lapsed only once renewal payment has definitively
      failed or the member has ended the arrangement — never while payment is
      still being retried.
- [ ] A member who ends the arrangement stays active until their paid period
      runs out, and is not charged again.
- [ ] A member who ends the arrangement can pick it back up from the same page,
      without going looking for the join page.
- [ ] Picking it back up inside a period they already paid for charges them
      nothing, and renewal resumes at the next period.
- [ ] Renewal extends the same supporting member's history rather than creating a
      duplicate person.
- [ ] The list and counts reflect lapse and renewal without manual admin action.
- [ ] A renewal that was paid is reflected in the list even when the product was
      never notified of it.
- [ ] A renewal is never taken twice because the product lost track of having
      arranged it.
- [ ] A captured renewal yields exactly one
      [receipt](../concepts/payment-receipt.md) email, retried until sent when
      a send fails.

## Out of scope
- Mid-period tier upgrades (changing tier takes effect at the next renewal).
- A reminder before an *unchanged* renewal: the payment app already shows the
  coming payment for weeks and announces it the day before, and repeating that
  would be noise. The product speaks up when something changed.
- Reviving a lapsed membership retroactively — a return starts a new period.

## Related
- [Concept: Membership](../concepts/membership.md)
- [Concept: Annual period](../concepts/annual-period.md)
- [Concept: Member self-service page](../concepts/member-self-service.md) — where
  a member ends the arrangement themselves
- [Concept: Annual fee](../concepts/annual-fee.md)
- [Concept: Member notice](../concepts/member-notice.md) — what the product
  tells a member itself, when the payment app cannot
- [Concept: Payment receipt](../concepts/payment-receipt.md) — the
  documentation every captured renewal sends
- [Concept: Payment reconciliation](../concepts/payment-reconciliation.md) — why
  a renewal counts even when nobody told us about it
