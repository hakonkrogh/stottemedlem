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
  slugs + the canonical join entry point URL).
- `packages/qr/` — `@stottemedlem/qr`, shared QR code/card generation, split
  isomorphic/node/browser (see qr-codes.md before touching QR anything).
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
