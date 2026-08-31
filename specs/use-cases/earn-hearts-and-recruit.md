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
2. The member can print a **proof of support**: a document showing who they
   are, their hearts, and a QR code.
3. Anyone who scans the QR code lands in the organization's join flow with a
   referral pointing back to that member.
4. When a referred person completes joining (becomes a paying supporting
   member), the referring member's recruit count goes up by one.

From the organization's point of view:

- The member list shows each member's hearts and recruit count, so loyalty and
  recruiting can be seen and thanked.

## Acceptance criteria
- [x] Hearts equal the number of annual periods the member has supported this
      organization — derived from membership history, never set by hand.
- [ ] The printed proof carries a scannable QR code that opens this
      organization's join flow with the member's referral attached.
- [ ] A completed referred join increments exactly one member's recruit count;
      an abandoned scan increments nothing.
- [ ] The member can see their own hearts and recruit count at any time.

## Out of scope
- Rewards, discounts, or tier changes tied to hearts or recruits — recognition
  only, for now.
- Referral links in other channels (social media, e-mail campaigns); the
  printable proof with QR is the referral surface for now.
- Cross-organization aggregation of hearts.

## Related
- [Concept: Scorecard](../concepts/scorecard.md)
- [Concept: Supporting member](../concepts/supporting-member.md)
- [Use case: Join as a supporting member](join-as-supporting-member.md) — the
  flow a scanned QR code leads into, carrying the referral.
