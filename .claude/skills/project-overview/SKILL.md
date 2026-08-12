---
name: project-overview
description: Orientation for the stottemedlem repo — what it is, where things live, how to run/build/test, and the mandatory spec harness. Read at the start of any task in this project.
---
# stottemedlem — project overview

**Product:** støttemedlem ("supporting member") — a B2C SaaS that lets small
organizations (marching bands, choirs, community groups) collect an annual
supporting-member fee and curate their list of supporting members. Nothing more.

A pnpm + Turborepo TypeScript (ESM) monorepo. **Spec-driven:** product intent
lives in `specs/`, kept in sync with code by a mandatory `Stop`-hook harness.

## Where things live
- `apps/marketing/` — Astro static landing page → Cloudflare Worker (assets only).
  Visual identity (decided 2026-07-07): masonry photo-collage backdrop
  (`src/components/HeroBackdrop.astro` + `src/assets/backdrop/`), localized top
  scrim + frosted-glass cards, headings in Fraunces (`@fontsource-variable/fraunces`,
  self-hosted) over system-sans body, warm cream/amber palette. Gotcha: the hero
  wrapper sets `color:#fff` — slotted card content must re-set its own dark color.
- `apps/backoffice/` — Astro 7 SSR on ONE Cloudflare Worker (`src/worker.ts`:
  fetch + scheduled + queue stubs); D1/KV/Queue bindings in `wrangler.jsonc` are
  placeholders until first deploy. **WorkOS AuthKit login exists (step 3, done
  2026-07-08):** `src/middleware.ts` gates every route on a sealed-session cookie;
  `src/lib/workos.ts` + `src/pages/{login,callback,logout}.ts` + `orgs/` (selector,
  create) + `o/[slug]/` (org dashboard placeholder) implement the org rule (0 orgs →
  create, 1 → straight in, many → pick). Env/secrets come from `import { env } from
  "cloudflare:workers"` (NOT `Astro.locals.runtime.env` — removed in Astro v6+);
  per-env WorkOS config (`WORKOS_*`) is in `wrangler.jsonc` vars/secrets + `.dev.vars`
  locally. Real sign-in needs `.dev.vars` filled + AuthKit redirect URIs registered.
  See `docs/architecture/overview.md` + `stack-docs` (env access + per-env build gotchas).
- `packages/core/` — `@stottemedlem/core`, shared domain types/logic (incl. org
  slugs, canonical join/landing/salgsvilkår URLs, orgnr MOD11 validation).
- `packages/db/` — `@stottemedlem/db` (added 2026-07-28, scaffolding step 4):
  Drizzle schema + query helpers over the backoffice `DB` (D1) binding.
  `organizations` table = system of record for the **persisted, never-changing
  org slug** + public profile (orgnr, contact email, annual fee). Migrations are
  HAND-WRITTEN SQL in `packages/db/migrations/` (no drizzle-kit), applied via
  `wrangler d1 migrations apply DB --local` from `apps/backoffice`
  (`migrations_dir` points there; local state shared with `astro dev`). Slug is
  assigned once by `ensureOrganization` (also backfills orgs that predate the
  table; `/o/[slug]` still resolves legacy name-derived slugs and redirects).
  **Public org pages** (added 2026-07-28, spec
  `specs/concepts/org-landing-page.md`): `/org/[slug]` landing page +
  `/org/[slug]/vilkar` standard salgsvilkår — the two URLs Vipps' Faste
  betalinger order form requires; public in middleware (with `/favicon.ico` —
  else crawlers get bounced into the login flow), rendered by
  `PublicShell.astro` (indexable, brand attribution; admin `Shell.astro` stays
  noindex). Astro template gotcha found here twice: text + `{expr}` separated
  by a newline collapses the space ("arbeidet iNordnes") — join with `{" "}`.
- `packages/vipps/` — `@stottemedlem/vipps` (added 2026-08-10, scaffolding
  step 5): typed Vipps MobilePay client — access token (pluggable cache, KV in
  the Worker via `apps/backoffice/src/lib/vipps.ts`), Recurring v3
  agreements/charges, Webhooks v1 registration + delivery HMAC verification.
  Web-standard APIs only (fetch + Web Crypto), runs on workerd and Node.
  `VIPPS_API_BASE_URL` picks the environment: **apitest.vipps.no everywhere
  except production**. Read-only credential smoke:
  `pnpm --filter @stottemedlem/vipps run smoke` (needs test keys from
  portal → For utviklere; refuses prod). API behaviour ground truth:
  `docs/research/vipps-recurring-payments.md` + stack-docs "Vipps API
  mechanics".
- `packages/qr/` — `@stottemedlem/qr`, shared QR code/card generation, split
  isomorphic/node/browser (see qr-codes.md before touching QR anything).
- `packages/ui/` — `@stottemedlem/ui` (added 2026-07-28), the shared UI
  primitives all backoffice screens compose from: `.astro` components (Button,
  TextField, Alert, Card, Stack, Heading, Text, TextLink) + `tokens.css` (all
  colors/type/space — restyle here, not in components) + `base.css`. Token
  values DELIBERATELY mirror the marketing identity (decided 2026-07-28 after a
  trendy-font detour was reverted): Fraunces 650 "SOFT" 50 headings, golden
  amber CTA `#f2b64a` with dark ink text + lighter hover, palette lifted from
  `apps/marketing/src/pages/index.astro` — keep the two in sync if marketing
  rebrands. Display font swaps = tokens.css `--sm-font-display*` + the base.css
  @import + the @fontsource dep. Ships
  SOURCE (no build step) — the backoffice `astro.config.mjs` lists it in
  `vite.ssr.noExternal`. **Storybook** (since 2026-07-28, replacing earlier
  dev-only story pages): `pnpm --filter @stottemedlem/ui run storybook --ci`
  (port 6006) via the community `@storybook-astro/framework` (Storybook 10 +
  Astro 7; storybook-astro.org). Stories are CSF colocated with components
  (`*.stories.ts`); slots pass via `args.slots.default` (HTML string, component
  ref, or configured `{ component, props, slots }`); a second glob in
  `packages/ui/.storybook/main.ts` pulls in app screen stories from
  `apps/backoffice/src` (e.g. CreateOrgScreen, wrapped in the shared
  `ScreenFrame.astro` via a configured-component slot since decorators aren't
  supported yet). Screenshot loop: see `preview-screenshot` skill. Gotcha that
  motivated the package: Astro `<style>` in a layout is scoped, so styling
  slotted page content from `Shell.astro` silently does nothing — never style
  across the slot boundary; use the primitives.
- `specs/` — the product intent layer (problems → use cases → concepts). Entry: `specs/INDEX.md`.
- `.claude/hooks/` — Stop hooks: `spec-sync-stop.sh` (spec harness) + `close-gaps-stop.sh`.
- `CLAUDE.md` — auto-loaded agent instructions; the canonical "start here".

## Run / build / test
- `pnpm install` · `pnpm dev` · `pnpm build` · `pnpm test` (vitest) · `pnpm typecheck` · `pnpm lint` (Biome) · `pnpm format`.
- Single package: `pnpm turbo run <task> --filter=@stottemedlem/<name>`.
- Build-order gotcha: the apps consume `@stottemedlem/core` / `@stottemedlem/qr`
  from their built `dist/`, so an app build needs those packages built first.
  `pnpm --filter @stottemedlem/marketing run build` alone fails with
  `Rolldown failed to resolve import "@stottemedlem/core"` — it bypasses Turbo's
  dependency graph. Use `pnpm turbo run build --filter=@stottemedlem/marketing`
  (Turbo builds deps first) or build the packages before the app. `astro preview`
  serves `dist/` live, so the visual loop is: turbo build → preview → screenshot.
- Conventions: ESM everywhere; never use the `any` type; use `ast-grep` for structural search.
- Tooling gotchas: `astro check` emits false ts(6133) "declared but never read"
  *hints* for symbols used only after a frontmatter early-`return` (0 errors =
  still green — don't chase them). A new package with `"test": "vitest run"`
  and zero test files FAILS `pnpm test` — add a first test with the package.
- **Brand attribution (rule, 2026-07-28):** every public-facing surface carries a
  subtle "støttemedlem.no" (ø in visible text, punycode in hrefs; admin-only
  backoffice screens exempt; bare QR images exempt — the card around them carries
  it, via `qrCardSvg`'s default `footer`). Spec: `specs/concepts/brand-attribution.md`.

## Deployment (as of 2026-07-07)
- Marketing auto-deploys to Cloudflare Workers on push to `main` via
  `.github/workflows/deploy-marketing.yml` (build with turbo filter, then
  `pnpm --filter @stottemedlem/marketing run deploy` — `run` is mandatory, see
  stack-docs pnpm gotcha). Live on https://støttemedlem.no + www (Workers
  custom domains; punycode `xn--stttemedlem-hgb.no` — derive with
  `node -e "new URL(...)"`, never guess; zone id
  `95aa7289a9c15a7787106b8ab2583d67`). workers.dev serving is disabled by
  having routes. Repo secrets `CLOUDFLARE_ACCOUNT_ID` (account
  `9060f19fa0a38d810a96cda89572ce47`) and `CLOUDFLARE_API_TOKEN` are set.
  Token needs Account → Workers Scripts → Edit AND (because routes exist)
  Zone → Workers Routes → Edit on the støttemedlem.no zone — without the
  zone perm, deploy fails with `Authentication error [code: 10000]` on
  `/zones/.../workers/routes` (both perms granted; CI verified green
  end-to-end incl. domain sync, 2026-07-07). Editing a token's permissions
  keeps its value — no secret rotation needed.
- Public contact address: `hei@støttemedlem.no` (shown on the marketing site;
  in `mailto:` links always use the punycode form
  `mailto:hei@xn--stttemedlem-hgb.no` — a raw ø in the href breaks some email
  clients).
- Gotcha: the local `wrangler login` OAuth token has no `api_tokens` scope, so
  a CI API token cannot be minted from the CLI — only via the dashboard
  (dash.cloudflare.com/profile/api-tokens).
- Backoffice auto-deploys on push to `main` via
  `.github/workflows/deploy-backoffice.yml` (added 2026-07-08): a `staging` job
  then a `production` job (`needs: staging`), so main ships to both. Env is chosen
  at BUILD time (`CLOUDFLARE_ENV=staging` for the staging job; default for prod) —
  the deploy step is a plain `wrangler deploy`; `cancel-in-progress: false` so a
  running staging→prod deploy isn't interrupted. Uses the same repo secrets as
  marketing (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`). **Both jobs will
  fail until each env is provisioned:** real D1/KV/Queue ids pasted into
  `wrangler.jsonc` (still placeholder zeros), prod `WORKOS_CLIENT_ID` filled, and
  the `WORKOS_API_KEY`/`WORKOS_COOKIE_PASSWORD` secrets set per env
  (`wrangler secret put … [--env staging]`). turbo.json declares `CLOUDFLARE_ENV`
  as a build cache input so a staging build can't restore a cached prod `dist/`.
  **Status 2026-08-12: both backoffice envs ARE deployed** (manually, from a
  local wrangler OAuth session — `stottemedlem-backoffice` at
  `app.xn--stttemedlem-hgb.no`, `-staging` at `staging.app.…`; real D1/KV/Queue
  ids in wrangler.jsonc, remote migrations applied, SESSION KV declared
  explicitly). **CI deploy is still broken**: the `CLOUDFLARE_API_TOKEN` repo
  secret lacks Workers KV/D1/Queues edit (auth error 10000; only the user can
  amend it) — until fixed, deploy manually: `CLOUDFLARE_ENV=<env> turbo build`
  then `wrangler deploy` from apps/backoffice. Account has Workers Paid
  (Queues work). Still unset on prod: WorkOS client id var + secrets, Vipps
  keys. Fresh custom domains take minutes for DNS/TLS to propagate — curl
  exit 6/35 right after deploy is propagation, not breakage.

**Vipps research gotcha:** for ground truth on Vipps MobilePay API capabilities, fetch
the OpenAPI specs (`developer.vippsmobilepay.com/redocusaurus/<api>-swagger-id.yaml`,
rendered at `/api/<name>/`) — marketing and help-center pages omit hard limits (e.g.
the Donations `Schedule.interval` enum is `[MONTHLY]` only, found nowhere in prose).

## Index
| doc | covers |
|-----|--------|
| (canonical) `CLAUDE.md` | the mandatory spec harness + start-here loop |
| (canonical) `specs/process.md` | the spec-driven loop in full + enforcement |
| (canonical) `specs/INDEX.md` | high-level product map / spec registry |
| (canonical) `README.md` | monorepo layout, commands, toolchain |
| stop-hooks.md | how the two Stop hooks compose + how to test a hook locally |
| qr-codes.md | @stottemedlem/qr package split, the /api/qr/[slug] embed contract (backoffice), the front-page card preview (marketing), qrcode-lib gotchas, open domain-routing item |
| (skill) `verify-qr` | decode a generated QR PNG (file or URL) + assert payload — real scan-level proof |
| (canonical) `docs/architecture/overview.md` | proposed architecture: 2 deployables (Astro static marketing + one Astro-SSR Worker for backoffice/API/webhooks/cron/queues), D1 as system of record, WorkOS org-gated admin, Vipps Login for members, 11-step scaffolding plan |
| (skill) `stack-docs` | verified platform gotchas: Astro CF adapter custom worker entry, WorkOS SDK on Workers |
| (skill) `spec-lint` | `node .claude/skills/spec-lint/check.mjs` — validates spec links + INDEX registration after any specs/ edit |
| (skill) `preview-screenshot` | headless-Chrome screenshot of any local URL → Read the PNG; the visual validation loop for UI work |
| (canonical) `docs/research/vipps-recurring-payments.md` | verified Vipps Recurring API v3 research (yearly agreements, tiers via LEGACY pricing PATCH, 10 webhook events, local DB as system of record, NO onboarding/retention rules); Appendix A rules out Vipps Donasjoner definitively (monthly-only enum, no API amount control) — read before any payment work; not yet fed into `specs/` |
| (canonical) `docs/vipps-portal-walkthrough/README.md` | IN-PROGRESS (started 2026-07-28) recorded click-through of portal.vippsmobilepay.com with user-supplied screenshots (→ `images/`) — verifies onboarding checklist open question 6 and collects MSN + test API keys; session log is empty until the first screenshot lands — continue the recording there, one numbered entry per screen |
| (canonical) `docs/vipps-org-onboarding.md` | iterable checklist of what an org must do to get Vipps live — baseline assumes an EXISTING standard Vipps business account; steps = add Faste betalinger to the agreement, approval, then org pastes its own MSN + API keys (DECIDED 2026-07-28: no Vipps platform-partner model to begin with) — in two forms: detailed post-org-creation instructions + 3-step marketing-site headlines — the source for future onboarding UI/marketing copy; not yet fed into `specs/` |
