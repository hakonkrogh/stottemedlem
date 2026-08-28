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
- The receipt states that a membership fee in an ideal organization is
  **exempt from VAT** (merverdiavgiftsloven § 3-13), and names the rule the
  documentation satisfies (§ 5-1-6b jf. § 5-1-1 nr. 2–5). No sequential
  document number is required for membership fees, and none is invented.
- **One payment, one receipt.** The receipt email cannot be declined — it
  documents money already taken — and says so; the way out is ending the
  membership, offered in the same message. It follows every
  [member notice](member-notice.md) rule: attributable to the organization,
  reply reaches the organization, recorded when sent, brand-attributed.
- **A receipt that failed to send is still owed.** The product decides who is
  owed one by comparing captured payments against recorded receipts, not by
  remembering to send — so the send is retried until it succeeds, from
  whichever path notices the capture first (the confirmation page, the
  payment event, or the nightly run). A capture older than the sweep's window
  is no longer chased; in particular, payments captured before this feature
  existed never earn a late receipt.
- A member without an email address gets no email; the confirmation page
  carries the same content, and the unreachable member is counted, never
  hidden.
- Page and email present the same facts. The page additionally says where the
  email went, so the member knows to look for it.
- A refund does not recall a receipt: the receipt documented a payment that
  really happened, and the refund produces its own trail
  ([refund a payment](../use-cases/refund-a-payment.md)).

## Relationships
- Documents one captured charge of one [membership](membership.md).
- Delivered to one [supporting member](supporting-member.md), on behalf of one
  [organization](organization.md).
- The email form is a kind of [member notice](member-notice.md).
- The page form is the confirmation step of
  [joining](../use-cases/join-as-supporting-member.md).

## Referenced by
- [Use case: Join as a supporting member](../use-cases/join-as-supporting-member.md)
- [Use case: Renew annual membership](../use-cases/renew-annual-membership.md)
- [Concept: Member notice](member-notice.md)
