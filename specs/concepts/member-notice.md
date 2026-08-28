# Concept: Member notice

**Status:** Draft

## Definition
A **member notice** is a message the product sends to a
[supporting member](supporting-member.md) about their own membership, on behalf
of the [organization](organization.md) they support. It is sent by the product
itself — not written by an administrator in the moment — because something
happened that the member is owed word of.

A notice is the **only** email the product sends to a member. The product
deliberately does not carry the organization's own messages (a thank-you,
news, an invitation — see the retired
[keeping supporters in the loop](../use-cases/keep-supporters-in-the-loop.md));
those are the organization's to send through its own channels. A notice is the
product keeping the membership honest, and there is nothing to decline.

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
  that was taken (the [payment receipt](payment-receipt.md)), a payment that
  failed. Never because the organization has something to say.
- **A necessary notice cannot be declined.** A member who wants no more
  notices ends the membership instead — which is always offered in the same
  breath.
- A notice is **attributable to the organization** the member supports: it
  carries that organization's name. The member decided to support *them*, not
  us.
- A notice is **sent from an unread noreply address** — the product carries the
  message, it does not converse. Every notice therefore tells the member where
  questions belong: the organization's own contact address, named in the
  notice itself (or, for an organization without one, the organization
  directly). A reply still reaches the organization, never the product, when
  the organization has an address.
- The product sends a notice **once per thing worth knowing**. Repeating a
  change the member has already been told about is noise, and noise is how a
  notice stops being read.
- **Every notice sent is recorded** — to which member, about what, saying which
  amount, and when. The record is what lets a later payment prove it was not a
  surprise.
- A notice states what is happening, when it takes effect, and how to stop it.
  A notice with nothing the member can do about it is a nuisance. The one
  exception is the [payment receipt](payment-receipt.md), whose point is
  documentation rather than action — it still carries the way out of the
  membership, which is the only act left after money has moved.
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

## Referenced by
- [Use case: Change the annual fee](../use-cases/change-the-annual-fee.md)
- [Use case: Renew annual membership](../use-cases/renew-annual-membership.md)
- [Concept: Payment receipt](payment-receipt.md) — the notice kind that
  documents a captured payment
