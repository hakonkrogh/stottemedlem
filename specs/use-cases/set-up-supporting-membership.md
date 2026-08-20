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
   [join page](../concepts/join-page.md) must show them for a payment
   provider to approve recurring payments.
2. Creating the organization includes stating its **first membership**: a
   minimal [membership tier](../concepts/membership-tier.md) — the default
   membership name with the [annual fee](../concepts/annual-fee.md) the
   administrator enters. This minimum is required because the payment
   provider evaluates the public page against a real, priced product; the
   creation step keeps it to a single amount so it doesn't stall getting
   started, and everything about it can be changed later.
3. The administrator refines the membership offer in the back office. The
   organization's **overview page lists all its memberships**, presented as
   the very same membership cards the public join page shows (see the
   one-presentation rule in [membership tier](../concepts/membership-tier.md))
   — reviewing the offer *is* seeing what supporters see. Selecting a
   membership opens it for **editing on its own page**; after the list, an
   **add button** opens the same page for creating a new one — creating and
   editing a membership are one mechanism, kept apart from the overview so
   the stored offer is never confused with a half-filled form. Standard
   **templates** (a basic supporting membership and a VIP level) prefill the
   name and a standard description so the wording doesn't have to be
   invented; the administrator always sets the price (a suggested amount is
   shown). Each tier gets a stable identifier at creation (its **key**),
   stamped onto the tier's payment agreements in Vipps so agreements there
   can always be traced back to the tier. The key is internal plumbing — the
   administrator never sees it and is never given a link to an individual
   membership; what the organization shares is the one join page. Tiers
   can be renamed, repriced, and archived — never deleted — a rename never
   changes the key, and the **last active tier cannot be archived** (the
   organization always offers at least one membership).
4. The organization is given a stable slug and, from it, its one public
   address: a shareable [join page](../concepts/join-page.md) — a link the
   organization can put on its site or social media, or turn into a
   [QR code card](promote-with-qr-card.md) for posters and external websites —
   with its sales-terms page beneath the same address. Those two URLs are what
   the payment-provider order form asks for.
5. The administrator connects the organization's own Vipps agreement by adding
   its [Vipps API keys](../concepts/vipps-api-keys.md). The product proves the
   keys work with a live check against Vipps before keeping them; until they
   are added, the back office prompts for them.
6. Once configured, the organization is ready to receive supporting members; no
   further setup is required to take the first payment.

An organization created before a profile field was required (or before this
behaviour existed) is **prompted in the back office** to complete the missing
fields, and can edit its profile there at any time.

The organization can also give its join page a **visual identity**: in the
back-office settings it can edit its details (name and profile) and upload a
**logo** and a **banner image**, shown on the
[join page](../concepts/join-page.md). For the banner the
organization can also pick the **focal point** — which part of the image stays
in view where the page crops it — with a preview that fades the cropped-away
parts around a draggable visible-area frame. Both images are optional, can
be replaced or removed at any time, and changes show on the public page
immediately. A name change never changes the slug or the public addresses.

## Acceptance criteria
- [ ] An administrator can create the organization with its public name,
      profile (organisasjonsnummer, contact information), and the first
      membership's annual fee; all are required at creation, and the created
      organization immediately offers one membership at that fee under the
      default membership name.
- [ ] Membership tiers are managed after creation in the back office: the
      administrator can add a tier (name, optional description, annual fee),
      edit it, and archive it — except the last active tier, which cannot be
      archived, so the organization always offers at least one membership.
- [ ] The organization's overview lists every active membership as the same
      membership card the public join page shows; selecting one opens it
      for editing on its own page, and an add button after the list opens the
      same page for creating a new one.
- [ ] When adding a tier, the administrator can start from a standard
      template (basic or VIP) that prefills name and description with
      standard texts; the price field stays empty with a suggested amount,
      and everything prefilled remains editable before and after creation.
- [ ] The description is written in a multi-line field that shows the whole
      text at once, accepts up to 200 characters including line breaks, and
      the join page shows it as written.
- [ ] A tier's key is assigned at creation and never changes — not even when
      the tier is renamed. It is not shown to the administrator, and the back
      office offers no link to an individual membership.
- [ ] After setup the organization has one shareable, live join page with its
      sales-terms page, both at stable addresses.
- [ ] An organization missing required profile fields sees a prompt in the back
      office and can complete them; the join page reflects the change
      immediately.
- [ ] An administrator can add the organization's
      [Vipps API keys](../concepts/vipps-api-keys.md); a set Vipps rejects is
      not stored, and the administrator is told why. Stored secrets are only
      ever shown masked.
- [ ] A supporter using that address can complete
      [joining](join-as-supporting-member.md) without further admin action.
- [ ] A tier's annual fee can be changed later; the change applies to future
      joins and renewals, not retroactively to fees already paid.
- [ ] An administrator can edit the organization's name and profile, and upload,
      replace, or remove a logo and a banner image in the back office; the
      join page picks the change up on its own (at the latest from the next
      visit — see [join page](../concepts/join-page.md) freshness),
      and a name change never changes the slug.
- [ ] An administrator can choose the banner's focal point by dragging the
      visible-area frame in the settings preview; the join page crops the
      banner around that point.

## Out of scope
- Variable or pay-what-you-want pricing (every tier has one fixed annual fee).
- Reordering tiers by hand (they are presented cheapest first).
- Theming beyond the name, logo, and banner image (no custom colors, fonts, or
  page layouts).
- Tax/receipt configuration.

## Related
- [Concept: Organization](../concepts/organization.md)
- [Concept: Membership tier](../concepts/membership-tier.md)
- [Concept: Annual fee](../concepts/annual-fee.md)
- [Concept: Vipps API keys](../concepts/vipps-api-keys.md)
- [Concept: Join page](../concepts/join-page.md)
- [Use case: Promote membership with a QR code card](promote-with-qr-card.md)
