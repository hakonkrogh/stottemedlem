# Concept: Member data

**Status:** Draft

## Definition
**Member data** is everything the product holds about a
[supporting member](supporting-member.md) as a person: their name, e-mail
address and phone number, and their postal address unless the organization
has chosen not to ask for it. It is deliberately the smallest set that
lets an organization keep a list and reach the people on it — and it is
separate from what they *paid*, which is the [membership](membership.md) and
its money, and which outlives the person in the record.

The distinction matters because the two are governed differently. The person is
kept only as long as there is a reason to keep them. The money is kept because
the organization's books require it.

## Why it exists
An organization that keeps a register of people takes on a duty towards them.
The product is what actually holds that register, so the duty is the product's
to make easy: telling supporters what is collected before it is collected,
collecting no more than the job needs, and letting the data go again — on
request, and by itself once the reason to hold it has passed.

Left implicit, "how much do we collect" drifts field by field, each one
individually reasonable. Naming the set as a concept makes every addition a
decision instead.

## Rules & invariants

### What is collected
- The collected set is **name, e-mail address, phone number and postal
  address** — nothing else about the person. Adding any other field is a
  change to this spec first.
- It comes from the payment provider's profile, with the supporter's consent,
  **once, at the moment of joining**, and is never re-fetched — the provider
  only offers it for a short window after consent
  (see [supporting member](supporting-member.md)).
- **The postal address is asked for by default, and the organization can
  opt out.** Every organization gets a printed [member card](member-card.md)
  to hand out or post, so the address has a use from the first day, and the
  supporter is told what that use is: a standard reason, which the
  organization may replace with one in its own words. Whichever it is, it is
  shown to every supporter on the [join page](join-page.md) and in the privacy
  notice before they share anything. An organization that has opted out never
  receives an address, and its supporters are never asked for one
  ([collect postal addresses](../use-cases/collect-postal-addresses.md)).
- The address comes the same way as the other three: from the payment
  provider's profile, at joining, as a structured address (street, postal
  code, place, country), not as a line of text, and like them it is never
  fetched again. A member who joined before the product asked, or whose
  profile held no address, simply has none: the product does not go back for
  it and offers no button to. An administrator may type or correct one, as
  with any other detail.
- The product never asks for a national identity number or a date of birth,
  and never enriches a member from any other source.
- An administrator may correct any of these by hand; correcting them never
  touches payment history (see [curate the member list](../use-cases/curate-member-list.md)).

### Who is responsible
- The **organization** decides that it keeps a member register and what it is
  for. It is answerable for the register.
- The **product** holds and processes the register on the organization's
  behalf, for no purpose of its own. It never sells the register, and never
  discloses it to anyone but the organization it belongs to.
- That arrangement is written down and agreed rather than assumed: the
  [data processing agreement](data-processing-agreement.md), accepted by
  creating the organization.
- The **payment provider** is answerable for its own handling of the same
  person, separately, and the product says so rather than speaking for it.

### What the supporter is told, and when
- Before a supporter can start joining, the [join page](join-page.md) states
  plainly which details joining shares and what the organization does with
  them, and links a full privacy notice.
- The privacy notice is a **public page of its own**, in the organization's
  name, reachable without joining and without a login — the same standing as
  the sales terms. It states: who is answerable, what is collected, why, who
  can see it, how long it is kept, and how to have it erased.
- The notice is one standard text for every organization, with a single
  per-organization line: whether this organization asks for a postal address,
  and the reason shown for it. Everything else is the same for every supporter
  of every organization, so there is nothing else to configure — and nothing
  an administrator can get wrong.

### How long it is kept
- A member's details are kept while they are a member, and afterwards **for as
  long as the payment history that names them must be kept** — five years after
  the last supported period, following the organization's bookkeeping duty.
- The year after that, they are erased **automatically**, without anyone
  remembering to. A retention promise that depends on someone acting is not a
  retention rule.
- The payment history itself is never deleted: a year the organization has
  already counted and reported must not change because a person left.

### Erasure
- Erasing a member removes the **person**, not the record: name, contact
  details, postal address, the payment provider's identifier for them, and
  every personal address they hold (their own membership page, their member
  card) all go. What each period cost and when it was paid stays.
- Erasure is available to the member themselves and to the organization, and is
  the same operation either way (see
  [erase a member's personal data](../use-cases/erase-member-data.md)).
- An erased member cannot be erased again, cannot be corrected, and is shown as
  erased rather than as an unnamed row — a register that looks broken invites
  someone to "fix" it.
- A supporter who returns after erasure is met as a **new** member. The product
  no longer holds anything that could recognize them, and that is the point.
  Their [hearts](scorecard.md) start over: that is what erasure costs, and it
  is theirs to choose.

## Researched and deliberately not done

### More fields from the payment provider
The provider can also share a **postal address** and a **date of birth**, and
the question of pulling them was researched (2026-08-31). The reasons the
product did not, at first, are worth keeping, because they still shape how
the address is collected now that it is:

- **Nothing in the product needed them.** The job was a list and an annual
  fee. That changed when the product started laying out
  [member cards](../use-cases/print-member-cards.md) for organizations to
  post to their members (2026-09-22): a stack of cards with nowhere to send
  them is the real need the earlier research said to wait for, and it is a
  need every organization has from the day it exists, which is why the
  address is asked for by default rather than switched on one organization
  at a time. The research's other prescription stands: the reason is always
  stated to the supporter, and an organization that has nothing to post can
  opt out.
- **Consent is all-or-nothing.** The provider's consent screen cannot be
  answered field by field: a supporter accepts every requested detail or none.
  Asking for an address therefore makes sharing an address a *condition of
  joining*. The product accepts that trade for the sake of a card that can be
  posted, says so to the supporter, and leaves the organization the choice
  of not asking at all.
- **Asking does not mean receiving.** A supporter with no registered address
  yields an empty one, and a detail outside the organization's own agreement
  with the provider is dropped silently rather than reported. So the address
  is treated as sometimes-absent everywhere it is shown.
- A **date of birth** is still not collected: nothing in the product is
  priced by age. A national identity number is out of the question: Norwegian
  law allows it only where there is an objective need for certain
  identification, which a list of supporters is not.

## Relationships
- Governed by the [data processing agreement](data-processing-agreement.md)
  between the organization and the product.
- Describes the person behind a [supporting member](supporting-member.md).
- Distinct from the [membership](membership.md) and its payments, which survive
  the person.
- Told to the supporter through the [join page](join-page.md) and acted on
  through the [member self-service page](member-self-service.md).
- Erased through [erase a member's personal data](../use-cases/erase-member-data.md).
- The postal address is turned on through
  [collect postal addresses](../use-cases/collect-postal-addresses.md) and
  put to use by [print the member cards](../use-cases/print-member-cards.md).

## Referenced by
- [Use case: Join as a supporting member](../use-cases/join-as-supporting-member.md)
- [Use case: Erase a member's personal data](../use-cases/erase-member-data.md)
- [Use case: Curate the member list](../use-cases/curate-member-list.md)
- [Use case: Export the member list](../use-cases/export-member-list.md)
- [Use case: Collect postal addresses](../use-cases/collect-postal-addresses.md)
- [Concept: Supporting member](supporting-member.md)
