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
- **It is the card, then the paperwork.** Under the page's own title comes the
  member's [card](member-card.md), and only then what they pay and how to stop
  it — what they are before what it costs. The card is the largest thing on
  the page and is given the full width of the screen where the screen is
  narrow.
- **The page never explains its own card.** What the card already says — the
  hearts collected, the period it is good for, the organization it is for — is
  not repeated as prose underneath it. A page that captions its own
  illustration is longer without saying more.
- **Sharing the card is offered on the card**, not as a section further down:
  the thing being shared is right there, so the action belongs on it. The
  member's device decides what sharing means — its own share sheet where it
  has one, otherwise the address on the clipboard — and with no scripting at
  all the action still leads to the card.
- The card's address and this page's address are **different secrets** on
  purpose: this one can end the membership and must never be shared, while the
  card is made for sharing. Only the card's address is ever offered for
  sharing here.
- **Whether the membership continues is stated directly under the card**,
  alongside what is paid and for which period, in one line — before anything
  else that could be mistaken for an ordinary running membership. Checking
  exactly that is why a member opens this page. The same is true whichever way
  they cancelled: in the product, or directly in their payment app
  ([membership](membership.md)).
- It offers **ending the membership** as a real action, completed on the page.
  Ending it takes effect with the payment provider first; the product's record
  follows what the provider confirms.
- **"You will not be charged again" is a promise about the member's money, not
  about one arrangement.** A supporter who stops and joins again holds a
  stopped arrangement and a live one at the same time, so the page never says
  the payments have ended while another arrangement of theirs still runs — it
  says this one has ended, and that the other continues. Being told the money
  stopped when it has not is the one wrong thing this page could say.
- **It offers the way back, too.** Once ended, the page offers picking the
  membership up again — as plainly as it offered ending it, and next to the
  sentence saying it has ended. Changing your mind is an ordinary thing to do,
  and a member who has to find the join page again to do it is being told the
  door only swings one way.
- **Resuming here costs nothing while the period is already paid for.** This
  is the one place the product knows *who* is asking before the payment app
  does, so it is the one place a resumed arrangement can ask for nothing and
  simply start renewing again at the next period. (From the public
  [join page](join-page.md) the same person is anonymous until they have paid,
  which is why a second payment there is taken and then given back —
  [joining](../use-cases/join-as-supporting-member.md).) A **lapsed** member
  resuming is joining like anyone else, and pays for this period; the page
  says which of the two it is, with the amount, before the button is pressed.
- The way back is **not offered where it would be untrue**: not while another
  arrangement of theirs already renews, and not into a
  [membership tier](membership-tier.md) the organization no longer offers —
  that member goes to the [join page](join-page.md), which shows what is
  actually on offer today.
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
