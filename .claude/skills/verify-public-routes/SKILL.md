---
name: verify-public-routes
description: Assert the HTTP contract of the public join pages (status, redirects, x-sm-cache, body text) the way a browser, a QR scanner, or Vipps' website verification sees it — plus a tier-aware local D1 seed. Use after touching routes, middleware, worker.ts caching/redirects, or anything under src/pages/bli-medlem/.
---

# Verify public routes

The public surface has contracts that a build, typecheck, and unit tests all
pass while broken: the join page must 200, its former `/org/*` address must 301
with the query intact, and the stale-while-revalidate cache must go
`miss` → `hit`. This drives them over real HTTP.

## Read what's actually in local D1

    bash .claude/skills/verify-public-routes/d1.sh "<SQL>"     # rows as JSON, nothing else

Wrangler wraps every result in banners and a table, so ad-hoc `d1 execute`
calls need re-quoting and grepping each time; this prints just the rows, and
carries the load-bearing `CI=1`. Read-only by convention — `seed.sh` writes.
Since migration 0005 the interesting tables are the member registry:
`supporting_members`, `membership_agreements`, `memberships`,
`membership_charges` (see `project-overview`). Handy for proving an invariant
holds rather than assuming it:

    d1.sh "SELECT count(*) AS n FROM memberships WHERE period_year = 2026"

`seed.sh` also writes ONE supporting member with an ACTIVE agreement, a
captured charge and a current-year membership, so member-list queries have a
baseline. It is a single happy-path member — the member list's other states
(lapsed, no name, approved-but-not-yet-paid) are covered by Storybook fixtures
in `apps/backoffice/src/components/memberFixtures.ts`, not by the seed. Note
the seeded org (`org-seed-1`/`wos-seed-1`) is fictitious and belongs to no
WorkOS organization, so **no real login can open its back-office pages** — to
click through an auth-gated screen with data, seed rows against your own org's
id instead.

## Seed first (pages read D1)

    bash .claude/skills/verify-public-routes/seed.sh [slug]     # default: eksempel-musikkorps

Idempotent; writes ONE fictitious org (`org-seed-1`) with **two membership
tiers**. The tiers matter: since tiering landed (2026-08-19)
`organizations.annual_fee_nok` is LEGACY and unused, so an org seeded without
`membership_tiers` rows renders the *zero-tier degraded* page, not the real
offer — a silently wrong baseline for screenshots and assertions.

It also applies pending D1 migrations first (`CI=1 wrangler d1 migrations
apply DB --local`), so a fresh worktree seeds instead of dying with `no such
table: organizations`. The `CI=1` is load-bearing everywhere wrangler is
chained in a script: interactively it stops on `? About to apply N
migration(s)` and waits forever — which is exactly how the `pnpm dev`
self-heal was silently dead until 2026-08-20 (see `project-overview`).

Local D1 lives in `apps/backoffice/.wrangler` and is shared **live** with a
running `astro dev` — seed after starting the server, no restart needed. Seed
only fictitious names/orgnr.

## Assert

    node .claude/skills/verify-public-routes/routes.mjs <url> [assertions...]

| assertion | checks |
|-----------|--------|
| `--status <n>` | status equals n |
| `--redirect <url>` | status is 3xx **and** `Location` matches exactly |
| `--header <k=v>` | response header equals v |
| `--contains <text>` / `--not-contains <text>` | body text |
| `--repeat <n>` | request n times, assert the LAST; prints each status + `x-sm-cache` |
| `--quiet` | only print failures |

Exit 0 = all held. Redirects are **never** auto-followed — for the legacy
paths the `Location` header *is* the contract.

The full sweep after a routing change (dev server on 4322):

    R=.claude/skills/verify-public-routes/routes.mjs
    node $R localhost:4322/bli-medlem/<slug> --status 200 --repeat 2 \
      --header x-sm-cache=hit --contains "Bli støttemedlem" --contains "støttemedlem.no"
    node $R localhost:4322/bli-medlem/<slug>/vilkar --status 200
    node $R localhost:4322/org/<slug> --redirect localhost:4322/bli-medlem/<slug>
    node $R "localhost:4322/org/<slug>/logo?v=abc" --redirect "localhost:4322/bli-medlem/<slug>/logo?v=abc"

(Prefix each URL with `http://`.) The `--contains "støttemedlem.no"` is the
[brand-attribution](../../../specs/concepts/brand-attribution.md) check every
public surface owes.

## Gotchas found driving this

- **POSTing a public form with curl 403s without an Origin header** — Astro's
  built-in CSRF check (`security.checkOrigin`, on by default) rejects
  form-encoded POSTs whose Origin doesn't match. Browsers always send it; curl
  needs `-H "Origin: http://localhost:4322"`. The 403 arrives in ~1ms with no
  log line hinting at CSRF, so it looks like a routing/auth bug (cost a loop
  2026-08-25 driving `/bli-medlem/<slug>/meldinger-av`).
- **The seeded member's manage token is `tok-seed-1`** — it drives every
  token-addressed member page without any login:
  `/bli-medlem/<slug>/min-side?n=tok-seed-1` and the org-message decline page
  `/bli-medlem/<slug>/meldinger-av?n=tok-seed-1` (POST `handling=av|pa` with
  the Origin header above; wrong token must 404). Decline state is
  `supporting_members.messages_declined_at` — assert it with `d1.sh`.
- **The Worker cache survives the whole dev-server run**, so a path you already
  visited reports `hit` on request #1 and you never see the `miss` → `hit`
  transition. To prove caching genuinely works, seed a *fresh* slug
  (`seed.sh eksempel-kor`) and hit that cold path — verified 2026-08-20.
- `worker.ts`'s custom fetch handler **does** run under `astro dev` (workerd),
  which is why redirects and cache headers are testable locally at all.
- A request that fails outright is usually the dev server being gone, not a
  routing bug — see `dev-logs` (`devlog.sh status`) and the `git stash` gotcha
  in `project-overview`.

Related: `verify-qr` (decodes the QR payload from real pixels — the printed
address), `preview-screenshot` (how the page looks), `dev-logs` (what the
server logged).
