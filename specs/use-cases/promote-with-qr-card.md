# Use case: Promote membership with a QR code card

**Status:** Draft
**Solves:** [Problem: Collecting annual support is manual and leaky](../problems/collecting-annual-support.md)

## Goal
An organization turns its [join page](../concepts/join-page.md)
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
   become a supporting member, a QR code, and a subtle
   [brand attribution](../concepts/brand-attribution.md) ("støttemedlem.no")
   at the bottom. (For now the card carries just the QR code and this framing;
   richer content may come later.) The name on the card is the
   [organization's](../concepts/organization.md) own, as it is registered here:
   it is printed and hung on a wall, so it is never guessed from the address
   and never something a stranger can put there. An address naming no
   organization we hold gets no card at all, the way it gets no
   [join page](../concepts/join-page.md): a card whose code leads nowhere is
   worse than no card.
2. The card is **drawn in the product's own hand, and in no colour of its
   own**. It is set in the brand's one typeface, the same Fraunces the website
   and the [member card](../concepts/member-card.md) use, so an organization
   that prints it recognizes it as the thing it signed up for; and it is white,
   ink, and the red [heart](../concepts/brand-mark.md), and nothing else
   ([brand palette](../concepts/brand-palette.md)). The line over the
   organization's name was the product's green until 2026-09-10: this card
   exists to present ONE organization and hand a stranger a way in, and the
   product's own colour was a third voice on it. The heart at the bottom is the only colour left, and it
   is drawn rather than typed, because the card is printed and rasterized where
   no emoji font exists. The typeface travels inside the card for the same
   reason: it is looked at as a picture, on a wall or on somebody else's
   website, where nothing can be fetched.
3. The QR code encodes the organization's
   [join page](../concepts/join-page.md): scanning it with a phone
   opens **Vipps directly** — the supporter lands in the payment for that
   organization's [join flow](join-as-supporting-member.md) with no page in
   between, no typing, no searching.
4. The **back office shows the card itself** on the organization's front page,
   beside the public addresses it belongs with. The card is a thing an
   organization prints and hangs up, and an address on its own says nothing
   about what will come out of the printer, so the administrator sees the very
   picture the product serves.
5. The administrator can **download** the card, and the QR code alone, as image
   files suitable for both print and web, from where the card is shown. Both
   are offered because they are different jobs: the whole card is what gets
   printed and hung up, and the plain code is what goes into a poster, a
   newsletter or a programme the organization lays out itself.
6. An external website (typically the organization's own site) can **embed** the
   card by referencing a stable image address — no code beyond a copy-paste
   snippet. Because the address is stable and the card is generated fresh on
   request, embedded cards stay current without the website doing anything.
   The card's address sits **beneath the organization's
   [join page](../concepts/join-page.md)**, on the same public origin: it is an
   address a person reads, pastes into a website and puts on printed material,
   so it belongs with the page it points at rather than off in a technical
   corner of its own. The address the back office shows an administrator is the
   address that answers, with no session, from anywhere. Like the page's own
   address, it may move only if the former one keeps leading to it.
7. The **marketing front page** showcases this: it shows a live preview of a
   ready-made card so a prospective organization sees what it gets before signing
   up. The preview is illustrative — its QR code points back at the marketing
   site itself — and carries no download or embed tooling; those belong to the
   organization's real card once it has signed up.

## Acceptance criteria
- [ ] Every organization with a join page can get its QR code card
      without any extra setup.
- [ ] Scanning the QR code on a phone lands the supporter directly in Vipps,
      paying that organization's annual fee — with no intermediate page of ours.
- [ ] The organization sees its own card in the back office, without asking for
      it and without opening an address to find out what it looks like.
- [ ] The card and the plain QR code can be downloaded as images usable in print
      and on the web, from where the card is shown.
- [ ] The card carries the organization's own name, and an address that names no
      organization produces no card.
- [ ] The card carries no colour but the heart, and reads in the product's own
      typeface wherever it is shown: in the back office, embedded on a club's
      website, and on paper.
- [ ] A copy-paste snippet lets an external website embed the card; the embedded
      card keeps working and stays current without re-embedding.
- [ ] The card address the back office shows an administrator serves the card
      on every environment, production included.
- [ ] The marketing front page shows a preview of the card so prospective
      organizations can see what they get before signing up.

## Out of scope
- Customizing the card's look (colors, logos, layout) beyond the organization's
  name.
- Cards for anything other than the join page (e.g. renewal-specific or
  campaign-specific codes).
- Tracking/analytics on scans and embeds.

## Related
- [Concept: Join page](../concepts/join-page.md)
- [Concept: Organization](../concepts/organization.md)
- [Concept: Back office](../concepts/back-office.md) - where the card is shown
- [Concept: Brand palette](../concepts/brand-palette.md) - the card is the
  palette minus the green
- [Concept: Brand mark](../concepts/brand-mark.md) - the heart on it is drawn,
  not typed
- [Use case: Set up a supporting membership](set-up-supporting-membership.md)
- [Use case: Join as a supporting member](join-as-supporting-member.md)
- [Use case: Earn hearts and recruit new members](earn-hearts-and-recruit.md) —
  the *member's* personal referral QR code; this card is the *organization's*
  own, unattributed QR code. Same scan-to-join behaviour, different owner.
