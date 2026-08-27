# Concept: Presenting and editing

**Status:** Draft

## Definition
Everywhere the back office shows something an [administrator](administrator.md)
could change — the [organization](organization.md)'s details, its
[Vipps API keys](vipps-api-keys.md), a
[membership tier](membership-tier.md), a
[supporting member](supporting-member.md)'s contact details — the product has
**two states for the same thing**: it is *presented* by default, and *edited*
only when the administrator asks to edit it.

## Why it exists
Most visits to a back office are visits to *look*: what is the contact address
we publish, which sales unit are we paid through, what does this membership
cost. A screen made of open input fields answers those questions badly — it
puts the reader inside a form they never asked for, makes stored values look
provisional, and invites an accidental change to something that was already
right. Reading and changing are different intentions, and the product treats
them as different states.

## Rules & invariants
- **Presentation is the default.** Arriving at a screen shows what is stored,
  laid out to be read: a quiet label with its value. A value the organization
  has not given yet reads as *missing*, not as an empty box.
- **Editing is entered deliberately**, through a visible action next to what it
  changes ("Endre …"). The edit state is its own address, so it can be linked
  to, bookmarked and left.
- **Leaving is always offered**, and leaving changes nothing.
- **Saving returns to presentation**, with confirmation of what was saved — the
  administrator sees the new truth, not the form that produced it.
- **A rejected save stays in editing**, keeping what was typed and saying what
  is wrong; nothing is lost to a validation failure.
- **Secrets are only ever presented masked** (see
  [Vipps API keys](vipps-api-keys.md)); editing them means entering a full new
  value, never revealing the old one.
- A list presents; it never edits. Selecting an entry opens that entry, and the
  entry offers the edit action — so the [member list](../use-cases/curate-member-list.md)
  and the membership offer are read at a glance without any risk of changing
  them.
- **This is a rule for every editable surface**, present and future. A new
  screen that shows editable information starts by presenting it.

## Relationships
- Applies throughout the back office an [administrator](administrator.md)
  reaches in [Access the back office](../use-cases/access-the-back-office.md).
- Governs how [Set up a supporting membership](../use-cases/set-up-supporting-membership.md)
  and [Curate the member list](../use-cases/curate-member-list.md) behave on
  screen.

## Referenced by
- [Use case: Access the back office](../use-cases/access-the-back-office.md)
- [Use case: Set up a supporting membership](../use-cases/set-up-supporting-membership.md)
- [Use case: Curate the member list](../use-cases/curate-member-list.md)
- [Concept: Vipps API keys](vipps-api-keys.md)
