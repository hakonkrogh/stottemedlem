# Use case: Export the member list

**Status:** Draft
**Solves:** [Problem: Keeping an accurate list of who has paid](../problems/keeping-an-accurate-member-list.md)

## Goal
An organization takes its member register with it — one click gives a
spreadsheet file of every supporting member, so the organization can manage,
contact, and work with its members in whatever tool it already uses.

## Why this exists
The register is the organization's own data, not the product's. The product
deliberately does **not** carry the organization's own messages to members
(that feature was removed — see
[Keep supporting members in the loop](keep-supporters-in-the-loop.md),
retired): when the organization wants to thank, inform, or involve its
members, it does so through its own channels, and the export is how the
register gets there.

## Actors
- **Organization administrator** — downloads the file.

## Preconditions
- The organization has at least one supporting member.

## Behaviour
1. The member list in the back office offers a download of the whole register
   as a spreadsheet-friendly file (CSV). One click, no options to configure.
2. The file opens correctly by double-click in common desktop spreadsheet
   tools on Norwegian-locale machines — delimiters and character encoding are
   the product's problem, never the administrator's.
3. Each member is one row carrying what the member list itself shows: name,
   email, phone, derived status, the membership (tier) and period last paid
   for, the amount actually paid, whether the arrangement renews
   automatically, and when the member was first registered.
4. The export says exactly what the register says at the moment it is
   downloaded — the same derived status as the list, never more and never
   less. It is a copy, not a second source of truth: the register in the
   product stays the accurate one, maintained by payments.
5. The export is available to administrators only, behind the same access as
   the rest of the back office.

## Acceptance criteria
- [ ] The member list offers the download whenever there is at least one
      member.
- [ ] The file opens with correct Norwegian characters and one column per
      field in desktop spreadsheet tools, without an import wizard.
- [ ] Every member appears exactly once, with the same derived status the
      member list shows.
- [ ] Amounts and periods reflect what was actually paid, as recorded.
- [ ] The export is not reachable without back-office access to the
      organization.

## Out of scope
- Imports — the register is maintained by payments, never by uploads.
- Filtered, scheduled, or synchronized exports; CRM integrations.

## Related
- [Use case: Curate the member list](curate-member-list.md) — the screen the
  export lives on, and the register it copies.
- [Concept: Supporting member](../concepts/supporting-member.md)
- [Concept: Membership](../concepts/membership.md)
