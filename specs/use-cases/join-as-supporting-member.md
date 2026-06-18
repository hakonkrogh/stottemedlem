# Use case: Join as a supporting member

**Status:** Draft
**Solves:** [Problem: Collecting annual support is manual and leaky](../problems/collecting-annual-support.md)

## Goal
A person from the community becomes a supporting member of an organization by
paying its annual fee, in one simple flow.

## Actors
- **Supporter** — a member of the public who wants to back the organization.

## Preconditions
- The organization has [set up a supporting membership](set-up-supporting-membership.md)
  and shared its join entry point.

## Behaviour
From the supporter's point of view:

1. The supporter opens the organization's join entry point and sees who they are
   supporting and the [annual fee](../concepts/annual-fee.md).
2. The supporter provides the minimum identity needed to be listed as a
   [supporting member](../concepts/supporting-member.md) (e.g. name and a contact
   such as email).
3. The supporter pays the annual fee.
4. On successful payment, the supporter becomes an **active** supporting member
   for the current annual period, and this is reflected immediately in the
   organization's [member list](curate-member-list.md).
5. The supporter receives confirmation that they are now a supporting member and
   until when their support is valid.

## Acceptance criteria
- [ ] A supporter can complete joining and payment without the administrator
      doing anything in the moment.
- [ ] A successful payment creates an active [membership](../concepts/membership.md)
      for the current annual period, attributed to the named supporter.
- [ ] The supporter is told their membership is active and its valid-until date.
- [ ] A failed or abandoned payment does not create an active membership.

## Out of scope
- Gift/third-party memberships (paying on behalf of someone else).
- Recurring auto-charge (renewal is handled as its own use case for now).
- Anonymous support with no identity captured.

## Related
- [Concept: Supporting member](../concepts/supporting-member.md)
- [Concept: Membership](../concepts/membership.md)
- [Concept: Annual fee](../concepts/annual-fee.md)
