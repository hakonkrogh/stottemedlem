# Concept: Organization landing page

**Status:** Draft

## Definition
The **organization landing page** is a public web page the product hosts for
every [organization](organization.md), at a stable address derived from the
organization's slug. It presents the organization's public profile — name,
organisasjonsnummer, contact information — together with the supporting
membership offer: the organization's [membership tiers](membership-tier.md)
with their [annual fees](annual-fee.md), and links to a standard
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
- The landing page opens with an **invitation, not a brochure**: a headline
  asking the visitor to become a supporting member ("Bli støttemedlem") and a
  subheadline that explains in plain words what the page is for and restates
  the product's promise — a membership that renews year by year, puts the
  supporter on the organization's member list, and makes their support count
  over time. The subheadline outlines the membership offer the organization
  has: with a single [tier](membership-tier.md) it simply describes that one
  membership and its [annual fee](annual-fee.md); with several tiers it says
  the supporter can choose between them; it never enumerates options that
  don't exist.
- The page presents the organization's active
  [membership tiers](membership-tier.md) as the offer, cheapest first — each
  with its name, description (when set), annual fee, and a join call to
  action for that tier. Archived tiers never appear. There is always at least
  one tier to show (see [membership tier](membership-tier.md): the first is
  stated when the organization is created), so the page always presents a
  real, priced offer — which is exactly what payment-provider approval
  evaluates it against.
- The landing page shows what payment-provider verification requires: the
  organization's public name, organisasjonsnummer, contact information, and
  the supporting membership(s) with current [annual fees](annual-fee.md).
  The product requires these fields of the organization (see
  [Set up a supporting membership](../use-cases/set-up-supporting-membership.md));
  a field the organization has not yet provided is omitted rather than shown
  empty.
- The page presents the organization's **visual identity** when uploaded, in
  the familiar social-page arrangement (as Facebook pages do): the banner image
  as a wide **backdrop** at the top, with the logo overlapping the banner's
  bottom edge and the organization's name beside it. The logo is always framed
  in a **circle with a subtle outline** — everywhere the product shows a logo,
  it shows it in that circle, so differently shaped logos still read as one
  consistent mark. The banner is decoration, not a hero — it stays bounded in
  height so the membership offer remains near the top of the page. Because the
  backdrop crops the banner, the organization can choose the banner's **focal
  point** — which part of the image stays in view — with a picker that fades
  the cropped-away parts and lets the visible-area frame be dragged; unset
  means centered. Either image is optional and simply omitted when absent
  (logo alone sits beside the name; no reserved empty space). The
  organization's imagery never displaces the verification-required profile
  fields.
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
- Both pages are served **instantly from a saved copy** rather than assembled
  on every request, so they stay fast and stay up even when the rest of the
  product is busy. Every visit refreshes the saved copy in the background:
  after the organization changes its profile, tiers, or imagery, one visit may
  still see the previous version, and every visit after that sees the update.
  Nothing an administrator must do — the page heals itself on traffic.

## Relationships
- Belongs to one [organization](organization.md); shows its
  [membership tiers](membership-tier.md) and their
  [annual fees](annual-fee.md).
- Links to the [join entry point](join-entry-point.md) — a signpost to it, not
  a step within it.
- Carries the [brand attribution](brand-attribution.md).

## Referenced by
- [Use case: Set up a supporting membership](../use-cases/set-up-supporting-membership.md)
- [Concept: Organization](organization.md)
- [Concept: Join entry point](join-entry-point.md)
