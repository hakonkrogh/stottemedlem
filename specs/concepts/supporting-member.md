# Concept: Supporting member

**Status:** Draft

## Definition
A **supporting member** is a person from the community who backs an
[organization](organization.md) by paying its [annual fee](annual-fee.md). They
are the product's namesake (Norwegian: *støttemedlem*). A supporting member is
identified by the smallest set of details that lets an organization list them
and reach them — **name, e-mail address and phone number**, and nothing else
(see [member data](member-data.md)) — and is not necessarily an active
participant in the organization, just a supporter of it.

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
- A supporting member's identity is captured **at the moment of joining**,
  from the payment provider's profile with the supporter's consent, and is
  never re-fetched afterwards: the provider only offers it for a short window
  after consent. What is captured then is what the organization has.
- Identity/contact details can be corrected without altering payment history.
- A supporting member can stop being a *person* without ceasing to be a
  *record*: their details are erased on request, and by themselves once they
  have been kept as long as they may be, while the periods they paid for
  remain (see [member data](member-data.md) and
  [erase a member's personal data](../use-cases/erase-member-data.md)). An
  erased member is presented as erased, never as one with a missing name.

## Relationships
- Belongs to one [organization](organization.md).
- Has one or more [memberships](membership.md) over time (one per annual period).
- Has a [scorecard](scorecard.md): hearts derived from those memberships, plus a
  count of members recruited via their referral.

## Referenced by
- [Use case: Join as a supporting member](../use-cases/join-as-supporting-member.md)
- [Use case: Curate the member list](../use-cases/curate-member-list.md)
- [Use case: Erase a member's personal data](../use-cases/erase-member-data.md)
- [Concept: Member data](member-data.md)
- [Problem: Keeping an accurate list](../problems/keeping-an-accurate-member-list.md)
