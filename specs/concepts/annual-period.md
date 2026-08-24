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
