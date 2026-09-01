---
name: verify-public-routes
description: Query the LOCAL, STAGING or PRODUCTION D1 as data (d1.sh), and assert the HTTP contract of the public join pages (status, redirects, x-sm-cache, body text) the way a browser, a QR scanner, or Vipps' website verification sees it — plus a tier-aware local D1 seed. Use after touching routes, middleware, worker.ts caching/redirects, or anything under src/pages/bli-medlem/.
---

# Verify public routes

The public surface has contracts that a build, typecheck, and unit tests all
pass while broken: the join page must 200, its former `/org/*` address must 301
with the query intact, and the stale-while-revalidate cache must go
`miss` → `hit`. This drives them over real HTTP.

## Read what's actually in local D1

    bash .claude/skills/verify-public-routes/d1.sh "<SQL>"     # rows as JSON, nothing else
    bash .claude/skills/verify-public-routes/d1.sh "<SQL>" staging     # the DEPLOYED staging D1
    bash .claude/skills/verify-public-routes/d1.sh "<SQL>" production  # real members, real money

Wrangler wraps every result in banners and a table, so ad-hoc `d1 execute`
calls need re-quoting and grepping each time; this prints just the rows, and
carries the load-bearing `CI=1`. Read-only by convention — `seed.sh` writes.

**A failing query says why** (fixed 2026-08-31): D1 answers a bad column or a
syntax error with a JSON *object*, not the success *array*, and the old parser
sliced from the first `[` — which landed inside the error's own `"notes": [`
and crashed with a JSON syntax error naming a character offset. The real
message (`no such column: updated_at … SQLITE_ERROR`) was nowhere. stderr is
kept too, since `wrangler: command not found` — a worktree never
`pnpm install`ed — appears only there (fix: `pnpm install --frozen-lockfile`
from the worktree root once, then re-run). Exit code 1 on either.

Two columns that do not exist, and cost a round-trip each: `membership_agreements`
and `member_notices` have **no `updated_at`** (agreements carry `activated_at` /
`stopped_at` / `last_reconciled_at`; notices carry `sent_at`). `membership_charges`
does have one.
Since migration 0005 the interesting tables are the member registry:
`supporting_members`, `membership_agreements`, `memberships`,
`membership_charges` (see `project-overview`). Handy for proving an invariant
holds rather than assuming it:

    d1.sh "SELECT count(*) AS n FROM memberships WHERE period_year = 2026"

**Ask the deployed database what shapes it actually holds before trusting a
story.** Local fixtures are what you imagined; staging is what the product
produced. A member with TWO joining payments for one period — same price, same
day, 72 minutes apart, both pointing at one membership — was invisible in
Storybook and obvious in one staging query (2026-08-27). Non-local targets
refuse anything but SELECT/WITH; they read, never write.

`seed.sh` also writes TWO supporting members (extended 2026-08-31), so
member-list queries and the member's card have a baseline: **Kari Eksempel**
(`mem-seed-1`, card token `kort-seed-1`) with an ACTIVE agreement, a captured
charge, a current-period membership AND three prior periods — so her card draws
four hearts rather than proving only that the layout renders — plus **Ola
Eksempel** (`kort-seed-2`), whose `referred_by_member_id` points at Kari, which
is what makes her recruit count non-zero. Both are happy-path — the member
list's other states
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

**`seed.sh` cannot repair a database you edited — reset it.** It is idempotent
over its OWN rows, not over yours: probing states by editing D1 (deleting a
membership, nulling a charge's `membership_id`) leaves rows it then trips over,
and re-running dies with `FOREIGN KEY constraint failed` — a re-seed that looks
like it worked from the exit code alone. Local D1 is a scratch fixture, so
throw it away and let migrations rebuild it:

    rm -f apps/backoffice/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite*
    bash .claude/skills/verify-public-routes/seed.sh   # applies migrations first

Two constraints worth knowing before probing: `memberships` is UNIQUE on
`(member_id, period_year)` (so you cannot renumber a period onto one that
exists), and `membership_charges.membership_id` is a FK (so a membership will
not delete until the charges pointing at it are released). Do this AFTER
stopping the dev server, and re-seed before the next run.

    bash .claude/skills/verify-public-routes/seed-images.sh [slug]  # after seed.sh

`seed-images.sh` gives the seeded org a fixture **logo + banner** (visual
identity on the join page AND the receipt via `OrgIdentityHeader.astro`):
generates fictitious PNGs with python3 stdlib, uploads them to local R2
(`stottemedlem-media`, same `.wrangler` state as astro dev), and updates the
org row with the correctly hashed keys (`org/<id>/<kind>-<sha256[:16]>.png`).
Without it those pages render the no-imagery fallback (name only) — fine for
route assertions, wrong as a screenshot baseline for identity work.

It also applies pending D1 migrations first (`CI=1 wrangler d1 migrations
apply DB --local`), so a fresh worktree seeds instead of dying with `no such
table: organizations`. The `CI=1` is load-bearing everywhere wrangler is
chained in a script: interactively it stops on `? About to apply N
migration(s)` and waits forever — which is exactly how the `pnpm dev`
self-heal was silently dead until 2026-08-20 (see `project-overview`).

Local D1 lives in `apps/backoffice/.wrangler` and is shared **live** with a
running `astro dev` — seed after starting the server, no restart needed. Seed
only fictitious names/orgnr.

**NEVER swallow wrangler's stderr when WRITING to D1.** `d1.sh` is SELECT-only,
so setting up a fixture means raw `wrangler d1 execute DB --local --command`,
and a failed write there is reported ONLY on stderr — the exit code and stdout
look ordinary. Piping it to `>/dev/null 2>&1` turns a rejected write into a
silent no-op, and the next assertion then measures the OLD state and blames the
code under test (cost a wrong "the retention sweep is broken" conclusion,
2026-08-31: three chained UPDATEs were rejected as one batch and I read the
untouched rows as a failing sweep). Multi-statement `--command "A; B; C"` is
fine — wrangler runs them and prints `N commands executed successfully` — but
they are ONE batch: any statement failing rolls back all of them.

**Ageing a member's history trips a UNIQUE index.** `memberships` is unique on
`(member_id, period_year)`, so `UPDATE memberships SET period_year=<one year>
WHERE member_id=…` collapses a multi-year supporter onto one year and fails.
Shift instead: `SET period_year = period_year - 7`. This is the setup for
anything retention- or history-shaped (specs/concepts/member-data.md).

**Gotcha when INSERTing your own rows against the seed:** the tier ids are
`tier-1` / `tier-2`, NOT `tier-seed-1` — only the org, member and agreement ids
carry the `-seed-` convention. Guessing wrong gets you
`FOREIGN KEY constraint failed: SQLITE_CONSTRAINT_FOREIGNKEY` and nothing else;
read the ids back (`d1.sh "SELECT id, key FROM membership_tiers WHERE
org_id='org-seed-1'"`) rather than assuming.

## Drive the member's own page (min-side)

The other public surface, and the one no login can reach: `min-side` is opened
with the agreement's `manage_token`, which IS the credential. The seed gives
you two — `tok-seed-1` (Kari) and `tok-seed-2` (Ola):

    curl -s "http://localhost:4322/bli-medlem/eksempel-musikkorps/min-side?n=tok-seed-1"

**Force the states by editing the agreement, not by driving Vipps.** The page
branches on `membership_agreements.status`, so every case is one UPDATE away —
this is how the "cancelled in the Vipps app" path gets tested locally with no
provider involved at all:

    d1.sh "UPDATE membership_agreements SET status='STOPPED' WHERE id='agr-seed-1'"

**The case worth always testing here: ONE MEMBER, TWO AGREEMENTS.** The page is
per-AGREEMENT (`findAgreementByManageToken`) while the history it shows is
per-MEMBER, and stopping + re-joining leaves a member holding a stopped
agreement and a live one at once. Insert a second ACTIVE agreement for the same
`member_id` and re-open the FIRST token — that is where money claims go wrong
(fixed 2026-08-31; see `project-overview`). Never POST `handling=stopp` or
`slett` while probing: they act for real.

**To probe a POST branch that is safe to run** — `handling=fortsett`, whose
Vipps call fails closed without keys — remember curl needs the Origin header
or Astro answers **403 in ~1ms with no body and no log line** (see the CSRF
gotcha under "Gotchas found driving this"; it reads exactly like a routing
bug, and cost a detour again on 2026-08-31 by living too far from here):

    curl -s -H "Origin: http://localhost:4322" -X POST -d "handling=fortsett" "<url>"

That is enough to prove the handler ran, the guard decided, and the error
alert rendered — everything short of Vipps itself.

`GET`s are safe and read-only. Strip the markup to read the copy:

    curl -s "<url>" | python3 -c "
    import sys,re,html
    t=re.sub(r'<(script|style)[^>]*>.*?</\1>','',sys.stdin.read(),flags=re.S)
    print('\n'.join(l.strip() for l in html.unescape(re.sub(r'<[^>]+>','\n',t)).split('\n') if l.strip()))"

Manage tokens on STAGING/PRODUCTION are real members' — a `d1.sh` SELECT can
read one for debugging, but never render it anywhere and never POST with it.

## The receipt page (kvittering) is the one you CANNOT force from D1

Unlike `min-side`, every state `kvittering.astro` can show sits inside
`if (vipps)` — and `getVippsForOrg` returns null when the org has no keys in
WorkOS Vault and `.dev.vars` carries none. The page then skips the whole sync
block and renders **"Medlemskapet ble ikke opprettet"** no matter what D1
holds. So a local `curl` / `preview-screenshot` / `drive-page` of it is a
**false negative**, not a passing check, and no amount of seeding changes that
(hit 2026-08-31 adding the "already a member" state). It also re-reads Vipps on
every render, so it is never a pure D1 view even with keys.

Its states are proven one of three ways, all of them outside this skill:

| want to see | how |
|-------------|-----|
| any state end to end | `vipps-test-rig` with real apitest keys — a live agreement, then open `/kvittering?n=<manage_token>` |
| the copy alone | read the branch in the source; the `status` union names every case |
| a state that already happened | STAGING: `d1.sh … staging` for the shape, then the deployed page with that member's `manage_token` |

What IS provable locally: that the route exists, redirects to the join page
when `n=` is missing, and 404s an unknown org.

## Prove an erasure (specs/use-cases/erase-member-data.md)

Erasure is the one member operation whose whole point is what is GONE, so
asserting the page said "slettet" proves nothing — read the row back, and check
that the personal addresses stopped resolving.

The member's own route needs a STOPPED agreement (a running one is refused, and
stopping it for real calls Vipps, which local placeholder keys cannot do):

    d1.sh-write "UPDATE membership_agreements SET status='STOPPED' WHERE id='agr-seed-2'"
    curl -s -X POST -H "Origin: http://localhost:4322" \
      -H "Content-Type: application/x-www-form-urlencoded" --data "handling=slett" \
      "http://localhost:4322/bli-medlem/eksempel-musikkorps/min-side?n=tok-seed-2"

Then the four things that actually matter:

    d1.sh "SELECT name, email, phone, vipps_sub, card_token, anonymized_at
           FROM supporting_members WHERE id='mem-seed-2'"   # all NULL but the timestamp
    d1.sh "SELECT count(*), sum(paid_nok) FROM memberships WHERE member_id='mem-seed-2'"
    # their own page and their card must die, and NOBODY ELSE'S may:
    node $R localhost:4322/bli-medlem/eksempel-musikkorps/min-side?n=tok-seed-2 --status 404
    node $R localhost:4322/medlemsbevis/kort-seed-2 --status 404
    node $R localhost:4322/medlemsbevis/kort-seed-1 --status 200

**The retention sweep** runs inside the nightly reconcile cron, so drive it the
same way as any scheduled job (`project-overview`, `vipps-test-rig/cron.sh`) —
age a member past retention first, shifting years rather than assigning one:

    d1.sh-write "UPDATE memberships SET period_year = period_year - 7 WHERE member_id='mem-seed-1'"
    d1.sh-write "UPDATE membership_agreements SET status='STOPPED' WHERE id='agr-seed-1'"
    curl -s "http://localhost:4322/cdn-cgi/handler/scheduled?cron=0+2+*+*+*"
    devlog.sh grep retention     # → [retention] erased members past retention { erased: 1, failed: 0 }

Run the cron a second time and grep again: a correct sweep logs NOTHING on the
second pass. Re-seed afterwards — and note `seed.sh` will NOT overwrite details
you clobbered (it is insert-if-absent), so restore edited columns by hand.

(`d1.sh-write` is shorthand here for raw `CI=1 pnpm exec wrangler d1 execute DB
--local --command "…"` from `apps/backoffice` — `d1.sh` itself refuses writes.)

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

Plus the member's card (specs/concepts/member-card.md), which lives at the top
level rather than under `/bli-medlem/` and is served from a DIFFERENT apex zone
route — so a routing change can break it while every join-page check above
still passes:

    node $R localhost:4322/medlemsbevis/kort-seed-1 --status 200 \
      --contains "støttemedlem.no" --contains "noindex"
    node $R localhost:4322/medlemsbevis/kort-seed-1/kort.svg --status 200
    node $R localhost:4322/medlemsbevis/kort-seed-1/kort.png --status 200
    node $R localhost:4322/medlemsbevis/finnes-ikke --status 404

(`kort-seed-1` is seeded by `seed.sh`. A card address that matches nothing must
be a bare 404 — it may not hint at which organization it belonged to.)

A scheme-less `host:port/path` is fine — the runner adds `http://`. The
`--contains "støttemedlem.no"` is the
[brand-attribution](../../../specs/concepts/brand-attribution.md) check every
public surface owes.

**Check the exit code of each call — do NOT rely on `set -e`.** In the agent
Bash harness `set -e` did not abort a failing `node $R …` (2026-08-31), so a
sweep chained with `&&`/`;` printed seven `FAIL` lines and then a cheerful
"ALL OK". Either run one assertion per command and read `rc=$?`, or collect
failures explicitly.

## Gotchas found driving this

- **A scheme-less URL used to die with the wrong error** (fixed 2026-08-31, and
  the skill's own examples had been un-runnable). `fetch("localhost:4322/x")`
  reads `localhost:` as the PROTOCOL and throws — which the runner reported as
  "dev server down?", sending you to restart a server that was running fine.
  `routes.mjs` now prefixes `http://` itself and echoes the URL it actually
  reached for.

- **After a deploy, staging/production still serve the PREVIOUS page copy on
  the first visit** (`x-sm-cache: hit` on stale HTML — the saved copy heals in
  the background per visit). So "is the new code live?" needs TWO fetches:
  curl the page once to trigger the refresh, then curl again and grep the body
  for a marker unique to the new code. On-device testers hit the same
  staleness — tell them to open the page once, then re-test (bit us
  2026-08-28: a phone test of a just-merged fix filmed the pre-merge HTML).
- **A follow-up PR based on another PR's branch merges into THAT BRANCH, not
  main, unless the base branch is deleted at merge** — GitHub only retargets
  to main when the base PR's head branch is deleted. Verify with
  `git log origin/main` after merging stacked PRs; a "MERGED" badge alone
  proves nothing about main (bit us 2026-08-28: PR #57 landed inside
  fix-scroll-bounce and never deployed).

- **POSTing a public form with curl 403s without an Origin header** — Astro's
  built-in CSRF check (`security.checkOrigin`, on by default) rejects
  form-encoded POSTs whose Origin doesn't match. Browsers always send it; curl
  needs `-H "Origin: http://localhost:4322"`. The 403 arrives in ~1ms with no
  log line hinting at CSRF, so it looks like a routing/auth bug (cost a loop
  2026-08-25 driving the since-removed `/bli-medlem/<slug>/meldinger-av`).
- **The seeded member's manage token is `tok-seed-1`** — it drives every
  token-addressed member page without any login:
  `/bli-medlem/<slug>/min-side?n=tok-seed-1` (wrong token must 404). The
  org-message decline page `/bli-medlem/<slug>/meldinger-av` was REMOVED with
  the org-messages feature (2026-08-28) — it must now 404.
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

## Prove a response is being REUSED, not recomputed (added 2026-08-31)

Some of this product's responses are expensive to produce and cached with no
header to show for it — the rendered member card, stored in R2 under a digest
of its own drawing (`src/lib/cardImage.ts`). `--repeat` prints ms, byte count
and a body digest per response, which is how that is proved without a header:

    node .claude/skills/verify-public-routes/routes.mjs \
      http://localhost:4322/medlemsbevis/kort-seed-1/kort.png --status 200 --repeat 3

      #1  200  x-sm-cache=-  584ms  57354B  060e481cfc66     ← drawn
      #2  200  x-sm-cache=-   46ms  57354B  060e481cfc66     ← stored
      #3  200  x-sm-cache=-   10ms  57354B  060e481cfc66

Read it as: **same digest + a collapse in ms = reused**; same digest and the
same ms = recomputed every time (the renderer is deterministic, so identical
bytes alone prove nothing). To prove the other half — that a CHANGED card is
redrawn — change what it is derived from and repeat; the digest must move:

    CI=1 pnpm exec wrangler d1 execute DB --local \
      --command "UPDATE supporting_members SET name='Kari Eksempel-Hansen' WHERE id='mem-seed-1'"

Change it back afterwards (see the reset note above — do not leave the seed's
own rows edited).
