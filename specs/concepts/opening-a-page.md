# Concept: Opening a page

**Status:** Active

## Definition
Every page the product serves (the public [join page](join-page.md), the
[payment receipt](payment-receipt.md), a member's
[self-service page](member-self-service.md) and
[member card](member-card.md), and every screen in the
[back office](back-office.md)) opens the way the visitor's browser opens
pages, and then holds still. The product never moves the page for the reader on
arrival, and nothing that loads afterwards pushes what is already on screen out
from under them.

## Why it exists
A page that jumps is a page that cannot be trusted. Two things make it jump:
the product trying to place the reader itself, and content arriving late and
claiming space it had not asked for. The first was tried, at length: some phone
browsers hand over a page arriving from another app (an email link, the hand-back
from Vipps) with its top tucked under the system status bar, and every attempt to
detect and correct that cost more than it bought: it fought real readers'
own scrolling, and it went wrong in ways nobody could see from a desk. The
browser already has an answer for where a page opens, it is the same answer on
every site the visitor uses, and a page with room to breathe at both ends
survives the imperfect cases without any help.

## Rules & invariants
- **Where a page opens is the browser's business.** The product does not scroll
  the page on arrival, does not measure the viewport to compensate for browser
  chrome, and does not override the browser's own scrolling behaviour. Nothing
  ever fights the visitor's own scrolling.
- **Every page has generous air at the top and, especially, at the bottom.** No
  content sits against an edge, so a page whose top or bottom is partly obscured
  still reads, and the last line is never pinned to the fold.
- **Anything that loads late reserves its space first.** A picture whose shape
  is known (most of all the [member card](member-card.md), which is a drawn
  image on a page of text) occupies its full space from the first paint, so
  the text around it never shifts when the picture arrives.
- **The one exception is answering an action**: after a form is submitted, the
  answer is brought into view, because otherwise it would be missed at the
  bottom of a long page. That is a deliberate response to something the person
  just did, not a correction on arrival
  ([Answering an action](answering-an-action.md)).

## Relationships
- Applies to every public surface ([join page](join-page.md),
  [payment receipt](payment-receipt.md),
  [member self-service page](member-self-service.md)) and to the whole
  [back office](back-office.md).
- The [member card](member-card.md) is the picture this most concerns.
- The exception belongs to [Answering an action](answering-an-action.md).

## Referenced by
- [Concept: Join page](join-page.md)
- [Concept: Member card](member-card.md)
