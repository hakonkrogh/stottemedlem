# Concept: Scorecard

**Status:** Draft

## Definition
A **scorecard** is the visible recognition a [supporting member](supporting-member.md)
earns for backing an [organization](organization.md). It has two counters:
**hearts** — one heart for every annual period the member has supported that
organization — and a **recruit count** — how many supporting members joined
through that member's referral. Together they read like points: years of
loyalty and members brought in.

## Why it exists
Support is otherwise invisible: a member who has paid for eight years looks
exactly like one who joined yesterday, and the member who convinces friends to
join gets nothing for it. The scorecard turns loyalty and word of mouth into
something a member can see, show off, and be thanked for — which is itself a
perk of being a member, and a growth loop for the organization.

## Rules & invariants
- Hearts and recruit count are **derived, never hand-edited**: hearts from the
  member's [membership](membership.md) periods (one per supported annual
  period), the recruit count from completed referred joins.
- Because hearts are derived, a period that goes away takes its heart with it:
  a payment refunded in full is a year that was not supported after all
  ([refund a payment](../use-cases/refund-a-payment.md)). Nothing special
  happens — the counter simply counts what is there. A member's recruits keep
  their own memberships and their own hearts regardless; one person's refund is
  never another's loss.
- A scorecard is **per organization** — hearts count years supporting *that*
  organization and do not transfer between organizations.
- **On the [member card](member-card.md), the years read as a streak** (chosen
  2026-09-01): one big brand heart carrying the count — "3", then "3 år som
  støttemedlem!" — rather than a heart per year. The card celebrates the
  number, and the number stays legible whether the member is in year one or
  year thirty. There is still no maximum and no empty placeholder — the heart
  simply counts what is there.
- **Elsewhere, hearts are drawn as an accumulating buildup, ten to a row**:
  each heart shown individually (like hearts in a video game HUD), a row
  filling up at ten, the eleventh starting a new row underneath — only earned
  hearts, no empty placeholders, because there is no maximum. Where a surface
  is too tight for the full buildup (a list row, a spreadsheet export), the
  count stands in ("❤️ 12").
- Hearts appear wherever the member is looked at: their own
  [member card](member-card.md) — which is how they reach the member's
  [self-service page](member-self-service.md) and their
  [receipts](payment-receipt.md), those surfaces showing the card rather than
  counting the hearts again beside it — plus the organization's member list and
  member detail, and the member-list export. The recruit count travels with
  them everywhere a surface has room for it — but only once it is above zero,
  since "0 recruited" says nothing worth saying.
- The member's hearts are the [brand mark](brand-mark.md) multiplied: the same
  red heart that identifies the product is what a member collects, one per
  year — supporting is the act the heart stands for, so the counter and the
  brand deliberately share the glyph.
- The scorecard's own object is the [member card](member-card.md): one card per
  member per organization, showing the scorecard and a QR code, and shareable
  at an address of its own. Scanning that QR code leads into the organization's
  join flow with a referral back to the member.
- A referral counts toward the recruit count only when the referred person
  **completes** joining (becomes a paying supporting member) — scans alone
  score nothing.
- A recruit is attributed to at most one referring member, decided when they
  join and never revised afterwards. Someone who has supported the organization
  before is not recruited by whoever's card they happened to scan: they were
  already here.

## Relationships
- Belongs to one [supporting member](supporting-member.md) (for their one
  [organization](organization.md)).
- Hearts are derived from the member's [memberships](membership.md).
- Hearts share their glyph with the [brand mark](brand-mark.md) on purpose.
- Recruits are other supporting members whose join carried this member's
  referral.
- Is shown, and shared, as the [member card](member-card.md).

## Referenced by
- [Use case: Earn hearts and recruit new members](../use-cases/earn-hearts-and-recruit.md)
- [Problem: Loyalty is invisible and word of mouth goes untracked](../problems/invisible-loyalty-and-word-of-mouth.md)
