# Concept: Agent discovery

**Status:** Draft

## Definition
How a search engine or an AI agent finds the public site and learns what is on
it, without a person guiding it. The site offers three things for this: a
`robots.txt` that lets every crawler in, a sitemap of the public pages, and an
`/llms.txt` that describes the product and its public pages in plain text.

## Why it exists
People increasingly ask an AI assistant instead of searching. If an assistant
can read what støttemedlem.no is and where an organization's join page lives,
it can point both a curious organization and a would-be supporter to the right
place. It is the same word-of-mouth the [brand attribution](brand-attribution.md)
serves, carried by machines.

## Rules & invariants
- **Every crawler may read every public page.** Nothing public is hidden from
  crawlers; pages behind a sign-in are not public and are not described.
- **The sitemap lists the front page and the join page of every organization
  with at least one supporting member**, and no other organization's (see
  [Sign up for early access](../use-cases/sign-up-for-early-access.md)).
- **`/llms.txt` says what the product is and links its public pages**: the
  front page, where an organization signs up, the data processing agreement,
  the sitemap, and the contact address. It explains the join page's address
  pattern instead of listing organizations, so it names no organization and
  never goes stale as organizations come and go.
- **`/llms.txt` links only addresses the site really serves**, the same ones the
  front page uses. A wrong link there is worse than none.
- **It speaks like the front page**: in Norwegian, for every kind of
  organization without listing kinds, and it never promises messaging members
  through the product.
- No `agents.txt` or similar file is published until such a format has real
  readers; the competing proposals in 2026 have none.

## Relationships
- Describes the front page of [Sign up for early access](../use-cases/sign-up-for-early-access.md)
  and the [join page](join-page.md).
- Links the [data processing agreement](data-processing-agreement.md).
- Written with the ø in visible text, punycode in addresses, as
  [brand attribution](brand-attribution.md) requires.
