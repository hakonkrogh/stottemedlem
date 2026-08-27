# Concept: Membership

**Status:** Draft

## Definition
A **membership** is the relationship between a [supporting member](supporting-member.md)
and an [organization](organization.md) for one [annual period](annual-period.md),
established by paying the [annual fee](annual-fee.md) of one
[membership tier](membership-tier.md). It is the core record the product
tracks: who supported whom, at which level, for which year.

## Why it exists
Membership is what turns a payment into something the organization can see and
act on. Making the annual period explicit is what lets status be derived
automatically (active vs lapsed) and lets a supporter's support accumulate year
over year as a history of memberships.

## Rules & invariants
- A membership covers exactly one [annual period](annual-period.md) — a calendar
  year — and is valid until 31 December of it.
- A membership is **active** while its annual period is current and the fee for
  that period is paid; it becomes **lapsed** once the period ends without a paid
  renewal.
- A membership comes into existence only on a successful payment of the annual
  fee — never by manual status change.
- A membership lasts only as long as the payment behind it does. A payment
  given back **in full** takes its period with it: the membership it bought
  ceases to exist, and the supporter is not counted as having supported that
  year ([refund a payment](../use-cases/refund-a-payment.md)). This is the same
  rule as above read backwards, not an exception to it — the period follows the
  money in both directions, and an administrator still never sets status by
  hand. A payment given back only in part leaves the membership standing: the
  year was still paid for.
- Losing a membership is not losing the person. The
  [supporting member](supporting-member.md) remains recorded, with nothing paid
  — the same state as someone whose first payment never completed.
- At most one membership exists per supporting member per annual period.
- A renewal creates the next period's membership for the same supporting member,
  rather than a new person.
- Memberships continue by themselves: a supporter agrees once to a yearly
  payment, and each new period's membership follows from that agreement being
  charged — the supporter is not asked to re-authorize every year. Ending the
  arrangement is always the supporter's to do, and the product must honour it
  the moment they do (see [renew](../use-cases/renew-annual-membership.md)).
- The record of what was paid — how much, when, for which period, and whether it
  succeeded — is kept as the membership's own history, so the organization's
  books survive tier renames, repricing, and the payment provider's own limited
  retention.
- The product's record of who is a member is authoritative for the
  organization. The payment provider is authoritative for money, but cannot
  answer "who supports us" — it holds no member identity beyond a short
  consent window (see [Vipps API keys](vipps-api-keys.md)).
- Because the provider is authoritative for money, the product's record of a
  payment must be derived from it rather than merely accumulated from
  notifications: a membership follows from a payment that happened, not from a
  payment we were told about (see [payment reconciliation](payment-reconciliation.md)).
- A membership belongs to one [membership tier](membership-tier.md) and records
  the tier (and its fee at the time of payment), so history stays accurate when
  tiers are renamed, repriced, or archived.

## Relationships
- Links one [supporting member](supporting-member.md) to one [organization](organization.md).
- Is a membership of one [membership tier](membership-tier.md).
- Covers one [annual period](annual-period.md).
- Is kept true to the money by [payment reconciliation](payment-reconciliation.md).
- Is paid for by one [annual fee](annual-fee.md) (the amount current at the time
  of the payment; pro-rated when the membership starts mid-period).

## Referenced by
- [Use case: Join as a supporting member](../use-cases/join-as-supporting-member.md)
- [Use case: Renew annual membership](../use-cases/renew-annual-membership.md)
- [Use case: Curate the member list](../use-cases/curate-member-list.md)
- [Use case: Refund a supporting member's payment](../use-cases/refund-a-payment.md)
- [Problem: Keeping an accurate list](../problems/keeping-an-accurate-member-list.md)
- [Problem: A payment that should never have happened](../problems/honouring-a-refund-request.md)
