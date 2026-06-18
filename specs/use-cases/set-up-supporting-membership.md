# Use case: Set up a supporting membership

**Status:** Draft
**Solves:** [Problem: Collecting annual support is manual and leaky](../problems/collecting-annual-support.md)

## Goal
An organization configures, in minutes, everything needed to start accepting
supporting members and their annual fee.

## Actors
- **Organization administrator** — sets it up on the organization's behalf.

## Preconditions
- The administrator has an account and an [organization](../concepts/organization.md).

## Behaviour
From the organization's point of view:

1. The administrator gives the organization a public-facing name (what supporters
   will recognize) and basic identity.
2. The administrator sets the [annual fee](../concepts/annual-fee.md) — the amount
   a supporter pays for one year of supporting membership.
3. The organization is given a shareable way for supporters to join (e.g. a link
   the organization can put on its site, social media, or posters).
4. Once configured, the organization is ready to receive supporting members; no
   further setup is required to take the first payment.

## Acceptance criteria
- [ ] An administrator can set the organization's public name and annual fee.
- [ ] After setup the organization has a shareable join entry point.
- [ ] A supporter using that entry point can complete
      [joining](join-as-supporting-member.md) without further admin action.
- [ ] The annual fee can be changed later; the change applies to future joins and
      renewals, not retroactively to fees already paid.

## Out of scope
- Multiple membership tiers or variable pricing (single annual fee only for now).
- Branding/theming beyond a name and basic identity.
- Tax/receipt configuration.

## Related
- [Concept: Organization](../concepts/organization.md)
- [Concept: Annual fee](../concepts/annual-fee.md)
