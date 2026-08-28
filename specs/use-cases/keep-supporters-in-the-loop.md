# Use case: Keep supporting members in the loop

**Status:** Retired (2026-08-28)
**Solves:** [Problem: Supporters never hear back from the organization](../problems/supporters-never-hear-back.md) (also retired)

> **Retired.** The product no longer sends the organization's own messages to
> its members. In-product messaging was built (2026-08-25) and then removed:
> the product's one job is the register and the annual fee, and carrying an
> organization's outbound email — deliverability, spam complaints, opt-outs —
> pulled it toward being a newsletter tool. Instead the organization takes the
> register with it: [Export the member list](export-member-list.md) and reach
> members through whatever channel the organization already uses. The
> product's own [member notices](../concepts/member-notice.md) (fee changes —
> what a member is owed about their own money) are unaffected and remain the
> only email the product sends to members. The text below is kept as the
> record of what was built and why.

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

1. The administrator composes an
   [organization message](../concepts/org-message.md) — a subject and a
   plain-text body — a thank-you, an update on what is happening in the
   organization, or news that keeps members involved.
2. The administrator chooses the audience from the register rather than
   maintaining any separate contact list. **Current members are the default;
   including lapsed members is a separate, deliberate choice** — inviting a
   lapsed supporter back is legitimate, silently continuing to mail people who
   left is not. (Decided 2026-08-25, resolving the former open question.)
3. While choosing, the administrator sees how many members the message will
   reach — and how many it cannot: members with no contact address and members
   who have declined are counted, not hidden.
4. The administrator previews the message as members will read it, then sends.
5. The product delivers the message to the selected members using the contact
   details in the register, and shows plainly what went out and what did not.
   It never claims a send that did not happen.
6. A member who has declined organization messages is never contacted,
   whatever audience was chosen.

From the supporting member's point of view:

- They hear from the organization they support: gratitude for their
  contribution and updates about what their support enables. Every message is
  recognizably from that organization, and a reply reaches it.
- **Every message carries a one-click way to decline further ones** — no login,
  no account; the member's unguessable address identifies them, the same
  pattern as the [self-service page](../concepts/member-self-service.md).
  Declining is reversible from their own page, does not end the membership,
  and never stops a [member notice](../concepts/member-notice.md).
  (Decided 2026-08-25, resolving the former open question.)

## Acceptance criteria
- [ ] The audience is always derived from the live register — no exports, no
      second list, no stored snapshot.
- [ ] Members who declined organization messages are excluded automatically,
      whatever audience is chosen; lapsed members are reached only when the
      administrator deliberately includes them.
- [ ] Every message is attributable to the organization the member supports.
- [ ] Every message offers declining further messages, completed in one click
      without a login.
- [ ] What went out is recorded per member, and the administrator is shown who
      could not be reached.

## Out of scope
- General-purpose newsletters/CRM campaigns, segmentation beyond membership
  status, and analytics — this is member communication, not a marketing tool.
- [Member notices](../concepts/member-notice.md) — what the product tells a
  member about their own membership and money. Those are sent by the product,
  not composed by an administrator, and cannot be declined; declining *these*
  messages never stops them.

## Related
- [Concept: Organization message](../concepts/org-message.md) — the message
  this use case is about, and the rules it obeys
- [Concept: Supporting member](../concepts/supporting-member.md)
- [Concept: Member notice](../concepts/member-notice.md) — the deliberate
  opposite of this use case, and where opting out stops applying
- [Concept: Organization](../concepts/organization.md)
- [Use case: Curate the member list](curate-member-list.md) — provides the
  register this use case acts on.
