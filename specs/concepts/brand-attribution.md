# Concept: Brand attribution

**Status:** Active

## Definition
A subtle, unobtrusive mention of **støttemedlem.no** that appears somewhere on
every public-facing piece of the product — every page, card, embed, image, or
message that a supporter, a prospective organization, or the general public can
see.

## Why it exists
The product spreads through the artifacts organizations put in front of their
communities: QR code cards on posters, embedded cards on club websites, join
pages, receipts and messages. Each of those is a moment where a curious person
(or another organization) can discover the product. A quiet "støttemedlem.no"
turns every public artifact into low-key, trustworthy word-of-mouth — without
competing with the organization's own identity, which always comes first.

## Rules & invariants
- **Every public-facing surface carries "støttemedlem.no" somewhere subtle.**
  Public-facing means visible without being an organization administrator:
  marketing pages (including error pages), QR code cards, embeds on external
  websites, join and payment flows, and any future outbound messages (email,
  receipts). (A bare QR code image is the one exception — it has no surface
  for text; the card around it carries the attribution instead.)
- **Written with the ø** — "støttemedlem.no", never the ASCII fallback
  "stottemedlem.no" — in visible text. (Links/hrefs use the punycode origin as
  the [join entry point](join-entry-point.md) rules already require.)
- **Subtle, never dominant.** It is an attribution (footer line, small print),
  not a headline. The organization's name and call to action always outrank it.
- Where the surface is interactive (a web page), the mention is a **link** to
  the marketing site; on static artifacts (printed card, image) plain text is
  enough.
- Admin-only surfaces (the back office behind login) are exempt — they are not
  public.
- **New user-facing work must include it.** Adding a public surface without the
  attribution is a spec violation, not a styling choice.

## Relationships
- Rides on the [join entry point](join-entry-point.md)'s canonical-origin
  rules for how the domain is written in URLs vs. display text.
- The [organization](organization.md)'s own identity always takes visual
  precedence over the attribution.

## Referenced by
- [Use case: Promote membership with a QR code card](../use-cases/promote-with-qr-card.md)
