# Concept: Membership tier

**Status:** Draft

## Definition
A **membership tier** is one named kind of supporting membership an
[organization](organization.md) offers — a level with its own name, optional
description, and [annual fee](annual-fee.md) (e.g. "Støttemedlem",
"Sølvmedlem", "Gullmedlem"). An organization has **at least one** tier: one is
the simple common case; several let supporters choose how much to back the
organization.

## Why it exists
Some organizations want more than one price point: a basic supporting
membership plus higher levels for supporters who want to give more. Tiers make
that a first-class, organization-managed catalogue instead of a single fixed
fee — while keeping the product's promise that each tier is still just "pay a
yearly amount, be on the list".

The **product hosts the catalogue** — tiers are created and managed in the
back office, not in the payment provider. This is a hard constraint, not a
preference: Vipps MobilePay has no product-catalogue API — its Recurring API
knows only *agreements* (one per member), each carrying a free-text product
name/description and an optional external identifier (verified against the
Recurring v3 OpenAPI spec, 2026-08-19). So the tier catalogue can only live in
the product, and each tier is **projected onto every Vipps agreement** created
for it, so that what the supporter sees in the Vipps app — and what the
organization sees in the Vipps portal — always names the tier.

## Rules & invariants
- Each tier belongs to exactly one organization and has a **name** (at most
  45 characters — it is shown as the product name in the Vipps app), an
  optional **description** (at most 100 characters — shown as the product
  description in Vipps and on the landing page), and exactly one current
  [annual fee](annual-fee.md).
- Each tier has a stable **key**: a short URL-safe identifier derived from its
  name when the tier is created, unique within the organization, and **never
  changed afterwards** — renaming a tier changes its name, not its key. The
  key is the "predefined identifier" outside systems can rely on.
- **Projection into Vipps:** every payment agreement created for a tier
  carries the tier's name as the agreement's product name, its description as
  the product description, and an external identifier that embeds the tier
  key — so any agreement seen in Vipps can be traced back to its tier by
  convention, without consulting the product first.
- Tier changes (name, description, fee) apply to **future** joins and
  renewals; they never retroactively alter what was already paid. A fee
  change reaches existing members' agreements at their next renewal.
- Tiers are **archived, never deleted**: existing memberships may reference
  them. An archived tier disappears from the
  [landing page](org-landing-page.md) and can no longer be joined, but keeps
  its identity for history.
- **Minimum one:** an organization always has at least one active tier.
  Creating the organization includes stating its first membership — a minimal
  one (the default membership name and an annual fee) that can be renamed,
  repriced, or replaced later. The last active tier cannot be archived. This
  exists because the payment provider evaluates the organization's public
  page against a real product with a real price — a page without a priced
  membership has nothing to approve.
- Where tiers are presented (landing page, back office), they are ordered by
  annual fee, cheapest first.

## Relationships
- Belongs to one [organization](organization.md).
- Carries one current [annual fee](annual-fee.md).
- A [membership](membership.md) is a membership *of one tier* — the tier (and
  its fee at the time) is recorded on the membership.
- Enumerated on the [organization landing page](org-landing-page.md); a
  [join entry point](join-entry-point.md) may point at a specific tier.

## Referenced by
- [Use case: Set up a supporting membership](../use-cases/set-up-supporting-membership.md)
- [Use case: Join as a supporting member](../use-cases/join-as-supporting-member.md)
- [Concept: Annual fee](annual-fee.md)
- [Concept: Membership](membership.md)
- [Concept: Organization landing page](org-landing-page.md)
