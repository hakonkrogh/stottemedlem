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
- **Some failures can only be seen by the person they happened to, and those
  are reported from where they are seen.** Nearly everything here is the
  product watching its own work. A [member card](member-card.md) is the
  exception: it is handed over as a picture, and what actually landed on that
  picture is visible only in the reader's own browser. So the page showing the
  card checks it there and reports a card that came out without its words. The
  reader is never told and never asked: they are not the operator, and a
  broken card is not their problem to carry. Such a report is the only kind
  raised from an address anybody can reach, so it accepts nothing but a report
  of a fixed shape, and it is the same one message every time. A stranger can
  push the count of a known problem up; they cannot put a story of their own in
  front of the operator.
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
- **A failing request is reported by its address, never by what was typed
  into it.** Whatever the vendor would attach of the request on its own (the
  posted form, cookies, credential headers) is stripped before the report
  leaves, because a form here may hold an organization's
  [Vipps API keys](vipps-api-keys.md) or a member's contact details. The
  token in the address of a [member's own page](member-self-service.md) is
  their login, so it is blanked too; the page itself stays named. A report
  that had to be stripped says so, so the operator can see when the vendor
  has started attaching something it did not before (decided 2026-09-11,
  when the vendor's default was found to attach every posted form).
- **Only deployed environments speak, and each says which one it is.**
  Production and staging both report (decided 2026-08-27 — staging's
  accelerated calendar makes its nightly work worth watching too), and every
  report is stamped with its environment so the operator can filter one from
  the other and staging noise never masquerades as a production incident. The
  operator's *email* alerts stay scoped to production reports. A developer's
  machine still cannot speak — not merely by convention, but by construction:
  a local environment has no way to obtain the channel's address. A developer
  who wants to see the pipeline work points it at a channel of their own.
- **Alerting must never become the outage.** A vendor being down or
  unconfigured degrades to plain logging; it never breaks a page view, a
  payment, or a nightly job. The alerting path also must not depend on what it
  reports on — in particular, not on the product's own member-email sending.
- **Quiet success is recorded, not announced.** Normal work leaves a log
  trail (and context for the next alert), never an email. The one exception is
  a new organization signing up in production, which the product's own people
  are mailed about because they may need to help it
  ([Sign up for early access](../use-cases/sign-up-for-early-access.md)). That
  is news, not an alert: it goes through the product's email sending, and
  only its failure to send is an alert.
- **A night that never happened is as loud as a night that failed.** Every
  other report here is made by the product while it works, so the shape it can
  describe is work that ran and went wrong. Work that never started describes
  nothing, and a product saying nothing is also what a good night looks like.
  The product therefore says so when unattended work has *finished*, and
  something outside the product holds the expectation that the message
  arrives: the alarm for a night that never came can only be raised by whoever
  was waiting for it, because inside the product the part that would notice is
  the part that did not run. One silence covers every way a night can go
  missing: a run that never started, and a run that started and never reached
  the end. A run that fails says so on its way out, so a bad night is loud at
  once rather than only at its next missed message. What counts as on time is
  whatever schedule the product actually keeps, and each deployed environment
  is judged against its own: they run the same work on deliberately different
  clocks, and one environment's clock must never be used to read the other's
  silence. Being the one waited for is itself a credential: anything that can
  speak in a run's place can cover up that run's absence, so the address it
  speaks to is held as closely as any other secret (decided 2026-09-16, when
  the watchdog moved to a vendor whose address is the whole of its
  authentication).
- **A situation the product handles by itself is not a failure.** Something
  the product recognizes and puts right on its own — a second payment for a
  period already paid for being
  [given back](../use-cases/join-as-supporting-member.md), an event redelivered
  after it was already applied — is recorded, not alerted. Only the handling
  *failing* reaches the operator. Alerting the operator about outcomes nobody
  has to act on trains them to ignore the channel, which costs the alert that
  matters (decided 2026-09-01, after a supporter cancelling and re-joining on
  staging raised an alarm about the refund working as intended).
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
