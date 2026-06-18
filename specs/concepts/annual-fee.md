# Concept: Annual fee

**Status:** Draft

## Definition
The **annual fee** is the single amount an [organization](organization.md) sets
for one year of supporting membership. Paying it is what makes someone a
[supporting member](supporting-member.md) for the current annual period.

## Why it exists
A single, organization-set yearly price keeps the product deliberately simple:
one obvious amount to communicate to supporters and one number behind every
[membership](membership.md). It is the unit of value the product collects.

## Rules & invariants
- An organization has exactly one current annual fee (no tiers or variable
  pricing in the current scope).
- The fee can be changed; a change applies to future joins and renewals and does
  **not** retroactively alter fees already paid.
- A membership records the fee amount that was current when it was paid, so
  history is accurate even after the fee changes.
- The fee covers exactly one annual period.

## Relationships
- Set by one [organization](organization.md).
- Paid to establish or renew a [membership](membership.md).

## Referenced by
- [Use case: Set up a supporting membership](../use-cases/set-up-supporting-membership.md)
- [Use case: Join as a supporting member](../use-cases/join-as-supporting-member.md)
- [Use case: Renew annual membership](../use-cases/renew-annual-membership.md)
- [Problem: Collecting annual support](../problems/collecting-annual-support.md)
