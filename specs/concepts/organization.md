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
- An organization has a **slug**: a unique, URL-safe identifier automatically
  derived from its name when the organization is created. The slug is
  **stable** — it never changes afterwards, even if the name does — because the
  addresses built from it (the [join entry point](join-entry-point.md), the
  [landing page](org-landing-page.md)) end up printed on posters and registered
  with payment providers.
- An organization has a **public profile** — organisasjonsnummer and contact
  information — shown on its [landing page](org-landing-page.md). The product
  requires these fields (payment-provider approval depends on them); an
  organization missing any of them is prompted to complete its profile in the
  back office.
- An organization may add a **visual identity** — a logo and a banner image —
  shown on its [landing page](org-landing-page.md). Unlike the profile fields
  these are **optional**: the page simply omits what has not been uploaded.
- An administrator can edit the organization's details — name, public profile,
  and visual identity — in the back office at any time; the public pages
  reflect changes immediately. A name change never changes the slug.
- An organization sets exactly one current [annual fee](annual-fee.md).
- All supporting members and memberships belong to one organization; there is no
  sharing of members across organizations.
- An organization is administered by one or more [administrators](administrator.md)
  acting on its behalf; it is created by an administrator when they first
  [access the back office](../use-cases/access-the-back-office.md) without one.

## Relationships
- Has one public [landing page](org-landing-page.md), addressed by its slug.
- Has many [memberships](membership.md), one per supporting member per annual period.
- Has many [supporting members](supporting-member.md).
- Has one or more [administrators](administrator.md) who act on its behalf.
- Defines one [annual fee](annual-fee.md).

## Referenced by
- [Use case: Access the back office](../use-cases/access-the-back-office.md)
- [Use case: Set up a supporting membership](../use-cases/set-up-supporting-membership.md)
- [Use case: Curate the member list](../use-cases/curate-member-list.md)
- [Concept: Administrator](administrator.md)
- [Problem: Collecting annual support](../problems/collecting-annual-support.md)
