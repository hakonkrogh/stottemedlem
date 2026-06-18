# Concept: Organization

**Status:** Draft

## Definition
An **organization** is the entity that uses støttemedlem to gather supporting
members — for example a marching band, choir, sports team, or community group. It
is the B2B side of the product: it onboards, configures its supporting
membership, and owns the resulting member list.

## Why it exists
The organization is the customer and the unit of tenancy: every
[membership](membership.md), [supporting member](supporting-member.md), and
[annual fee](annual-fee.md) belongs to exactly one organization. The product
exists to serve the organization's single need — collecting and tracking annual
support.

## Rules & invariants
- An organization has a public-facing name that supporters recognize when joining.
- An organization sets exactly one current [annual fee](annual-fee.md).
- All supporting members and memberships belong to one organization; there is no
  sharing of members across organizations.
- An organization is administered by one or more people acting on its behalf.

## Relationships
- Has many [memberships](membership.md), one per supporting member per annual period.
- Has many [supporting members](supporting-member.md).
- Defines one [annual fee](annual-fee.md).

## Referenced by
- [Use case: Set up a supporting membership](../use-cases/set-up-supporting-membership.md)
- [Use case: Curate the member list](../use-cases/curate-member-list.md)
- [Problem: Collecting annual support](../problems/collecting-annual-support.md)
