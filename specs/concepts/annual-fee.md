# Concept: Annual fee

**Status:** Draft

## Definition
The **annual fee** is the amount an [organization](organization.md) sets for
one year of supporting membership of one
[membership tier](membership-tier.md). Paying it is what makes someone a
[supporting member](supporting-member.md) of that tier for the current annual
period.

## Why it exists
A fixed, organization-set yearly price per tier keeps the product deliberately
simple: each tier has one obvious amount to communicate to supporters and one
number behind every [membership](membership.md). It is the unit of value the
product collects.

## Rules & invariants
- Each [membership tier](membership-tier.md) has exactly one current annual
  fee (no variable or pay-what-you-want pricing in the current scope).
- The fee can be changed; a change applies to future joins and renewals and
  does **not** retroactively alter fees already paid. It applies to **existing
  members too** — a tier has one current fee, never a per-member one — from
  their next renewal onwards. See
  [Change the annual fee](../use-cases/change-the-annual-fee.md).
- A membership records the fee amount that was current when it was paid, so
  history is accurate even after the fee changes.
- The fee covers exactly one [annual period](annual-period.md) — a calendar
  year.
- A membership that starts mid-period costs a **pro-rated share** of the fee,
  proportional to the part of the year that remains. Every later period costs
  the full fee.
- A membership records both the full fee of its tier at the time and the amount
  actually paid, so a pro-rated first year stays legible in history.

## Relationships
- Set by one [organization](organization.md), on one
  [membership tier](membership-tier.md).
- Paid to establish or renew a [membership](membership.md).
- Divided across the [annual period](annual-period.md) when a membership starts
  mid-year.

## Referenced by
- [Use case: Set up a supporting membership](../use-cases/set-up-supporting-membership.md)
- [Use case: Join as a supporting member](../use-cases/join-as-supporting-member.md)
- [Use case: Renew annual membership](../use-cases/renew-annual-membership.md)
- [Use case: Change the annual fee](../use-cases/change-the-annual-fee.md)
- [Problem: Collecting annual support](../problems/collecting-annual-support.md)
- [Concept: Membership tier](membership-tier.md)
