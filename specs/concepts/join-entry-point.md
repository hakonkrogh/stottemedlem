# Concept: Join entry point

**Status:** Draft

## Definition
The **join entry point** is the public, shareable destination where a person
starts [joining as a supporting member](../use-cases/join-as-supporting-member.md)
of a specific [organization](organization.md). It is what the organization
spreads to its community — as a link, and as scannable forms of that link such
as a [QR code card](../use-cases/promote-with-qr-card.md).

## Why it exists
The whole point of the product is that support collects itself: the
organization shares one entry point once, and supporters can join and pay
without any admin involvement. Naming it as a concept keeps every way of
sharing it (link, QR code, embed) pointing at the same single destination.

## Rules & invariants
- Every organization has exactly one join entry point once it has
  [set up its supporting membership](../use-cases/set-up-supporting-membership.md).
- The entry point is stable: material that carries it (posters, printed QR
  cards, embeds on external websites) keeps working without reprinting or
  re-embedding when the organization changes details such as its
  [annual fee](annual-fee.md).
- Anyone with the entry point can start joining — it requires no login or
  invitation.
- There is **one** entry point per organization, never one per
  [membership tier](membership-tier.md). The product does not offer a
  shareable link to an individual membership: the organization spreads the
  single entry point, and a supporter picks the membership they want along
  the way.
- Opening it takes the supporter **directly into Vipps** to pay. The entry
  point is a hand-off, not a destination: no page of ours stands between the
  scan/click and the payment unless something genuinely cannot be obtained
  through Vipps.
- It must nevertheless be an address the product controls: what a supporter
  pays is a fresh transaction at the current [annual fee](annual-fee.md), so a
  printed code cannot carry the payment itself — the stable entry point in the
  middle is what makes direct-to-Vipps possible without reprinting.

## Relationships
- Belongs to one [organization](organization.md).
- Is where [joining as a supporting member](../use-cases/join-as-supporting-member.md)
  begins.
- Is what the [QR code card](../use-cases/promote-with-qr-card.md) encodes.
- The [organization landing page](org-landing-page.md) links to it as its call
  to action. The landing page is a separate, parallel surface — the entry
  point itself still hands off directly to payment, never via the landing
  page.

## Referenced by
- [Use case: Set up a supporting membership](../use-cases/set-up-supporting-membership.md)
- [Use case: Join as a supporting member](../use-cases/join-as-supporting-member.md)
- [Use case: Promote membership with a QR code card](../use-cases/promote-with-qr-card.md)
