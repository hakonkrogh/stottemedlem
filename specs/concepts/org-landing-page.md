# Concept: Organization landing page

**Status:** Draft

## Definition
The **organization landing page** is a public web page the product hosts for
every [organization](organization.md), at a stable address derived from the
organization's slug. It presents the organization's public profile — name,
organisasjonsnummer, contact information — together with the supporting
membership offer and its [annual fee](annual-fee.md), and links to a standard
**sales-terms page** (salgsvilkår) for the membership. Both pages are reachable
by anyone, with no login.

## Why it exists
Payment providers require a merchant to have a public website before approving
recurring payments: Vipps' *Faste betalinger* order form demands a live page
showing company name, org.nr, contact information, and products with prices,
plus a separate sales-terms page covering at minimum payment, right of
withdrawal, returns, and complaint handling — each URL is actively verified.
The product's target organizations (school bands, choirs, community groups)
often have no website at all, so the product hosts one for them: the
organization fills in its profile once, and gets two URLs to paste into the
Vipps portal. Beyond satisfying Vipps, the page doubles as the organization's
shareable public home for prospective supporting members.

## Rules & invariants
- Every organization has exactly one landing page and one sales-terms page,
  live as soon as the organization exists.
- Their addresses derive from the organization's **slug** (see
  [organization](organization.md)) and are **stable**: once registered with a
  payment provider or shared, they keep working — a name change never moves
  them.
- The landing page shows what payment-provider verification requires: the
  organization's public name, organisasjonsnummer, contact information, and
  the supporting membership with its current [annual fee](annual-fee.md).
  The product requires these fields of the organization (see
  [Set up a supporting membership](../use-cases/set-up-supporting-membership.md));
  a field the organization has not yet provided is omitted rather than shown
  empty.
- The page presents the organization's **visual identity** when uploaded: the
  banner image as a low, wide **backdrop** above the organization's name, with
  the logo overlapping the banner's bottom edge (as LinkedIn profiles do). The
  banner is decoration, not a hero — it must stay compact so the membership
  offer remains near the top of the page. Either image is optional and simply
  omitted when absent (logo alone sits above the name; no reserved empty
  space). The organization's imagery never displaces the verification-required
  profile fields.
- The sales-terms page is **one standard template for every organization**,
  populated with the organization's profile. It covers at minimum: payment
  (Vipps, charged on joining and renewed yearly with prior notice), the
  statutory 14-day right of withdrawal, returns (none — the membership is a
  service; cancelling stops future renewals), and complaint handling (contact
  the organization; escalate to the consumer authority). Organizations do not
  write their own terms.
- The landing page links to the [join entry point](join-entry-point.md) as its
  call to action, but is **not part of the join path**: shared join links and
  QR codes still hand off directly to payment, never via the landing page.
- Both pages carry the [brand attribution](brand-attribution.md) and must be
  indexable (payment-provider verification must be able to read them).

## Relationships
- Belongs to one [organization](organization.md); shows its
  [annual fee](annual-fee.md).
- Links to the [join entry point](join-entry-point.md) — a signpost to it, not
  a step within it.
- Carries the [brand attribution](brand-attribution.md).

## Referenced by
- [Use case: Set up a supporting membership](../use-cases/set-up-supporting-membership.md)
- [Concept: Organization](organization.md)
- [Concept: Join entry point](join-entry-point.md)
