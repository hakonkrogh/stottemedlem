# Concept: Member number

**Status:** Draft

## Definition
A **member number** is the place a [supporting member](supporting-member.md)
holds in the order people started backing their
[organization](organization.md): the first supporter is number 1, the second
number 2, and so on. It is handed out once, when their first payment lands, and
it never changes again.

## Why it exists
Everything else the product says about a member moves. Hearts accumulate, the
validity turns over every year, the standing flips between active and lapsed.
None of it says *how early you were*, and that is the one thing about a
supporting membership that can never be taken and never be caught up with.
Number 7 of a marching band is number 7 forever, and it is worth something
precisely because nobody else can become it.

It also gives the organization and the member a short, stable way to refer to a
membership out loud ("I'm number 12"), which a name, an email address or a
payment reference all fail at in their own way.

## Rules & invariants
- **It counts within one organization.** A supporter is number 7 *of this
  band*, not the seventh person to use the product. Somebody who backs two
  organizations holds a number in each, and they are unrelated.
- **It is earned by paying.** The number is handed out when the member's first
  payment is captured, at the same moment their first
  [membership](membership.md) period begins. A supporter who approved an
  arrangement whose payment then failed has no number: they never became a
  member, and the numbers count members.
- **It is assigned once and never re-assigned.** Not when the member cancels,
  not when their membership lapses, not when a payment is refunded, and not
  when their [personal data is erased](../use-cases/erase-member-data.md).
  The record of support outlives the person's details, and it keeps the place
  it earned. A number that has been given out is never given to anyone else,
  so two people can never both claim to be number 7.
- **Resuming keeps the old number.** Someone who stops and later comes back is
  the same member coming back, and they return to the number they already had.
  That is the whole promise. Only a person the product genuinely meets for
  the first time (including an erased member who joins again, who is a new
  member by then) takes the next number.
- **The next number is one past the highest ever handed out**, not one past the
  count of current members. Members leaving does not renumber anybody, and it
  does not free their number for the next arrival.
- **It is not a secret.** The number reveals nothing but an ordinal, so it sits
  on the [member card](member-card.md), which is made to be shown to
  strangers. It grants nothing: it is not an address, and holding somebody
  else's number does nothing at all.
- **The organization sees it on its own list**, on each member's own page and
  in the [export](../use-cases/export-member-list.md), and can look a member up
  by it: the point of a short spoken identifier is being able to act on it
  when a member quotes it.
- **A member from before numbers existed still has one.** Every member who had
  already paid when the number was introduced was given theirs in the order
  they first paid, so the organization's earliest supporters hold its lowest
  numbers rather than the product starting its count at whoever paid next.

## Relationships
- Belongs to one [supporting member](supporting-member.md), within one
  [organization](organization.md).
- Handed out with their first [membership](membership.md) period.
- Shown on the [member card](member-card.md) and the
  [member self-service page](member-self-service.md).
- Unlike the [scorecard](scorecard.md), which moves as the member supports and
  recruits, the number is the one fact about a membership that is fixed.

## Referenced by
- [Concept: Supporting member](supporting-member.md)
- [Concept: Member card](member-card.md)
- [Use case: Curate the member list](../use-cases/curate-member-list.md)
- [Use case: Export the member list](../use-cases/export-member-list.md)
