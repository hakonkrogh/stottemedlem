# Use case: Join as a supporting member

**Status:** Draft
**Solves:** [Problem: Collecting annual support is manual and leaky](../problems/collecting-annual-support.md)

## Goal
A person from the community becomes a supporting member of an organization by
paying its annual fee, in one simple flow.

## Actors
- **Supporter** — a member of the public who wants to back the organization.

## Preconditions
- The organization has [set up a supporting membership](set-up-supporting-membership.md)
  and shared its [join page](../concepts/join-page.md) (as a link
  or a [QR code card](promote-with-qr-card.md)).

## Behaviour
From the supporter's point of view:

1. The supporter opens the organization's
   [join page](../concepts/join-page.md) and lands directly in
   **Vipps**, seeing who they are supporting, the
   [membership tier](../concepts/membership-tier.md) they are joining (by
   name), and its [annual fee](../concepts/annual-fee.md). A join link or QR
   code may point at a specific tier; when the organization has several tiers
   and the address names none, the supporter chooses one first.
2. The minimum identity needed to be listed as a
   [supporting member](../concepts/supporting-member.md) (e.g. name and a contact
   such as email) comes from the supporter's Vipps profile, with their consent —
   the supporter only types it in themselves if Vipps cannot provide it.
3. The supporter approves the payment in Vipps. Joining mid-year costs only
   the remaining share of the [annual fee](../concepts/annual-fee.md) for the
   current [annual period](../concepts/annual-period.md); the supporter is told
   both what they pay now and what the membership costs per year afterwards.
   Approving also sets up the yearly continuation — the supporter agrees once,
   and [renewal](renew-annual-membership.md) then happens by itself until they
   end it.
4. On successful payment, the supporter becomes an **active** supporting member
   for the current [annual period](../concepts/annual-period.md), and this is
   reflected immediately in the organization's
   [member list](curate-member-list.md). Payment is what decides this: the
   supporter returning from Vipps is not by itself proof that anything was
   paid, and the product never treats it as such.
5. The supporter receives confirmation that they are now a supporting member and
   until when their support is valid. The confirmation presents the
   organization's identity the same way the [join page](../concepts/join-page.md)
   does — name and, when uploaded, the visual identity in the same banner-and-
   circled-logo arrangement — so the receipt visibly confirms *whom* the
   supporter now supports, not merely that a payment went through, and the two
   pages read as one place. The return address itself must identify
   which arrangement the supporter is coming back from — the payment provider
   appends nothing to it (learned 2026-08-27, when supporters bounced back to
   the join page instead of a receipt) — and the product reuses the same
   unguessable token that addresses the member's
   [own page](../concepts/member-self-service.md) for this.

## Acceptance criteria
- [ ] A supporter can complete joining and payment without the administrator
      doing anything in the moment.
- [ ] A successful payment creates an active [membership](../concepts/membership.md)
      of the chosen [tier](../concepts/membership-tier.md) for the current
      annual period, attributed to the named supporter.
- [ ] The supporter is told their membership is active and its valid-until date.
- [ ] A failed or abandoned payment does not create an active membership.
- [ ] A payment that succeeded creates the membership even if the product was
      never notified of it.

## Out of scope
- Gift/third-party memberships (paying on behalf of someone else).
- Anonymous support with no identity captured.

## Related
- [Concept: Supporting member](../concepts/supporting-member.md)
- [Concept: Membership](../concepts/membership.md)
- [Concept: Annual period](../concepts/annual-period.md)
- [Concept: Member self-service page](../concepts/member-self-service.md) — the
  member's own page, whose address every membership carries
- [Concept: Annual fee](../concepts/annual-fee.md)
- [Concept: Payment reconciliation](../concepts/payment-reconciliation.md) — the
  safety net when the payment succeeds but word of it never reaches us
- [Use case: Earn stars and recruit new members](earn-stars-and-recruit.md) — a
  join may arrive via a member's referral QR code; completing it credits that
  member's recruit count.
