# Concept: Supporting member

**Status:** Draft

## Definition
A **supporting member** is a person from the community who backs an
[organization](organization.md) by paying its [annual fee](annual-fee.md). They
are the product's namesake (Norwegian: *støttemedlem*). A supporting member is
identified by minimal details — enough to list and contact them (e.g. name and
email) — and is not necessarily an active participant in the organization, just a
supporter of it.

## Why it exists
The supporting member is the person the organization wants to see on its list and
the person who experiences the join/renew flow. Modeling the person separately
from any single year's payment lets their support accumulate across periods
without creating a duplicate person each year.

## Rules & invariants
- A supporting member belongs to one [organization](organization.md).
- A supporting member's *current status* (active or lapsed) is derived from their
  [membership](membership.md) for the current annual period — it is never set by
  hand.
- The same person can hold a sequence of memberships over multiple annual periods
  (their history), but at most one membership per annual period.
- Identity/contact details can be corrected without altering payment history.

## Relationships
- Belongs to one [organization](organization.md).
- Has one or more [memberships](membership.md) over time (one per annual period).

## Referenced by
- [Use case: Join as a supporting member](../use-cases/join-as-supporting-member.md)
- [Use case: Curate the member list](../use-cases/curate-member-list.md)
- [Problem: Keeping an accurate list](../problems/keeping-an-accurate-member-list.md)
