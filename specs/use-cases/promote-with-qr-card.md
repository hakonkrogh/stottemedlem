# Use case: Promote membership with a QR code card

**Status:** Draft
**Solves:** [Problem: Collecting annual support is manual and leaky](../problems/collecting-annual-support.md)

## Goal
An organization turns its [join entry point](../concepts/join-entry-point.md)
into something physical and visual — a QR code card it can print, hand out, and
put on external websites — so supporters standing in front of a poster or
browsing the organization's own site can join in seconds.

## Actors
- **Organization administrator** — obtains the card and puts it where the
  community will see it.
- **Supporter** — scans the code or clicks the embedded card.
- **Prospective organization** — sees on the marketing site what the card looks
  like before signing up.

## Behaviour
1. For any organization, the product produces a ready-made **QR code card**: a
   presentable card showing the organization's public name, an invitation to
   become a supporting member, and a QR code. (For now the card carries just the
   QR code and this framing; richer content may come later.)
2. The QR code encodes the organization's
   [join entry point](../concepts/join-entry-point.md): scanning it with a phone
   opens **Vipps directly** — the supporter lands in the payment for that
   organization's [join flow](join-as-supporting-member.md) with no page in
   between, no typing, no searching.
3. The administrator can **download** the card, and the QR code alone, as image
   files suitable for both print and web.
4. An external website (typically the organization's own site) can **embed** the
   card by referencing a stable image address — no code beyond a copy-paste
   snippet. Because the address is stable and the card is generated fresh on
   request, embedded cards stay current without the website doing anything.
5. The **marketing front page** showcases this: it shows a live preview of a
   ready-made card so a prospective organization sees what it gets before signing
   up. The preview is illustrative — its QR code points back at the marketing
   site itself — and carries no download or embed tooling; those belong to the
   organization's real card once it has signed up.

## Acceptance criteria
- [ ] Every organization with a join entry point can get its QR code card
      without any extra setup.
- [ ] Scanning the QR code on a phone lands the supporter directly in Vipps,
      paying that organization's annual fee — with no intermediate page of ours.
- [ ] The card and the plain QR code can be downloaded as images usable in print
      and on the web.
- [ ] A copy-paste snippet lets an external website embed the card; the embedded
      card keeps working and stays current without re-embedding.
- [ ] The marketing front page shows a preview of the card so prospective
      organizations can see what they get before signing up.

## Out of scope
- Customizing the card's look (colors, logos, layout) beyond the organization's
  name.
- Cards for anything other than the join entry point (e.g. renewal-specific or
  campaign-specific codes).
- Tracking/analytics on scans and embeds.

## Related
- [Concept: Join entry point](../concepts/join-entry-point.md)
- [Concept: Organization](../concepts/organization.md)
- [Use case: Set up a supporting membership](set-up-supporting-membership.md)
- [Use case: Join as a supporting member](join-as-supporting-member.md)
- [Use case: Earn stars and recruit new members](earn-stars-and-recruit.md) —
  the *member's* personal referral QR code; this card is the *organization's*
  own, unattributed QR code. Same scan-to-join behaviour, different owner.
