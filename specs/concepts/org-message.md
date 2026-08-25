# Concept: Organization message

**Status:** Draft

## Definition
An **organization message** is a message an [administrator](administrator.md)
writes and the product delivers to the organization's
[supporting members](supporting-member.md) — a thank-you, an update on what is
happening, news that keeps members involved. It is the organization's own
voice, carried by the product, using the contact details the register already
holds.

It is the deliberate opposite of a [member notice](member-notice.md): a notice
is the *product* telling one member something they are owed about their own
money, and cannot be declined; an organization message is the *organization*
choosing to say something, and every member may decline them.

## Why it exists
A register that only collects payment misses half its promise
([the problem](../problems/supporters-never-hear-back.md)): supporters who
never hear back feel like a bank account, and unthanked supporters quietly
don't renew. The register payments maintain is already the accurate,
always-current list of who to thank — the product lets the organization act on
it, so no exported spreadsheet or second contact list ever needs to exist.

## Rules & invariants
- **The audience is derived from the live register at the moment of sending.**
  There is no stored recipient list to go stale; who a message goes to is a
  *rule* (which membership statuses), not a snapshot.
- **The default audience is current members.** Members whose membership has
  lapsed may be included, but only as a separate, deliberate choice — inviting
  them back is legitimate (winning a lapsed supporter back is half the point of
  the problem this solves), silently continuing to mail people who left is not.
  (Decided 2026-08-25, resolving the open question in
  [the use case](../use-cases/keep-supporters-in-the-loop.md).)
- **A member who has declined organization messages is excluded automatically**,
  whatever audience is chosen. The organization is shown *that* people are
  excluded — declined members and members with no address are counted, not
  hidden — but the choice itself belongs to the member.
- **Every organization message carries a working way to decline further ones**:
  one click, no login, no account. The member's unguessable address stands in
  for identity, the same pattern as the
  [member self-service page](member-self-service.md). Declining is reversible
  from the member's own page, ends no membership, and never stops a
  [member notice](member-notice.md). (Decided 2026-08-25.)
- The message is **plain text with paragraphs** — no rich formatting, no
  templates, no campaigns. The product is member communication, not a
  newsletter or CRM tool.
- Every message is **attributable to the organization**: it carries the
  organization's name, and a reply reaches the organization, not the product.
  The sending address stays the product's own (only we can prove we own it).
- **The product records what actually went out** — for each member: delivered,
  failed, or unreachable — and never claims a send that did not happen. The
  administrator sees the result plainly, including who could not be reached.
- It carries the same [brand attribution](brand-attribution.md) as every other
  member-facing surface.

## Relationships
- Written by an [administrator](administrator.md) on behalf of one
  [organization](organization.md).
- Delivered to [supporting members](supporting-member.md) selected from the
  register that [curating the member list](../use-cases/curate-member-list.md)
  maintains.
- Is the mechanism behind
  [keeping supporting members in the loop](../use-cases/keep-supporters-in-the-loop.md).
- Is deliberately *not* a [member notice](member-notice.md).

## Referenced by
- [Use case: Keep supporting members in the loop](../use-cases/keep-supporters-in-the-loop.md)
- [Concept: Member self-service page](member-self-service.md)
