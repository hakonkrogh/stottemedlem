# Use case: Renew annual membership

**Status:** Draft
**Solves:** [Problem: Keeping an accurate list of who has paid](../problems/keeping-an-accurate-member-list.md)

## Goal
A supporting member continues their support for another year, and the
organization's list stays accurate as periods turn over.

## Actors
- **Supporting member** — renews their own support.
- **Organization administrator** — observes who has lapsed and who has renewed.

## Preconditions
- The supporter has, or recently had, a [membership](../concepts/membership.md)
  with the organization.

## Behaviour
1. A [membership](../concepts/membership.md) is valid for one annual period. When
   that period ends without renewal, the membership becomes **lapsed** and the
   member is shown as lapsed in the [member list](curate-member-list.md).
2. A member can renew by paying the current [annual fee](../concepts/annual-fee.md)
   for the next annual period, returning to **active** status.
3. Renewal reuses the supporter's existing identity — they do not re-register as a
   new person; their membership history accumulates across periods.
4. The valid-until date after renewal reflects the new annual period.

## Acceptance criteria
- [ ] A membership automatically becomes lapsed when its annual period ends with
      no paid renewal.
- [ ] A lapsed (or soon-to-lapse) member can renew by paying the current fee and
      returns to active.
- [ ] Renewal extends the same supporting member's history rather than creating a
      duplicate person.
- [ ] The list and counts reflect lapse and renewal without manual admin action.

## Out of scope
- Automatic recurring charges (renewal is an explicit payment for now).
- Reminder emails/notifications about upcoming lapse (candidate for a later use
  case).
- Proration or mid-period upgrades.

## Related
- [Concept: Membership](../concepts/membership.md)
- [Concept: Annual fee](../concepts/annual-fee.md)
