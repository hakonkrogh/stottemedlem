# Concept: Join page

**Status:** Draft

## Definition
The **join page** is the single public web page the product hosts for every
[organization](organization.md), at a stable address derived from the
organization's slug. It is the one address an organization has: what it spreads
to its community as a link and as scannable forms of that link such as a
[QR code card](../use-cases/promote-with-qr-card.md), what a prospective
supporter arrives at, and what an administrator pastes into forms that ask for
"your website". It presents the organization — name, visual identity,
organisasjonsnummer, contact information — together with the supporting
membership offer: the organization's [membership tiers](membership-tier.md)
with their [annual fees](annual-fee.md), each with its own call to action to
[join](../use-cases/join-as-supporting-member.md). It links to a standard
**sales-terms page** (salgsvilkår) for the membership. Both pages are reachable
by anyone, with no login.

Its Norwegian address reads as a sentence with the organization's slug
appended — `støttemedlem.no/bli-medlem/nordnes-skolekorps` — which is what a
supporter sees before they click and what an organization reads aloud when it
tells people how to support it.

## Why it exists
The whole point of the product is that support collects itself: the
organization shares one address once, and supporters can join and pay without
any admin involvement. One address is the invariant — every way of sharing
(link, QR code, embed, poster) points at the same destination, so an
organization never has to explain which of its links does what.

That destination has to be a real page, for two reasons. First, payment
providers require a merchant to have a public website before approving
recurring payments: Vipps' *Faste betalinger* order form demands a live page
showing company name, org.nr, contact information, and products with prices,
plus a separate sales-terms page covering at minimum payment, right of
withdrawal, returns, and complaint handling — each URL is actively verified.
The product's target organizations (school bands, choirs, community groups)
often have no website at all, so the product hosts one for them: the
organization fills in its profile once, and gets two URLs to paste into the
Vipps portal. Second, an organization may offer several
[membership tiers](membership-tier.md), and a supporter must see and pick one
before paying — so a page, not a bare hand-off, is what the address must
resolve to.

## Rules & invariants
- Every organization has exactly one join page and one sales-terms page, live
  as soon as the organization exists.
- The address derives from the organization's **slug** (see
  [organization](organization.md)) and is **stable**: material that carries it
  (posters, printed QR cards, embeds on external websites, a payment
  provider's merchant record) keeps working without reprinting or
  re-registering when the organization changes details such as its
  [annual fee](annual-fee.md), its imagery, or its name. If the product ever
  moves the address, the former one keeps resolving to the new one — a printed
  code must never lead nowhere.
- Anyone with the address can start joining — it requires no login or
  invitation.
- The shareable address lives on the **environment's own** public origin.
  Production's is the canonical `støttemedlem.no` origin; a test environment
  (staging) hands out its own addresses everywhere the product presents the
  address — the links the back office shows an administrator, and what the QR
  code encodes — so a rehearsal on staging stays on staging and never sends a
  test supporter to production. Navigation between the public pages themselves
  keeps the visitor on whatever origin they arrived at.
- There is **one** address per organization, never one per
  [membership tier](membership-tier.md). The product does not offer a
  shareable link to an individual membership: the organization spreads the
  single address, and a supporter picks the membership they want on the page.
  A tier a supporter has picked is carried onward into joining, but that is
  internal navigation, not a second address to share.
- The page opens with an **invitation, not a brochure**: a headline asking the
  visitor to become a supporting member ("Bli støttemedlem") and a subheadline
  that explains in plain words what the page is for and restates the product's
  promise — a membership that renews year by year, puts the supporter on the
  organization's member list, and makes their support count over time. The
  subheadline outlines the membership offer the organization has: with a single
  [tier](membership-tier.md) it simply describes that one membership and its
  [annual fee](annual-fee.md); with several tiers it says the supporter can
  choose between them; it never enumerates options that don't exist.
- The page presents the organization's active
  [membership tiers](membership-tier.md) as the offer, cheapest first — each
  with its name, description (when set), annual fee, and a join call to action
  for that tier. Archived tiers never appear. There is always at least one tier
  to show (see [membership tier](membership-tier.md): the first is stated when
  the organization is created), so the page always presents a real, priced
  offer — which is exactly what payment-provider approval evaluates it against.
- Choosing a membership takes the supporter **into Vipps** to pay. The page is
  a doorstep, not a queue: nothing of ours stands between the choice and the
  payment unless something genuinely cannot be obtained through Vipps. What a
  supporter pays is a fresh transaction at the current
  [annual fee](annual-fee.md), so a printed code cannot carry the payment
  itself — the stable address in the middle is what lets a years-old poster
  still charge today's price.
- The page shows what payment-provider verification requires: the
  organization's public name, organisasjonsnummer, contact information, and the
  supporting membership(s) with current [annual fees](annual-fee.md). The
  product requires these fields of the organization (see
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
  means centered. Either image is optional and simply omitted when absent (logo
  alone sits beside the name; no reserved empty space). The organization's
  imagery never displaces the verification-required profile fields. This
  identity presentation is **one thing shown in every place** an organization
  is presented: the join page, the receipt a new supporter lands on, and the
  back office's own preview of the public page (see
  [Set up a supporting membership](../use-cases/set-up-supporting-membership.md)),
  so what an administrator sees in the back office is what a supporter sees.
- The sales-terms page is **one standard template for every organization**,
  populated with the organization's profile, and lives beneath the same
  address. It covers at minimum: payment (Vipps, charged on joining and renewed
  yearly with prior notice), the statutory 14-day right of withdrawal, returns
  (none — the membership is a service; cancelling stops future renewals), and
  complaint handling (contact the organization; escalate to the consumer
  authority). Organizations do not write their own terms.
- Both pages carry the [brand attribution](brand-attribution.md) and must be
  indexable (payment-provider verification must be able to read them).
- The pages are usually **arrived at from another app** — a link in an email, a
  chat message, or the hand-back from Vipps — and must open **readable from
  the top** and remain fully scrollable there. Some phone browsers hand such a
  page over with its top tucked under the system status bar; the page must
  always leave the visitor a way to pull it back into view, and must never
  fight the visitor's own scrolling to do so.
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
- Is where [joining as a supporting member](../use-cases/join-as-supporting-member.md)
  begins.
- Is what the [QR code card](../use-cases/promote-with-qr-card.md) encodes.
- Carries the [brand attribution](brand-attribution.md).

## Referenced by
- [Use case: Set up a supporting membership](../use-cases/set-up-supporting-membership.md)
- [Use case: Join as a supporting member](../use-cases/join-as-supporting-member.md)
- [Use case: Promote membership with a QR code card](../use-cases/promote-with-qr-card.md)
- [Concept: Organization](organization.md)
