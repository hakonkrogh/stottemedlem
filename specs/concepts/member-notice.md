# Concept: Member notice

**Status:** Draft

## Definition
A **member notice** is a message the product sends to a
[supporting member](supporting-member.md) about their own membership, on behalf
of the [organization](organization.md) they support. It is sent by the product
itself — not written by an administrator in the moment — because something
happened that the member is owed word of.

A notice is not the same as the organization's own messages to its supporters
(a thank-you, news, an invitation). Those are
[keeping supporters in the loop](../use-cases/keep-supporters-in-the-loop.md):
the organization decides whether to send them, and a member can decline them.
A notice is the product keeping the membership honest, and there is nothing to
decline.

## Why it exists
The product takes money from people once a year without asking again. That is
only fair if the product tells them what is about to happen while they can
still act on it. The payment app announces an *amount*; it cannot explain a
*change*, and it cannot reach someone whose arrangement has already ended. What
the payment provider will not say, the product must.

Recording what was said also matters as much as saying it: the product has to
be able to answer "was this member told, and when?" — because that answer
decides what they may be charged.

## Rules & invariants
- A notice is sent **because of an event in the member's own membership** — a
  changed [annual fee](annual-fee.md), a payment about to be taken, a payment
  that failed. Never because the organization has something to say.
- **A necessary notice cannot be declined.** Opting out of an organization's
  messages never opts a member out of being told what they will be charged.
  A member who wants no more notices ends the membership instead — which is
  always offered in the same breath.
- A notice is **attributable to the organization** the member supports: it
  carries that organization's name, and a reply reaches the organization, not
  the product. The member decided to support *them*, not us.
- The product sends a notice **once per thing worth knowing**. Repeating a
  change the member has already been told about is noise, and noise is how a
  notice stops being read.
- **Every notice sent is recorded** — to which member, about what, saying which
  amount, and when. The record is what lets a later payment prove it was not a
  surprise.
- A notice states what is happening, when it takes effect, and how to stop it.
  A notice with nothing the member can do about it is a nuisance.
- It carries the same [brand attribution](brand-attribution.md) as every other
  member-facing surface.
- A member with no contact details cannot be told. The product does not treat
  this as success: an organization is shown who it could not reach, because a
  price change nobody could be told about is the organization's problem to
  solve, not something to hide.

## Relationships
- Sent to one [supporting member](supporting-member.md), about their
  [membership](membership.md).
- Sent on behalf of one [organization](organization.md).
- Is the mechanism behind the notice promised by
  [changing the annual fee](../use-cases/change-the-annual-fee.md) and
  [renewal](../use-cases/renew-annual-membership.md).
- Is deliberately *not* the same thing as
  [keeping supporters in the loop](../use-cases/keep-supporters-in-the-loop.md).

## Referenced by
- [Use case: Change the annual fee](../use-cases/change-the-annual-fee.md)
- [Use case: Renew annual membership](../use-cases/renew-annual-membership.md)
- [Use case: Keep supporting members in the loop](../use-cases/keep-supporters-in-the-loop.md)
