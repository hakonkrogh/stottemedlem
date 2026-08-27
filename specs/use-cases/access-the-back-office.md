# Use case: Access the back office

**Status:** Draft
**Solves:** [Problem: Collecting annual support is manual and leaky](../problems/collecting-annual-support.md)

## Goal
An [administrator](../concepts/administrator.md) signs in and reaches the back
office of the [organization](../concepts/organization.md) they act for — creating
that organization first if they don't have one yet.

## Actors
- **Administrator** — a person acting on an organization's behalf.

## Preconditions
- The person can prove their identity through the product's sign-in.

## Behaviour
From the administrator's point of view:

1. The administrator signs in with their own identity.
2. The product routes them based on the organizations they administer:
   - **None yet** → they are invited to create an organization by giving it a
     public-facing name, and land in it as its first administrator.
   - **Exactly one** → they are taken straight into that organization's back
     office; no extra step.
   - **More than one** → they are shown a selector and choose which organization
     to enter.
3. The chosen or created organization becomes the **active** organization — the
   one whose data every subsequent action reads and changes. The administrator
   lands on its **front page** and can reach any of the
   [back office](../concepts/back-office.md)'s four places — overview,
   settings, members, memberships — from every screen, seeing at a glance
   which of them has something waiting.
4. The administrator can switch to another organization they administer, or create
   an additional one, at any time.
5. The administrator can sign out, ending the session.

## Acceptance criteria
- [ ] A person can sign in with their own identity.
- [ ] An administrator with no organization is prompted to create one and lands in
      it as its administrator.
- [ ] An administrator with exactly one organization is taken directly into it.
- [ ] An administrator with several organizations chooses which one to enter.
- [ ] The active organization can be switched, and further organizations created,
      from anywhere in the back office.
- [ ] From every screen the administrator can see the organization's four
      places, which one they are in, and which of them has something that is
      not yet in order.
- [ ] Every place is its own address: it can be linked to, bookmarked and
      reloaded.
- [ ] An administrator only ever sees organizations they administer.
- [ ] An administrator can sign out.

## Out of scope
- Inviting other people, roles, or fine-grained permissions — membership alone
  gates access for now; every member of an organization is a full administrator.
- Member self-service ("Min side"), which is a different population signing in a
  different way (see the member-facing surfaces).
- Configuring the organization beyond its existence and name — that is
  [Set up a supporting membership](set-up-supporting-membership.md).

## Related
- [Concept: Back office](../concepts/back-office.md) — the four places an
  organization is, and how they are presented
- [Concept: Presenting and editing](../concepts/presenting-and-editing.md)
- [Concept: Administrator](../concepts/administrator.md)
- [Concept: Organization](../concepts/organization.md)
- [Use case: Set up a supporting membership](set-up-supporting-membership.md)
