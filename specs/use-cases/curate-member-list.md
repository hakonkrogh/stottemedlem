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
   membership is valid for.
2. The administrator can tell at a glance how many members are currently active.
3. The administrator can find a specific member and see their membership history
   (which annual periods they have supported).
4. The administrator can correct a member's recorded identity/contact details.
5. The list reflects payments automatically — a new join or renewal appears
   without manual entry.

## Acceptance criteria
- [ ] The list shows every supporting member with their current status and valid
      period.
- [ ] Active vs lapsed members are clearly distinguishable and countable.
- [ ] Status is derived from whether the annual fee is paid for the current
      period — the administrator never sets status by hand.
- [ ] The administrator can correct a member's contact details without changing
      their payment/membership record.

## Out of scope
- Manually marking someone as paid/active without an actual payment (kept out to
  preserve "status follows payment"); any exception path is a separate, explicit
  use case if needed later.
- Bulk import/export and external CRM sync.
- Messaging/emailing members in bulk.

## Related
- [Concept: Membership](../concepts/membership.md)
- [Concept: Supporting member](../concepts/supporting-member.md)
