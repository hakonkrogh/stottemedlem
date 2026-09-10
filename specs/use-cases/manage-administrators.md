# Use case: Manage who administers the organization

**Status:** Draft
**Solves:** [Problem: Collecting annual support is manual and leaky](../problems/collecting-annual-support.md)

## Goal
An [administrator](../concepts/administrator.md) sees who can act for the
[organization](../concepts/organization.md), gives another person the same
access by inviting their email address, and takes access away again when
somebody should no longer have it.

## Actors
- **Administrator**: a person already acting on the organization's behalf.
- **Invited person**: someone who is to become an administrator of the same
  organization. They may or may not already use the product.

## Preconditions
- The administrator is signed in and inside the organization's
  [back office](../concepts/back-office.md).

## Behaviour
From the administrator's point of view:

1. Under the organization's settings, the administrator opens the list of
   people who can act for it. Everyone with access is named, with the address
   they sign in with, and the administrator reading the page is marked as
   themselves, so nobody is left wondering which line is them.
2. Below them, anyone who has been invited and has not accepted yet: the
   address the invitation went to, when it was sent, and when it stops working.
   An invitation is a promise of access, so it is shown next to the access it
   will become, not hidden until it is accepted.
3. To add someone, the administrator writes their email address and sends the
   invitation. The product emails that person a link. Opening it and signing in
   with their own identity, whether they already have one or make one on the
   spot, puts them in this organization's back office as a full administrator.
4. Until then, the invitation is pending and the invited person has no access.
   The administrator can withdraw it, which is what a mistyped address is put
   right with.
5. To take access away, the administrator removes the person from the list.
   Removing is asked about first, because it is not undoable from here: getting
   that access back means being invited again and accepting again. From the
   moment it is done, that person's next request to the back office is refused
   like any stranger's.
6. Nothing else about the people on this page can be changed: the product does
   not edit somebody else's name, and there is nothing to demote them to, since
   every administrator is a full administrator.

Rules the product holds to:

- **An organization always keeps at least one administrator.** The last one
  cannot be removed, not by anybody and not by themselves. An organization with
  nobody who may act for it is unreachable: its members keep paying, and no
  person on earth can change its offer, refund anyone, or stop it. A pending
  invitation does not count as an administrator, because an invitation is not
  access, so the last administrator stays the last one until somebody actually
  accepts.
- **The last administrator is told why, not left guessing.** The screen does
  not simply hide the action; it says that this is the only administrator and
  that inviting somebody else is what makes removal possible.
- **Any administrator may remove any other, and themselves.** There is no owner
  who outranks the others, which follows from there being one level of access
  ([Administrator](../concepts/administrator.md)). Removing yourself is
  leaving: the back office is no longer yours to see, so it answers by putting
  you where a person with no access to this organization belongs.
- **An address that already has access is not invited again**, and neither is
  one that already has an invitation waiting. Either is answered with a plain
  sentence saying so, and no second email is sent.
- **An invitation grants nothing by itself.** Access begins when the invited
  person signs in through it, with their own identity, and the list only names
  them as an administrator from then on.
- The invitation is written in Norwegian, like everything else the product
  sends.
- Inviting, withdrawing, removing and being refused are all answered in place
  on an address that can be reloaded
  ([Answering an action](../concepts/answering-an-action.md)).

## Acceptance criteria
- [ ] An administrator can see everyone who can act for the organization, with
      the address each of them signs in with, and can tell which one is them.
- [ ] An administrator can see every invitation that has been sent and not
      accepted, when it was sent, and when it runs out.
- [ ] An administrator can invite a person by email address, and that person
      receives an invitation that leads into this organization.
- [ ] An address that already has access, or already has a pending invitation,
      is refused with an explanation and no second email.
- [ ] An address that is not an email address is refused before anything is
      sent.
- [ ] A pending invitation can be withdrawn, after which it disappears from the
      list and its link no longer works.
- [ ] An invited person who accepts appears among the administrators and can do
      everything an administrator can.
- [ ] An administrator can remove another administrator, after being asked to
      confirm, and that person loses access at once.
- [ ] An administrator can remove themselves, and lands where a person with no
      access to this organization lands.
- [ ] The only administrator of an organization cannot be removed, by any
      route, and the screen says why rather than hiding the fact.

## Out of scope
- Roles, partial permissions, a read-only level, or an owner who outranks the
  others. Every administrator is a full administrator, so there is nothing to
  demote anybody to.
- Resending an invitation: withdrawing it and inviting the address again is the
  same thing with one fewer button.
- Deleting the person's WorkOS identity. Removing them takes away access to
  this organization and nothing else; they may still administer others.
- Inviting a [supporting member](../concepts/supporting-member.md), a
  different population entirely, who join through the
  [join page](../concepts/join-page.md) and never sign in here.

## Related
- [Concept: Administrator](../concepts/administrator.md)
- [Concept: Back office](../concepts/back-office.md): settings is where this
  lives
- [Use case: Access the back office](access-the-back-office.md): what the
  invited person does with the invitation
- [Concept: Answering an action](../concepts/answering-an-action.md)
