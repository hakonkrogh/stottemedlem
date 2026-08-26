# Concept: Operational alerting

**Status:** Draft

## Definition
The product telling its **operator** — the person running støttemedlem itself,
a third actor beside the organization and the supporting member — that
something has gone wrong, without being asked. The product does its most
important work (renewal charges, reconciliation, webhook processing) at night
with nobody watching; operational alerting is what makes a silent failure
impossible to miss.

## Why it exists
The product moves real money on behalf of organizations. A night where every
renewal charge fails must not look identical to a quiet night; a payment event
the product could not process must not disappear after the payment provider
gives up redelivering. The organizations trust the product to notice its own
problems — they should never be the ones who discover that memberships stopped
renewing.

## Rules & invariants
- **Every failure that leaves the record wrong reaches the operator**: renewal
  charges that failed, reconciliation reads that failed, payment events that
  could not be applied, member notices that could not be sent, and
  configuration gaps that silently switch a feature off.
- **The channel is email, and only email.** The operator has chosen to be
  informed, not paged: no phone calls, no middle-of-the-night escalation.
  Waiting until morning is an accepted cost.
- **One problem is one conversation.** Recurrences of the same failure are
  grouped, not one message per occurrence — a bad week reads as one issue with
  a count, and a fixed problem that returns is news again.
- **Every alert names its area.** Each report says which part of the product
  spoke — renewals, reconciliation, webhooks, notices — so the operator knows
  where to look before opening anything, and can tell one area's bad night
  from another's.
- **Alerts carry identifiers and counts, never member personal data.** An
  alert names the organization and the failing thing (agreement id, event
  type, how many); a member's name, email or phone number never leaves the
  product through an alerting vendor.
- **Only production speaks.** Alerts report the deployed product, never a
  developer's machine or a staging copy: a developer exercising the product
  locally must not be able to file noise into the operator's channel — and not
  merely by convention, but by construction: a local environment has no way to
  obtain the production channel's address. A developer who wants to see the
  pipeline work points it at a channel of their own.
- **Alerting must never become the outage.** A vendor being down or
  unconfigured degrades to plain logging; it never breaks a page view, a
  payment, or a nightly job. The alerting path also must not depend on what it
  reports on — in particular, not on the product's own member-email sending.
- **Quiet success is recorded, not announced.** Normal work leaves a log
  trail (and context for the next alert), never an email.
- The vendor behind the channel is an implementation choice and must stay
  swappable; the product's behaviour is defined by the rules above, not by any
  vendor's feature set.

## Relationships
- Watches over [renewing annual memberships](../use-cases/renew-annual-membership.md)
  and [payment reconciliation](payment-reconciliation.md) — the unattended,
  money-moving work that motivates it.
- Watches the delivery of payment events that keep the
  [membership](membership.md) record true, and the sending of
  [member notices](member-notice.md).
- The operator is not the [administrator](administrator.md): organizations are
  never the audience for these alerts.
