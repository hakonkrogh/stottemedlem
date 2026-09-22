# Use case: Print the member cards

**Status:** Draft
**Solves:** [Problem: Loyalty is invisible and word of mouth goes untracked](../problems/invisible-loyalty-and-word-of-mouth.md)

## Goal
An organization prints every supporting member's [card](../concepts/member-card.md)
on paper, cuts the cards out and hands them over: a small thank-you that a
member can put in a wallet or on the fridge, and that carries the
organization's QR code into the homes of the people most likely to recruit
for it.

## Why this exists
The card already exists as a picture on a phone, but a thing on a phone is
not a thing you are given. An organization that wants to thank its members
at the end of the year wants something to put in an envelope, hand out at the
Christmas concert, or leave on the kitchen table. Making that stack one page
at a time from each member's own card address is not something anyone will
do for eighty members. So the product lays the whole register out as cards on
sheets, ready to print.

## Actors
- **Organization administrator** prints the sheets.

## Preconditions
- The organization has at least one [membership](../concepts/membership.md)
  paid for the chosen period.

## Behaviour
1. From the [member list](curate-member-list.md), the administrator opens the
   printout: every member of one [annual period](../concepts/annual-period.md),
   each as their own card, laid out on A4 sheets lying sideways, six to a
   sheet in three columns of two.
2. The period is the one running now unless the administrator chooses
   another, and any period the organization has ever been paid for can be
   chosen. The cards for a past period say what they said at the end of that
   period: valid for that period, the hearts collected by then, the recruits
   made by then. A stack of thank-you cards for last year can therefore be
   printed in January and still be last year's cards. Nothing new is stored
   for this: every card is read out of the periods already paid for.
3. Everyone who paid for the period gets a card, and nobody else: not a
   supporter whose payment never completed, and not a member whose details
   were erased ([erase a member's personal data](erase-member-data.md)).
   The cards come in name order, so a stack can be handed out from a list,
   with the members who gave no name at the end.
4. Each printed card **is** the member's card: the same drawing, with the
   same QR code, so a card scanned off a fridge credits the member exactly as
   a card scanned off a phone does ([earn hearts and recruit](earn-hearts-and-recruit.md)).
   Two things differ on paper only: the card casts no drawn shadow, because
   paper casts its own, and each card has cut marks in its corners, a little
   outside its edge, so cutting along them is cutting along the card.
5. A card is printed at the height of a bank card and a little wider than
   one, so it fits most wallets, reads on a fridge from across a kitchen,
   and its QR code scans.
6. **Under each card, in the margin that is cut away, stand the member's
   postal address and phone number**: the address as it goes on an envelope,
   street on one line, postal code and place on the next, with the phone
   number beside them. A card on its way into an envelope then has its
   address right there, and nobody has to look eighty members up one at a
   time in another window. It belongs to the sheet, not to the card: cutting
   along the marks leaves it on the paper that goes in the bin, so what the
   member receives is the card and only the card. Where a member has no
   address, the sheet says so in the same place, so the person stuffing
   envelopes learns it there and not from an empty spot. An organization that
   has opted out of addresses
   ([collect postal addresses](collect-postal-addresses.md)) gets no such
   note: the phone number, and an address only where one is still held from
   before.
7. What the page shows is exactly what the printer gets: the sheets, at
   their printed size, and nothing else. Printing, and saving as a PDF file,
   is the browser's own print dialog. The product makes no file of its own:
   the cards then print as drawings rather than as pictures of drawings, the
   product draws no second card to keep in step with the first, and a
   register of any size prints without the product doing the work of
   drawing every card itself.
8. The printout is available to administrators only, behind the same access
   as the rest of the back office.

## Acceptance criteria
- [ ] The member list offers the printout whenever at least one member has
      paid.
- [ ] Every member who paid for the chosen period appears exactly once, as
      their own card, and no one else appears.
- [ ] A past period can be chosen, and its cards say that period is the valid
      one and count only the hearts and recruits earned by then.
- [ ] The current period can always be chosen, even before anyone has paid
      for it, and then says so instead of showing an empty sheet.
- [ ] Six cards fill an A4 sheet lying sideways, each at a bank card's
      height, with cut marks outside every corner and no drawn shadow.
- [ ] Under every card stand that member's postal address and phone number,
      outside the cut marks, and a member without an address is marked as
      such there unless the organization has opted out of addresses.
- [ ] A card's QR code, printed and scanned, opens the organization's join
      page with that member's referral on it.
- [ ] The browser's print dialog prints the sheets and only the sheets: no
      heading, no buttons, no chrome.
- [ ] The printout is not reachable without back-office access to the
      organization.

## Out of scope
- Choosing members one by one, or printing one member's card: their card's
  own address already shows one card, and a sheet is for the whole register.
- Other paper sizes, other card sizes, or a card drawn differently for paper.
- Anything the organization writes on the card itself: the card is the
  member's, and it says what it says ([member card](../concepts/member-card.md)).
- The product mailing the cards, as paper or as a file.
- Address labels, or printing the address on anything the member keeps: the
  address is a help for the person doing the posting, and it goes in the bin
  with the margin.

## Related
- [Concept: Member card](../concepts/member-card.md): the thing being printed,
  and the rules for what it shows
- [Use case: Curate the member list](curate-member-list.md): where the
  printout is offered
- [Use case: Export the member list](export-member-list.md): the other way the
  register leaves the product
- [Use case: Collect postal addresses](collect-postal-addresses.md): where the
  addresses under the cards come from
- [Concept: Annual period](../concepts/annual-period.md): what a chosen period
  is
- [Concept: Scorecard](../concepts/scorecard.md): the hearts and recruits a
  past card counts up to its own period
