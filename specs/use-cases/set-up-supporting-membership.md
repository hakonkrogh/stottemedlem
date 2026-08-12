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
   will recognize) and its **public profile**: organisasjonsnummer and contact
   information. These are required — the organization's
   [landing page](../concepts/org-landing-page.md) must show them for a payment
   provider to approve recurring payments.
2. The administrator sets the [annual fee](../concepts/annual-fee.md) — the amount
   a supporter pays for one year of supporting membership. This is deliberately
   **not** asked for in the creation step (deciding a price is a bigger decision
   than naming the organization, and would stall getting started): the fee is set
   afterwards in the back office, and until it is set the organization is treated
   as having an incomplete profile and is prompted to finish it.
3. The organization is given a stable slug and, from it, its public addresses: a
   shareable [join entry point](../concepts/join-entry-point.md) (e.g. a link the
   organization can put on its site or social media, or a
   [QR code card](promote-with-qr-card.md) for posters and external websites)
   and its [landing page](../concepts/org-landing-page.md) with the sales-terms
   page — the two URLs the payment-provider order form asks for.
4. Once configured, the organization is ready to receive supporting members; no
   further setup is required to take the first payment.

An organization created before a profile field was required (or before this
behaviour existed) is **prompted in the back office** to complete the missing
fields, and can edit its profile there at any time.

## Acceptance criteria
- [ ] An administrator can create the organization with its public name and
      profile (organisasjonsnummer, contact information); those fields are
      required at creation, while the annual fee is **not** asked for there.
- [ ] The annual fee is set after creation in the back office; until it is set,
      the organization counts as having an incomplete profile (and the landing
      page shows no price).
- [ ] After setup the organization has a shareable join entry point and a live
      landing page + sales-terms page at stable addresses.
- [ ] An organization missing required profile fields sees a prompt in the back
      office and can complete them; the landing page reflects the change
      immediately.
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
- [Concept: Join entry point](../concepts/join-entry-point.md)
- [Concept: Organization landing page](../concepts/org-landing-page.md)
- [Use case: Promote membership with a QR code card](promote-with-qr-card.md)
