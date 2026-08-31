# Concept: Payment reconciliation

**Status:** Draft

## Definition
**Payment reconciliation** is the product's standing habit of asking the payment
provider what it actually holds, and correcting its own record where the two
disagree — rather than relying on having been told. It runs by itself, on a
schedule, over the [memberships](membership.md) and payments the product
believes in.

## Why it exists
The product learns about money mainly by being notified: a payment succeeded, an
arrangement was approved, a member ended theirs. Notifications are delivered
*at least once*, which is not the same as *always*. A notification can be lost
outright — the receiving address changed, the receiver was down, a deploy landed
mid-delivery — and nothing about the money notices. The payment happened; only
our knowledge of it went missing.

A [member list](../use-cases/curate-member-list.md) that is only as correct as
the network was is exactly the hand-reconciled spreadsheet the product exists to
replace ([problem](../problems/keeping-an-accurate-member-list.md)). Worse, the
failure is silent and lands on the member: they paid, and the organization
believes they lapsed.

Reconciliation is the answer: the record is *derived* from the provider on a
schedule, not merely *accumulated* from notifications.

## Rules & invariants
- The payment provider is the authority on money. Where the product's record of
  a payment disagrees with the provider's, the provider wins and the product
  corrects itself — never the other way round.
- Reconciliation **never asks for money**. It creates no payment and raises no
  amount; a discrepancy is resolved by learning, not by billing. Reading is
  almost all it does — but not quite all, because one discovery cannot be left
  alone once made: a payment for a period the supporter already bought is
  given back, the same as it would be had the product noticed at the time
  ([joining](../use-cases/join-as-supporting-member.md)). Money is only ever
  returned this way, never taken. Everything else it finds it records and,
  where a person must decide, says loudly.
- It works by comparison, never by memory. It asks what is true now instead of
  remembering what it did last time, so running it twice changes nothing and
  skipping a night costs nothing but delay.
- A payment the provider knows about and the product does not is a real
  possibility, and reconciliation must be able to find one. It is the only
  mechanism that can: nothing else would ever go looking.
- Money that arrived must end as a membership. A captured payment whose
  membership does not yet exist is unfinished business, and reconciliation
  settles it at the next opportunity.
- Every arrangement is checked again eventually. Suspicion comes first — an
  outcome that was due and never arrived, money that never became a membership,
  an approval we may have missed — but even an arrangement nothing is wrong with
  comes round in turn.
- The work per run is bounded, so the cost of a night is predictable however
  many members an organization has. Bounding delays a check; it never cancels
  one.
- One arrangement's failure never stops the rest, and a failed check is not
  recorded as a check — the next run tries it first.
- What the sweep stops chasing, it reports. An arrangement abandoned long enough
  to be dropped from the sweep is counted and surfaced, never silently forgotten.
- One year, one renewal. A second charge that can still take — or has taken —
  money for the same arrangement and period is the double charge the product
  promises never to make ([renewal](../use-cases/renew-annual-membership.md)).
  Should reconciliation ever see one, it raises the alarm for a person to
  resolve rather than absorbing both payments quietly into the books; a charge
  that was cancelled or definitively failed can double-bill nobody and raises
  none.
- Reconciliation runs before anything else that acts on the record that night,
  so the night's decisions are made against a corrected picture.

## Relationships
- Corrects the product's record of [memberships](membership.md) and the payments
  behind them.
- Is what makes [renewal](../use-cases/renew-annual-membership.md) trustworthy
  when a renewal notification is lost.
- Depends on the organization's own [Vipps API keys](vipps-api-keys.md) — it
  reads each organization's payments with that organization's credentials.
- Is invisible to both [administrators](administrator.md) and
  [supporting members](supporting-member.md): its success is that the list is
  simply right.

## Referenced by
- [Problem: Keeping an accurate list of who has paid](../problems/keeping-an-accurate-member-list.md)
- [Use case: Renew annual membership](../use-cases/renew-annual-membership.md)
- [Use case: Join as a supporting member](../use-cases/join-as-supporting-member.md)
- [Use case: Curate the member list](../use-cases/curate-member-list.md)
