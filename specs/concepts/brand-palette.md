# Concept: Brand palette

**Status:** Active

## Definition
The product's colours, and what each one is allowed to mean. There are four:
a warm **cream** ground with a warm, near-black **ink** for text; one **moss
green** for everything a person can act on or has been told went right; the
**red** of the [heart](brand-mark.md); and a dark brick red for the one or two
actions that move money back or erase someone. Nothing else carries meaning.

## Why it exists
The product borrows its warmth from paper: the cream page, the torn receipt,
the card. Before this palette settled (2026-09-04) the product also had an
amber call to action, a gold label on the card and a green validity year, so
three warm colours competed with the heart, and the green belonged nowhere.
Giving each colour exactly one job makes the heart the only red thing a person
ever sees, and makes "the green thing" always mean *go* or *good*: the button
that joins, the confirmation that a payment went through. The card kept a
green validity year a little longer than the rest of that clean-up, and lost
it too, for the reason below.

## Rules & invariants
- **Red belongs to the heart.** The brand mark, the streak on the card, the
  hearts in a member list. No button, label, link or highlight is red.
- **One action colour, and it is moss green.** Primary buttons, links that do
  something, the focused field, the selected tier, the small role label on the
  receipt. It is the same green that says a payment succeeded or a membership
  is active, on purpose: acting and succeeding are the same colour.
- **The green stops at the cards.** Both of them: the
  [member card](member-card.md) and the organization's
  [QR card](../use-cases/promote-with-qr-card.md) are white, ink and the
  heart's red, and nothing else. Everywhere else the product is talking to
  someone, so its own colour belongs there; a card is the one kind of surface
  that presents other parties (a member and the organization they back, or an
  organization holding a way in open to a stranger), and a third voice on it
  is one too many. The member card carried a moss rule and a moss valid year
  for a while, the QR card a moss line over the organization's name; all of it
  is ink now.
- **A card is set in the brand's one typeface, and carries it.** Both cards
  are Fraunces, the same cut the website's headings use, so what a person is
  handed on paper reads as what they saw on the screen. Because a card is
  looked at as a picture, where no webfont loads, the face rides inside the
  drawing rather than being asked for by name. And the words never wait on the
  face: a picture is drawn once, so a card drawn before its typeface is ready
  is set in the nearest serif at hand and becomes Fraunces once the face is
  there. Words in the wrong serif for a moment, never a card with no words on
  it.
- **A card's heart is drawn, not typed.** A card is rasterized and printed
  with no colour-emoji font in reach, so the "❤️" the
  [brand mark](brand-mark.md) is elsewhere is a red shape here. Same mark,
  same red, on a surface that cannot spell it.
- **A notice is neither green nor red.** Something the organization should
  know or put right (Vipps not yet connected, a price change some members did
  not hear about, a member whose details were erased) is stated in ink on the
  cream ground with a hairline edge. Green would say it went right, red would
  say it failed; a notice says neither, it only asks for attention.
- **Danger is not the heart's red.** Refunding and erasing use a dark brick
  red that reads as a warning, clearly darker and duller than the heart, so a
  red heart never looks like a red button and a red button never looks like a
  heart.
- **Cream and ink are the ground, everywhere.** Public pages, the back office
  and the emails share the same warm off-white and warm near-black, so a
  person who joined on a phone recognizes the receipt and the card as the
  same product. Objects lying on that ground, the member card and the
  receipt slip, are white with a hairline edge, so they lift off the cream
  instead of dissolving into it.
- **The organization's own colours come first.** The palette is deliberately
  quiet so any club's logo and name sit on top of it; the product's green
  never competes with a club's red or yellow.
- **Vipps is named, not coloured.** The join button says "med Vipps" in the
  product's green. Vipps' own orange appears only where Vipps itself draws it.
- **The public site is the same palette on a dark ground.** The landing page
  opens on photographs over near-black; the button on it is the same moss, and
  the small chips beside it are pale cream rather than any second accent.

## Relationships
- The [brand mark](brand-mark.md) is the one red in the palette.
- [Brand attribution](brand-attribution.md) uses the ink and muted text of this
  palette, and the heart's red.
- The [member card](member-card.md) and the organization's
  [QR card](../use-cases/promote-with-qr-card.md) are drawn from this palette,
  minus the green: white on the cream page, ink, and the red heart.
- The [payment receipt](payment-receipt.md) and the [join page](join-page.md)
  are the two places a member meets the palette first.

## Referenced by
- [Concept: Brand mark](brand-mark.md)
- [Concept: Member card](member-card.md)
- [Use case: Promote membership with a QR code card](../use-cases/promote-with-qr-card.md)
