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
2. **Before** they can start, the join page tells them what joining shares —
   name, e-mail address and phone number, and what the organization does with
   them — and links the organization's full privacy notice, which is public and
   readable without joining (see [member data](../concepts/member-data.md)).
   The payment app's own consent screen comes later and belongs to the payment
   provider; it is not where the organization explains itself.
3. That identity — the minimum needed to be listed as a
   [supporting member](../concepts/supporting-member.md), and no more than
   name, e-mail address and phone number — comes from the supporter's Vipps
   profile, with their consent; the supporter only types it in themselves if
   Vipps cannot provide it.
4. The supporter approves the payment in Vipps. Joining mid-year costs only
   the remaining share of the [annual fee](../concepts/annual-fee.md) for the
   current [annual period](../concepts/annual-period.md); the supporter is told
   both what they pay now and what the membership costs per year afterwards.
   Approving also sets up the yearly continuation — the supporter agrees once,
   and [renewal](renew-annual-membership.md) then happens by itself until they
   end it.
5. On successful payment, the supporter becomes an **active** supporting member
   for the current [annual period](../concepts/annual-period.md), and this is
   reflected immediately in the organization's
   [member list](curate-member-list.md). Payment is what decides this: the
   supporter returning from Vipps is not by itself proof that anything was
   paid, and the product never treats it as such.
6. The supporter receives confirmation that they are now a supporting member and
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
7. **Joining twice inside one period costs nothing extra.** A supporter may
   arrive on the join page already holding the current
   [annual period](../concepts/annual-period.md) — most often because they
   ended their arrangement and want it back, since a payment app cannot revive
   an arrangement once ended and joining again is the only way to resume
   [renewal](renew-annual-membership.md). Nothing stops them joining, and
   nothing can: who is joining is known only from the payment app's consent,
   which arrives *with* the payment and not before. So the product acts the
   moment it can — the payment for a period already paid for is given back at
   once, of its own accord, and the supporter is told on the confirmation page
   that they were already a member and that the money is on its way back. What
   they came for stands: the new arrangement carries their renewal onward. If
   they already had one still running, that one continues instead and the new
   one is ended, because two live arrangements for one supporter is next
   period's double payment already promised.
8. The confirmation is also a **[payment receipt](../concepts/payment-receipt.md)**:
   once the payment is confirmed, the page shows the documentation Norwegian
   bookkeeping rules ask of a membership-fee payment (bokføringsforskriften
   § 5-1-6b, jf. § 5-1-1 nr. 2–5 — the parties, what was paid for, the period,
   the amount and its date), and the same receipt is emailed to the member —
   sent away from the page, which names the address it goes to rather than
   waiting for it. The email cannot be declined; a member with no address
   still has the page.

## Acceptance criteria
- [ ] A supporter can complete joining and payment without the administrator
      doing anything in the moment.
- [ ] A successful payment creates an active [membership](../concepts/membership.md)
      of the chosen [tier](../concepts/membership-tier.md) for the current
      annual period, attributed to the named supporter.
- [ ] The supporter is told their membership is active and its valid-until date.
- [ ] A confirmed payment yields a [receipt](../concepts/payment-receipt.md) —
      on the confirmation page, and by email when the member has an address.
- [ ] A failed or abandoned payment does not create an active membership.
- [ ] The join page states which details joining shares, and links a privacy
      notice readable without joining, before the supporter can start.
- [ ] A payment that succeeded creates the membership even if the product was
      never notified of it.
- [ ] A supporter is never left having paid twice for one annual period: a
      second payment for a period they already hold is returned without anyone
      asking, and the confirmation page says so.
- [ ] A supporter who ended their arrangement and joined again inside the same
      period ends up renewing again, having paid once.
- [ ] A supporter never ends up holding two arrangements that both renew.

## Out of scope
- Gift/third-party memberships (paying on behalf of someone else).
- Anonymous support with no identity captured.

## Related
- [Concept: Supporting member](../concepts/supporting-member.md)
- [Concept: Member data](../concepts/member-data.md) — what joining collects,
  what the supporter is told about it, and how long it is kept
- [Concept: Membership](../concepts/membership.md)
- [Concept: Annual period](../concepts/annual-period.md)
- [Concept: Member self-service page](../concepts/member-self-service.md) — the
  member's own page, whose address every membership carries
- [Concept: Annual fee](../concepts/annual-fee.md)
- [Concept: Payment receipt](../concepts/payment-receipt.md) — what the
  confirmation documents, and the email that carries the same thing
- [Concept: Payment reconciliation](../concepts/payment-reconciliation.md) — the
  safety net when the payment succeeds but word of it never reaches us
- [Use case: Earn hearts and recruit new members](earn-hearts-and-recruit.md) — a
  join may arrive via a member's referral QR code; completing it credits that
  member's recruit count.
