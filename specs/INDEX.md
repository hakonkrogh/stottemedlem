# støttemedlem — product specification

> The high-level map of what this product is, the problems it solves, and what
> it should do. This is the always-available entry point for any agent or person.
> It describes **intent and behaviour, never implementation** — the code is the
> implementation.

## What this product is

**støttemedlem** (Norwegian for "supporting member") is a SaaS that lets small
organizations — marching bands, choirs, sports teams, community groups — offer a
simple **supporting membership**: people pay a yearly fee to back the
organization they care about.

The product has **one job**: let an organization curate its list of supporting
members, and let supporters join and pay their annual fee. Around that core, the
organization can also thank its supporting members and keep them informed and
involved — the register is worth having because you can act on it. It is
**B2C** — an organization onboards and configures its membership, then its
community signs up and pays directly. It is deliberately *not* a full CRM,
accounting suite, or event platform; everything outside curating supporting
members, collecting their annual fee, and keeping them in the loop is out of
scope.

**Primary actors:** the **organization** (an admin acting on its behalf) and the
**supporting member** (a person from the community).

## How to use this spec layer

- **New here?** Read this file top to bottom, then follow links into the layer
  you need.
- **Changing the product?** Follow the mandatory loop in
  [`process.md`](process.md). It is enforced by a `Stop` hook.
- **Three layers:** [problems](problems/) (why) → [use cases](use-cases/) (what)
  → [concepts](concepts/) (shared vocabulary). Each file links to the others.

## Problems — *why the product exists*

| Problem | Status | Solved by |
|---------|--------|-----------|
| [Collecting annual support is manual and leaky](problems/collecting-annual-support.md) | Draft | [Join as a supporting member](use-cases/join-as-supporting-member.md) |
| [Keeping an accurate list of who has paid](problems/keeping-an-accurate-member-list.md) | Draft | [Curate the member list](use-cases/curate-member-list.md), [Renew annual membership](use-cases/renew-annual-membership.md) |
| [Supporters never hear back from the organization](problems/supporters-never-hear-back.md) | Draft | [Keep supporting members in the loop](use-cases/keep-supporters-in-the-loop.md) |
| [Loyalty is invisible and word of mouth goes untracked](problems/invisible-loyalty-and-word-of-mouth.md) | Draft | [Earn stars and recruit new members](use-cases/earn-stars-and-recruit.md) |

## Use cases — *what the product does*

| Use case | Status | Solves |
|----------|--------|--------|
| [Access the back office](use-cases/access-the-back-office.md) | Draft | [Collecting annual support](problems/collecting-annual-support.md) |
| [Set up a supporting membership](use-cases/set-up-supporting-membership.md) | Draft | [Collecting annual support](problems/collecting-annual-support.md) |
| [Join as a supporting member](use-cases/join-as-supporting-member.md) | Draft | [Collecting annual support](problems/collecting-annual-support.md) |
| [Change the annual fee](use-cases/change-the-annual-fee.md) | Draft | [Collecting annual support](problems/collecting-annual-support.md) |
| [Curate the member list](use-cases/curate-member-list.md) | Draft | [Keeping an accurate list](problems/keeping-an-accurate-member-list.md) |
| [Renew annual membership](use-cases/renew-annual-membership.md) | Draft | [Keeping an accurate list](problems/keeping-an-accurate-member-list.md) |
| [Promote membership with a QR code card](use-cases/promote-with-qr-card.md) | Draft | [Collecting annual support](problems/collecting-annual-support.md) |
| [Keep supporting members in the loop](use-cases/keep-supporters-in-the-loop.md) | Draft | [Supporters never hear back](problems/supporters-never-hear-back.md) |
| [Earn stars and recruit new members](use-cases/earn-stars-and-recruit.md) | Draft | [Invisible loyalty and word of mouth](problems/invisible-loyalty-and-word-of-mouth.md) |

## Concepts — *shared vocabulary*

| Concept | Status |
|---------|--------|
| [Organization](concepts/organization.md) | Draft |
| [Administrator](concepts/administrator.md) | Draft |
| [Supporting member](concepts/supporting-member.md) | Draft |
| [Membership](concepts/membership.md) | Draft |
| [Membership tier](concepts/membership-tier.md) | Draft |
| [Annual period](concepts/annual-period.md) | Draft |
| [Annual fee](concepts/annual-fee.md) | Draft |
| [Join page](concepts/join-page.md) | Draft |
| [Member self-service page](concepts/member-self-service.md) | Draft |
| [Member notice](concepts/member-notice.md) | Draft |
| [Organization message](concepts/org-message.md) | Draft |
| [Payment reconciliation](concepts/payment-reconciliation.md) | Draft |
| [Vipps API keys](concepts/vipps-api-keys.md) | Draft |
| [Brand attribution](concepts/brand-attribution.md) | Active |
| [Scorecard](concepts/scorecard.md) | Draft |

---

When you add a spec, register it in the matching table above and cross-link it.
Templates live next to each layer (`problems/_TEMPLATE.md`, etc.).
