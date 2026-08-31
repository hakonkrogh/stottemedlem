# Concept: Member self-service page

**Status:** Draft

## Definition
The **member self-service page** is the [supporting member](supporting-member.md)'s
own page for the membership they hold: what they are paying, for which year,
and — above all — the place they can end it. Every membership carries the
address of its own page, and the member reaches it from their payment app.

## Why it exists
Someone who can start supporting an organization in thirty seconds must be able
to stop just as easily. That is both a plain fairness rule and a hard
requirement from the payment provider: a recurring agreement must point at a
page that offers *actual* management, not an explanation of whom to contact.

It also gives the member somewhere to check what they agreed to, without asking
the organization and without the organization having to answer.

## Rules & invariants
- The page belongs to **one membership** and shows only it. It never exposes
  anything about the organization's other members.
- **It leads with the member's [card](member-card.md)** — what they are comes
  before what they pay and how to stop it. The card's own address is offered
  here too, since this page is where a member comes looking for it.
- The card's address and this page's address are **different secrets** on
  purpose: this one can end the membership and must never be shared, while the
  card is made for sharing.
- It offers **ending the membership** as a real action, completed on the page.
  Ending it takes effect with the payment provider first; the product's record
  follows what the provider confirms.
- Ending is not the same as a refund: the period already paid for runs to its
  end, and the member stays on the organization's list for it. Only the
  continuation stops. Getting money back is a separate thing, and not the
  member's to perform — they ask, and the organization decides
  ([refund a payment](../use-cases/refund-a-payment.md)). The page therefore
  offers ending and never refunding.
- The member is not asked to create an account or a password. The address
  itself is what identifies them, so it must be **unguessable** and is only
  ever given to that member through their payment app.
- An address that does not match a membership reveals nothing — not even that
  some other membership exists.
- The page is not indexed by search engines, unlike the public
  [join page](join-page.md).
- It carries the same [brand attribution](brand-attribution.md) as every other
  public-facing surface.

## Open questions
- **Identifying a member who lost the address.** Today the address is the only
  key. Signing in with the payment provider's own identity (Vipps Login) would
  let a member reach their membership from anywhere — not yet decided.

## Relationships
- Belongs to one [membership](membership.md), held by one
  [supporting member](supporting-member.md).
- Is the counterpart of the [join page](join-page.md): one starts the
  relationship, the other ends it.
- Shows, and hands over the address of, the member's [card](member-card.md).

## Referenced by
- [Use case: Renew annual membership](../use-cases/renew-annual-membership.md)
- [Use case: Join as a supporting member](../use-cases/join-as-supporting-member.md)
