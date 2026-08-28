# Use case: Curate the member list

**Status:** Draft
**Solves:** [Problem: Keeping an accurate list of who has paid](../problems/keeping-an-accurate-member-list.md)

## Goal
An organization sees one authoritative, current list of its supporting members
and can act on it.

## Actors
- **Organization administrator**.

## Preconditions
- The organization exists and has at least one
  [membership](../concepts/membership.md) (active or lapsed).

## Behaviour
From the organization's point of view:

1. The administrator views the list of [supporting members](../concepts/supporting-member.md),
   each showing identity, status (**active** or **lapsed**), and the period their
   membership is valid for. A supporter who has been recorded but whose first
   payment has not completed is shown as **not yet paid** rather than lapsed —
   they have never been current, and calling them lapsed would read as someone
   who left. They are not counted as active either.
2. The administrator can tell at a glance how many members are currently active.
   The counts describe the whole organization and do not move while the
   administrator is looking for someone.
3. The administrator can find a specific member — by name, or by whichever
   contact detail they happen to remember — and see their membership history
   (which annual periods they have supported, and what was paid each time).
4. Whether a member's support **continues** is shown alongside whether it is
   current, because they are different questions: someone who has ended the
   arrangement stays a member until their paid period runs out
   ([renew](renew-annual-membership.md)).
5. A supporter is identified by whatever they consented to share. One who gave
   a contact detail but no name is still listed, by something a person can
   recognize — never by an internal id.
6. The administrator can correct a member's recorded identity/contact details,
   including clearing one: a wrong address is worse than none. Looking someone
   up never means facing a form: the list and the member's own page **present**
   what is recorded, and correcting it is a separate action the administrator
   asks for ([presenting and editing](../concepts/presenting-and-editing.md)).
7. The list reflects payments automatically — a new join or renewal appears
   without manual entry, and keeps doing so even when the product was never
   notified that the payment happened
   ([payment reconciliation](../concepts/payment-reconciliation.md)). It follows
   money leaving too: a payment refunded in full stops being a supported period,
   here as everywhere else ([refund a payment](refund-a-payment.md)).
8. Alongside a member's history, the administrator sees the **payments** behind
   it, and can give one back. That is the only way a member stops being current
   before their year runs out — and it is still not a status action: the money
   moves, and the status follows it.

## Acceptance criteria
- [ ] The list shows every supporting member with their current status and valid
      period.
- [ ] Active vs lapsed members are clearly distinguishable and countable.
- [ ] Status is derived from whether the annual fee is paid for the current
      period — the administrator never sets status by hand.
- [ ] The administrator can correct a member's contact details without changing
      their payment/membership record, from an edit action rather than a form
      that is open by default.
- [ ] A supporter with no completed payment is distinguishable from one whose
      membership has lapsed, and is counted as neither active.
- [ ] A supporter who consented to no name is still findable and recognizable in
      the list.
- [ ] Searching the list never changes the counts it reports.

## Out of scope
- Manually marking someone as paid/active without an actual payment (kept out to
  preserve "status follows payment"); any exception path is a separate, explicit
  use case if needed later.
- Refunding itself, which is its own use case:
  [Refund a supporting member's payment](refund-a-payment.md).
- Bulk import and external CRM sync. Exporting the list is in scope, as its
  own use case: [Export the member list](export-member-list.md).
- Messaging/emailing members in bulk — deliberately not offered (see the
  retired [Keep supporting members in the loop](keep-supporters-in-the-loop.md));
  the export is how the organization reaches its members through its own
  channels.

## Open questions
- **Search terms carry personal data into web addresses.** Finding a member is
  a plain form submission, so a phone number or email the administrator types
  becomes part of the page's address — and from there reaches browser history,
  Referer headers, and the platform's request logs. That brushes against the
  spirit of the alerting invariant that member contact data never leaves
  through vendor sinks
  ([operational alerting](../concepts/operational-alerting.md)). Known and
  currently **accepted** (2026-08-28): no law requires otherwise, the audience
  is the organization's own administrators, and the simple, bookmarkable,
  reload-safe search was judged worth more than the leak. A browser-side
  filter was prototyped and reverted the same day (worse to use). Precedent
  research (2026-08-28, `docs/research/pii-in-admin-urls-and-phone-masking.md`)
  found this is the documented industry norm — Stripe and Zendesk advertise
  PII-carrying search URLs as a sharing feature, no comparable membership tool
  documents URL hygiene, and no GDPR enforcement on the pattern exists — so
  the acceptance stands; that document also lists the hardening options if
  this is ever revisited.
- [Concept: Presenting and editing](../concepts/presenting-and-editing.md)
- [Concept: Membership](../concepts/membership.md)
- [Concept: Supporting member](../concepts/supporting-member.md)
- [Concept: Payment reconciliation](../concepts/payment-reconciliation.md) — what
  keeps the list true to the money without anyone reconciling by hand
