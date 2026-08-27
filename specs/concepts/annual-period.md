# Concept: Annual period

**Status:** Draft

## Definition
The **annual period** is the stretch of time one
[membership](membership.md) covers. It is the **calendar year**: every
membership in every [organization](organization.md) runs to 31 December and the
next period starts 1 January. A supporter who joins mid-year joins the *current*
calendar year, for the part of it that remains.

## Why it exists
Support is something an organization counts per year — "our supporting members
in 2027". Anchoring every membership to the same calendar year is what makes
that a single, answerable question: the organization sees one list per year,
everyone renews together, and a member's history reads as a row of years rather
than a set of personal anniversaries. It also matches how small organizations
already think about seasons, budgets and annual meetings.

## Rules & invariants
- A period is one calendar year: 1 January – 31 December. The same period
  applies to every organization and every [membership tier](membership-tier.md).
- A membership taken out mid-year covers **from the day it is paid until 31
  December** of that year.
- A mid-year join pays a **pro-rated share** of the tier's
  [annual fee](annual-fee.md) — proportional to how much of the year remains —
  so nobody pays a full year for a part of one. Renewals always cost the full
  fee.
- Renewal happens at the turn of the year: a continuing membership's next period
  begins 1 January, and the fee for it is collected around that turn.
- A membership belongs to exactly one period; a supporter holds at most one
  membership per organization per period.
- The period a membership covers never changes after the fact — repricing a
  tier or changing the calendar has no effect on periods already paid for.

## The accelerated staging calendar
The staging environment runs the same product on a compressed calendar: the
**ISO week** stands in for the year. This exists so a full membership
lifecycle — join, fee-change notice, repricing, renewal, lapse — can be
rehearsed against the payment provider's test environment in days instead of
years; nothing about the real product can otherwise be observed end-to-end
before a January comes around. Which calendar an environment counts in is
environment configuration; production always uses the calendar year.

Rules for the accelerated calendar, mirroring the real ones:
- The period is the ISO week, Monday through Sunday. Period keys encode as
  `<ISO year><week>` (e.g. 202635) so they order chronologically and fit
  everywhere a calendar year goes; people see them as "uke 35/2026".
- A mid-week join pays the pro-rated share of the remaining days of the week;
  renewals cost the full fee.
- The renewal window opens on **Saturday** — proportionally earlier than
  production's 1 December. This is forced, not chosen: the payment provider
  requires a charge's due date to be at least one *real* day in the future,
  and the accelerated "December" (~13 hours) is too short to hold it.
- Durations defined in real days scale with the calendar (the fee-notice rule
  of ~six hours instead of 14 days, reconciliation lookbacks likewise), except
  where the provider's own clocks put a floor under them: charge retries run
  in real days and are kept to one, so a failed renewal's retries do not
  outlive the period it pays for.
- Scheduled upkeep runs hourly instead of nightly — the same cadence relative
  to the period.
- Payment agreements are created with a weekly cadence, so the provider
  permits a charge every period.

Accepted inaccuracy: member-facing prose written for the yearly product (sales
terms, "per year" phrasing) is not rewritten for the accelerated calendar —
staging exists to exercise the machinery, and its members are test users.

## Open questions
- **Joining very late in the year.** A supporter who joins in mid-December pays
  a tiny remainder and is then charged the full fee weeks later. Options: let
  it be, apply a floor to the pro-rated amount, or let a late join cover the
  remainder *and* the whole next year. Undecided — the product currently
  charges the remainder only.

## Relationships
- Scopes one [membership](membership.md).
- Determines what share of the [annual fee](annual-fee.md) a join costs.

## Referenced by
- [Concept: Membership](membership.md)
- [Concept: Annual fee](annual-fee.md)
- [Use case: Join as a supporting member](../use-cases/join-as-supporting-member.md)
- [Use case: Renew annual membership](../use-cases/renew-annual-membership.md)
