# Concept: Payment receipt

**Status:** Draft

## Definition
A **payment receipt** is the documentation of one captured membership payment:
who paid whom, for what, for which period, how much, and when. Every payment —
the first when [joining](../use-cases/join-as-supporting-member.md) and every
[renewal](../use-cases/renew-annual-membership.md) after it — produces exactly
one receipt, delivered in two forms that say the same thing:

- **The confirmation page** the supporter lands on after paying shows the
  receipt whenever the payment is confirmed.
- **A receipt email** — a [member notice](member-notice.md) of its own kind —
  is sent to the member's address.

## Why it exists
Some supporters keep track: a household budget, an association's books, an
employer reimbursing the fee. Norwegian bookkeeping law meets them halfway —
**bokføringsforskriften § 5-1-6b** lets a membership fee in an ideal
organization be documented with *betalingsdokumentasjon* (payment
documentation) instead of a numbered invoice, provided it carries the
information of **§ 5-1-1 nr. 2–5**. The product issues that documentation for
every payment, so neither the member nor the organization ever has to
reconstruct one.

## Rules & invariants
- **The [member card](member-card.md) comes first, the paperwork after it.**
  Both forms lead with the card — the member's name, their organization, their
  hearts, the address they can share — and only then give the payment
  documentation below it. A receipt is a thank-you before it is a document, and
  the card is the thank-you. The email additionally carries the card as an
  attached picture where one can be made, so the member keeps it even if their
  mail client will not load images.
- A receipt carries the § 5-1-1 nr. 2–5 information:
  - **nr. 2, the parties** — the organization by name and
    organisasjonsnummer; the member by name (or, failing a name, the address
    the receipt was delivered to).
  - **nr. 3, what the payment was for** — the membership fee
    (medlemskontingent) and the [tier](membership-tier.md) by name.
  - **nr. 4, what was delivered** — the [annual period](annual-period.md) the
    payment bought, first day to last.
  - **nr. 5, the amount and its payment date** — what was actually paid
    (pro-rated on a mid-year join), when, and by which means (Vipps).
- The receipt states that the membership fee is **exempt from VAT**
  (merverdiavgiftsloven § 3-13) — in plain words, "medlemskontingent er
  unntatt mva". No sequential document number is required for membership
  fees, and none is invented.
- **On the page, the receipt looks like one.** The confirmation page draws the
  payment documentation on its own slip of white paper, torn at the top and
  bottom as if off a receipt roll, so it reads as the document it is rather
  than as one more section of the page. The page does not ask the member to
  keep the receipt — a web page offers them no way to — it instead names the
  email address the same receipt goes to.
- **The receipt adheres to the law without referring to it.** The statutes
  above ground what the receipt must contain; they are never cited at the
  member. A receipt is a thank-you that happens to be complete
  documentation, not a bookkeeping exhibit — labels and wording are the
  member's everyday language (the organization, the member, what it was
  for), never bookkeeping terms like "selger" or "ytelse".
- **One payment, one receipt.** The receipt email cannot be declined — it
  documents money already taken — and says so; the way out is ending the
  membership, offered in the same message. It follows every
  [member notice](member-notice.md) rule: attributable to the organization,
  sent from a noreply address with questions pointed at the organization's
  own contact address, recorded when sent, brand-attributed.
- **A receipt that failed to send is still owed.** The product decides who is
  owed one by comparing captured payments against recorded receipts, not by
  remembering to send — so the send is retried until it succeeds. A capture
  older than the sweep's window is no longer chased; in particular, payments
  captured before this feature existed never earn a late receipt.
- **Noticing a payment and sending its receipt are separate.** Whichever path
  first learns of a capture — the confirmation page the supporter is standing
  on, or the payment event from the provider — only records that a receipt is
  owed and asks for it to be sent; the sending happens away from them, and the
  nightly run remains the backstop. Nobody waits on a receipt: a supporter's
  own page must never be slower, or fail, because a receipt was being made
  behind it, and the provider must never have a payment event go unanswered
  for the same reason. The receipt still normally arrives within seconds of
  the payment.
- A member without an email address gets no email; the confirmation page
  carries the same content, and the unreachable member is counted, never
  hidden.
- Page and email present the same facts. The page additionally names the
  address the email goes to, so the member knows where to look — saying
  whether it has gone yet or is on its way, never claiming a send that has
  not happened.
- A refund does not recall a receipt: the receipt documented a payment that
  really happened, and the refund produces its own trail
  ([refund a payment](../use-cases/refund-a-payment.md)).

## Relationships
- Documents one captured charge of one [membership](membership.md).
- Delivered to one [supporting member](supporting-member.md), on behalf of one
  [organization](organization.md).
- The email form is a kind of [member notice](member-notice.md).
- Leads with, and carries, the member's [card](member-card.md).
- The page form is the confirmation step of
  [joining](../use-cases/join-as-supporting-member.md).

## Referenced by
- [Use case: Join as a supporting member](../use-cases/join-as-supporting-member.md)
- [Use case: Renew annual membership](../use-cases/renew-annual-membership.md)
- [Concept: Member notice](member-notice.md)
