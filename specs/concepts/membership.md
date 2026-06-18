# Concept: Membership

**Status:** Draft

## Definition
A **membership** is the relationship between a [supporting member](supporting-member.md)
and an [organization](organization.md) for one **annual period**, established by
paying the [annual fee](annual-fee.md). It is the core record the product tracks:
who supported whom, for which year.

## Why it exists
Membership is what turns a payment into something the organization can see and
act on. Making the annual period explicit is what lets status be derived
automatically (active vs lapsed) and lets a supporter's support accumulate year
over year as a history of memberships.

## Rules & invariants
- A membership covers exactly one annual period and has a valid-until date.
- A membership is **active** while its annual period is current and the fee for
  that period is paid; it becomes **lapsed** once the period ends without a paid
  renewal.
- A membership comes into existence only on a successful payment of the annual
  fee — never by manual status change.
- At most one membership exists per supporting member per annual period.
- A renewal creates the next period's membership for the same supporting member,
  rather than a new person.

## Relationships
- Links one [supporting member](supporting-member.md) to one [organization](organization.md).
- Is paid for by one [annual fee](annual-fee.md) (the amount current at the time
  of the payment).

## Referenced by
- [Use case: Join as a supporting member](../use-cases/join-as-supporting-member.md)
- [Use case: Renew annual membership](../use-cases/renew-annual-membership.md)
- [Use case: Curate the member list](../use-cases/curate-member-list.md)
- [Problem: Keeping an accurate list](../problems/keeping-an-accurate-member-list.md)
