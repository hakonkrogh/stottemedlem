# Use case: Keep supporting members in the loop

**Status:** Draft
**Solves:** [Problem: Supporters never hear back from the organization](../problems/supporters-never-hear-back.md)

## Goal
An organization thanks its supporting members and keeps them informed and
involved, using the member register it already has.

## Actors
- **Organization administrator** (initiates).
- **Supporting members** (recipients).

## Preconditions
- The organization has at least one supporting member with contact details
  captured at signup.

## Behaviour
From the organization's point of view:

1. The administrator composes a message to supporting members — a thank-you,
   an update on what is happening in the organization, or news that keeps
   members involved.
2. The administrator chooses the audience from the register (e.g. all active
   members) rather than maintaining any separate contact list.
3. The product delivers the message to the selected members using the contact
   details in the register.
4. A member who has lapsed or opted out of communication is not contacted.

From the supporting member's point of view:

- They hear from the organization they support: gratitude for their
  contribution and updates about what their support enables.
- They can decline further communication without ending their membership.

## Acceptance criteria
- [ ] The audience is always derived from the live register — no exports, no
      second list.
- [ ] Members who opted out of communication (or whose membership ended) are
      excluded automatically.
- [ ] Every message is attributable to the organization the member supports.

## Out of scope
- General-purpose newsletters/CRM campaigns, segmentation beyond membership
  status, and analytics — this is member communication, not a marketing tool.
- [Member notices](../concepts/member-notice.md) — what the product tells a
  member about their own membership and money. Those are sent by the product,
  not composed by an administrator, and cannot be declined; declining *these*
  messages never stops them.

## Related
- [Concept: Supporting member](../concepts/supporting-member.md)
- [Concept: Member notice](../concepts/member-notice.md) — the deliberate
  opposite of this use case, and where opting out stops applying
- [Concept: Organization](../concepts/organization.md)
- [Use case: Curate the member list](curate-member-list.md) — provides the
  register this use case acts on.
