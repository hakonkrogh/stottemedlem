# Use case: Earn hearts and recruit new members

**Status:** Draft
**Solves:** [Problem: Loyalty is invisible and word of mouth goes untracked](../problems/invisible-loyalty-and-word-of-mouth.md)

## Goal
A supporting member sees their loyalty recognized as hearts, can prove and show
off their support, and recruits new members with a referral credited back to
them.

## Actors
- **Supporting member** (views scorecard, prints proof, recruits).
- **Prospective member** (scans the QR code and joins).
- **Organization** (benefits from recruits; can see and thank loyal members and
  recruiters).

## Preconditions
- The person is a supporting member of the organization (at least one annual
  period supported).

## Behaviour
From the supporting member's point of view:

1. The member sees their [scorecard](../concepts/scorecard.md): one heart per
   year they have supported this organization, and how many supporting members
   they have recruited.
2. It reaches them as a [member card](../concepts/member-card.md) — showing who
   they are, which organization they back, its logo, their hearts, and a QR
   code — and the card follows them: it leads their
   [self-service page](../concepts/member-self-service.md), it rides along with
   every [receipt](../concepts/payment-receipt.md) they are sent, and it has a
   public address of its own.
3. The member can **share** that address with anyone — in a chat, in a social
   feed — and what appears is the card itself. The card itself carries the way
   to do it: one action on the card hands the address to whatever the member's
   device uses for sharing. They can also save the card as a picture to print
   or hand over.
4. Anyone who scans the QR code lands in the organization's join flow with a
   referral pointing back to that member.
5. When a referred person completes joining (becomes a paying supporting
   member), the referring member's recruit count goes up by one, and it shows
   on their card.

From the organization's point of view:

- The member list shows each member's hearts and recruit count, so loyalty and
  recruiting can be seen and thanked.

## Acceptance criteria
- [x] Hearts equal the number of annual periods the member has supported this
      organization — derived from membership history, never set by hand.
- [x] The card carries a scannable QR code that opens this organization's join
      flow with the member's referral attached.
- [x] A completed referred join increments exactly one member's recruit count;
      an abandoned scan increments nothing.
- [x] The member can see their own hearts and recruit count at any time — on
      their own page, on their card, and in every receipt.
- [x] The card has a public address the member can share, and sharing it shows
      the card rather than a bare link.
- [x] The member list shows each member's hearts and recruit count, so the
      organization can see and thank both.

## Out of scope
- Rewards, discounts, or tier changes tied to hearts or recruits — recognition
  only, for now.
- Per-network "share to Facebook/Instagram" buttons; the product hands the
  card's address to the device's own sharing and lets the member choose where
  it goes.
- Cross-organization aggregation of hearts.
- Telling a member *who* they recruited — the count is the recognition, and
  naming the recruits would expose other members' memberships.

## Related
- [Concept: Member card](../concepts/member-card.md) — the object the scorecard
  is shown and shared as.
- [Concept: Scorecard](../concepts/scorecard.md)
- [Concept: Supporting member](../concepts/supporting-member.md)
- [Use case: Join as a supporting member](join-as-supporting-member.md) — the
  flow a scanned QR code leads into, carrying the referral.
