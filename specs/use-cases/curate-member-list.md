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
   each showing identity, the period their membership is valid for, and where
   they **stand** with the organization. A standing is one of four, and every
   member has exactly one:
   - **active, renewing** — the fee is paid for the current period and the
     yearly arrangement still runs, so the next period is already covered;
   - **active, ending** — the fee is paid for the current period but the
     arrangement has been ended, so this is their last period. They are still a
     member, and they are the one to talk to now;
   - **lapsed** — their last paid period has passed and no new one is paid;
   - **not yet paid** — recorded, but no payment has ever completed. They have
     never been current, and calling them lapsed would read as someone who
     left. They are not counted as active either.

   The standing is stated in the same words wherever a member appears — in the
   list, on their own page, and in the [export](export-member-list.md) — so the
   product never describes one member two ways.
2. The administrator can tell at a glance how many members are currently active,
   and how many of those are ending rather than renewing. The counts describe
   the whole organization and do not move while the administrator is looking
   for someone.
3. The administrator can narrow the list to one standing — everyone, the active
   ones, only those renewing, only those ending, the lapsed ones, or those who
   never paid — and combine that with a search. Narrowing is a plain address the
   administrator can bookmark, share and reload; the counts beside each choice
   are still the organization's totals, not the narrowed view's.
4. The administrator can find a specific member — by name, or by whichever
   contact detail they happen to remember — and see their membership history
   (which annual periods they have supported, and what was paid each time).
5. Whether a member's support **continues** is shown alongside whether it is
   current, because they are different questions: someone who has ended the
   arrangement stays a member until their paid period runs out
   ([renew](renew-annual-membership.md)). The product learns this from the
   payment provider whether or not it was told — a supporter who cancels in
   their payment app has cancelled, and the list must say so
   ([payment reconciliation](../concepts/payment-reconciliation.md)).
6. A supporter is identified by whatever they consented to share. One who gave
   a contact detail but no name is still listed, by something a person can
   recognize — never by an internal id.
7. The administrator can correct a member's recorded identity/contact details,
   including clearing one: a wrong address is worse than none. Looking someone
   up never means facing a form: the list and the member's own page **present**
   what is recorded, and correcting it is a separate action the administrator
   asks for ([presenting and editing](../concepts/presenting-and-editing.md)).
8. The list reflects payments automatically — a new join or renewal appears
   without manual entry, and keeps doing so even when the product was never
   notified that the payment happened
   ([payment reconciliation](../concepts/payment-reconciliation.md)). It follows
   money leaving too: a payment refunded in full stops being a supported period,
   here as everywhere else ([refund a payment](refund-a-payment.md)).
9. Alongside a member's history, the administrator sees the **payments** behind
   it, and can give one back. That is the only way a member stops being current
   before their year runs out — and it is still not a status action: the money
   moves, and the status follows it.

## Acceptance criteria
- [ ] The list shows every supporting member with their current standing and
      valid period.
- [ ] All four standings are clearly distinguishable and separately countable —
      in particular, a member who is active but ending is told apart from one
      who is active and renewing, at a glance and without opening them.
- [ ] The administrator can narrow the list to any one of those standings, and
      to the active ones as a group, and can still search within it.
- [ ] Standing is derived from whether the annual fee is paid for the current
      period and whether the arrangement still runs — the administrator never
      sets standing by hand.
- [ ] A supporter who ends their arrangement with the payment provider — rather
      than through the product — is shown as ending, without anyone telling the
      product.
- [ ] The administrator can correct a member's contact details without changing
      their payment/membership record, from an edit action rather than a form
      that is open by default.
- [ ] A supporter with no completed payment is distinguishable from one whose
      membership has lapsed, and is counted as neither active nor lapsed.
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
