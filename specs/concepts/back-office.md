# Concept: Back office

**Status:** Draft

## Definition
The **back office** is the signed-in surface an [administrator](administrator.md)
works in on behalf of one [organization](organization.md). It is deliberately
small: an organization is **four places**, and everything the product lets an
administrator do sits in one of them.

| Place | What it is for |
|-------|----------------|
| **Oversikt** | The front page: what the organization offers, and the addresses it shares |
| **Medlemmer** | The [member list](../use-cases/curate-member-list.md), one member at a time, and writing to them |
| **Medlemskap** | The [membership](membership-tier.md) offer supporters are shown |
| **Innstillinger** | The organization's own details — profile, visual identity, and its [Vipps API keys](vipps-api-keys.md) |

They are presented in that order, and **settings comes last**: it is where an
administrator goes when something has to be changed, not where the recurring
work is.

## Why it exists
An administrator is a volunteer who comes back a few times a year. What they
need is to find the thing they came for immediately and to see, without
hunting, whether anything needs their attention. Naming the four places once —
and showing all four on every screen — means the back office can be learned in
one visit and never has to be re-learned.

## Rules & invariants
- **Every screen shows all four places**, with the one you are in marked. They
  are ordinary addresses: each can be linked to, bookmarked, opened in a new
  window and reloaded, and moving between them is a page of its own — nothing
  here is a widget that only works while you keep the tab open.
- **All four stay visible even on the narrowest screen.** Each place has a
  symbol as well as a name: where there is room both are shown, and where there
  is not, the symbols carry the row — together with any number a place is
  wearing, which is the part worth seeing at a glance. The four are never
  collapsed behind a menu, and never pushed off the edge into a row that has to
  be scrolled to discover them. Their names remain available to anyone whose
  reading is not visual.
- Screens that belong to a place live **under** it: the Vipps keys belong to
  Innstillinger, a single member and writing to the members belong to
  Medlemmer, and a membership's form belongs to Medlemskap. Being deeper in
  never loses the four places.
- **Every such subpage offers the way back at both ends** — at the top, where
  someone who opened the wrong thing looks first, and at the bottom, where
  someone who read to the end arrives. Both are the same: a back arrow and the
  name of the place they return to, so what they do is clear before it is read.
  This holds for every subpage there is or will be; a screen deep in the back
  office is never a place you have to find your own way out of.
- **The front page leads with the offer.** The first thing an administrator
  sees is what the organization is actually offering: its
  [memberships](membership-tier.md), shown as the very same membership cards a
  supporter is shown (the one-presentation rule) — so the answer to "what do we
  ask for, and for how much" needs no navigation. After it, the addresses the
  organization shares: the [join page](join-page.md), its sales terms and its
  [QR code card](../use-cases/promote-with-qr-card.md).
- **The front page repeats nothing that a place already shows.** The members
  are not a section of their own here — the member list is one click away and
  says everything the front page could. **How many supporting members are
  current is instead carried on the member tab itself**, as a quiet number
  beside its name: the product's one standing figure, visible from every screen
  rather than only from the front page. It is information, not a warning, and
  it is shown only once there is somebody to count.
- **The front page does not edit anything, and does not send you anywhere
  either.** The memberships are shown, not introduced and not followed by a way
  in: the place that owns them is a tab away on every screen, so a button
  repeating that would only be a second door beside the first. Anything not yet
  in order is shown here too (see below), and those *do* carry the one action
  that fixes them — a warning is worth a door, an ordinary section is not.
- **What is not in order is stated in full on the front page**, each with the
  one action that fixes it — and as a **count on the place that fixes it**, so
  an administrator deep in another screen still sees that something is waiting.
  A place with nothing wrong carries no badge, and an organization in order
  shows none at all. A warning count and the standing member count are told
  apart at a glance — one asks for attention, the other only informs.
- **A count is never the only thing said.** The badge is a summons, not the
  message: **the place it points at states the same warnings in full**, in the
  same words and with the same action, at the top of its own screen. Following
  a number must never leave the administrator looking around a screen for what
  it meant. Screens *under* a place do not repeat them — they are already the
  work of putting something right — and a form that is open to fix a warning
  sets it aside until it closes again.
- **The back office uses the space the display gives it.** It must work on the
  narrowest phone — that is where an administrator usually is — but a larger
  screen is not wasted on a phone-shaped column: the same screens spread into
  the room they are given. No screen requires a wide display, and no screen
  requires a narrow one.
- **Who you are signed in as sits above the organization, not beside it.** The
  account — the person, switching organization, signing out — is a quiet line
  at the very top of every screen; below it, with room to breathe, comes the
  organization's own name, which is what the page is actually about.
- Editable information follows [Presenting and editing](presenting-and-editing.md):
  presented by default, changed only when asked.
- The back office is **not public** — it is exempt from
  [brand attribution](brand-attribution.md).

## Relationships
- Reached through [Access the back office](../use-cases/access-the-back-office.md);
  the administrator can switch [organization](organization.md) or sign out from
  anywhere in it.
- Holds the surfaces described by
  [Set up a supporting membership](../use-cases/set-up-supporting-membership.md),
  [Curate the member list](../use-cases/curate-member-list.md) and
  [Export the member list](../use-cases/export-member-list.md).

## Referenced by
- [Use case: Access the back office](../use-cases/access-the-back-office.md)
- [Concept: Presenting and editing](presenting-and-editing.md)
