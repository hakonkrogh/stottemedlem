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
  create) + `o/[slug]/` (org dashboard) implement the org rule (0 orgs →
  create, 1 → straight in, many → pick). **Route map — two parallel `[slug]`
  trees, easy to confuse:** `src/pages/o/[slug]/**` is the AUTHED admin back
  office (dashboard `index.astro`, `medlemskap/[tierId].astro` = the one
  add/edit membership form where `ny` means create); `src/pages/bli-medlem/[slug]/**`
  is the PUBLIC surface (landing `index.astro`, `vilkar.astro`, `banner.ts`,
  `logo.ts`), plus `src/pages/api/qr/[slug].ts`. Admin edits call
  `purgeOrgPublicPages` so the public copy refreshes. Backoffice logging goes
  through `logger("<area>")` from `src/lib/log`
  (specs/concepts/operational-alerting.md): stable message, ids/counts in
  context — that's what reaches the operator via Sentry. Since 2026-08-27
  BOTH deployed envs report to the ONE Sentry project (org `stottemedlem`,
  project `backoffice-server`, region de.sentry.io — the Sentry MCP's
  `find_dsns` can read the DSN, no need to ask the user), told apart by the
  `SENTRY_ENVIRONMENT` var stamped as the event environment; operator email
  alerts stay production-scoped, local dev never has the DSN. Do NOT
  copy the bare `console.error` style still in older lib files (renewals.ts) —
  console lines die in the Workers log. Env/secrets come from `import { env } from
  "cloudflare:workers"` (NOT `Astro.locals.runtime.env` — removed in Astro v6+);
  per-env WorkOS config (`WORKOS_*`) is in `wrangler.jsonc` vars/secrets + `.dev.vars`
  locally. Real sign-in needs `.dev.vars` filled + AuthKit redirect URIs registered.
  `.dev.vars` is untracked, so a FRESH WORKTREE lacks it — auth-gated pages 302
  to /login there, and `pnpm typecheck` FAILS with TS2339
  (`WORKOS_API_KEY`/`VIPPS_*` "does not exist on type 'Env'" in lib/vipps.ts +
  lib/workos.ts): secrets only enter the wrangler-generated `Env` by leaking
  from `.dev.vars`, so the missing file breaks typecheck before it breaks
  login. The MAIN CHECKOUT may not have one either (verified absent
  2026-08-25/26). For typecheck alone, `cp .dev.vars.example .dev.vars`
  suffices — the example declares every key, which is all `wrangler types`
  needs, and empty secrets degrade safely. For real logged-in flows, copy a
  filled one from a sibling worktree
  (`ls ~/.superset/worktrees/*/*/apps/backoffice/.dev.vars`) or get values
  from the user — those are the ONLY ways to populate it: Worker secrets are
  write-only on Cloudflare, and the user REJECTED a readable Cloudflare-side
  copy (2026-08-25) — don't build one (see stack-docs). (Public
  `/bli-medlem/*` pages need no auth.)
  See `docs/architecture/overview.md` + `stack-docs` (env access + per-env build gotchas).
- `packages/core/` — `@stottemedlem/core`, shared domain types/logic (incl. org
  slugs, canonical join/landing/salgsvilkår URLs, orgnr MOD11 validation).
- `packages/db/` — `@stottemedlem/db` (added 2026-07-28, scaffolding step 4):
  Drizzle schema + query helpers over the backoffice `DB` (D1) binding.
  `organizations` table = system of record for the **persisted, never-changing
  org slug** + public profile (orgnr, contact email, annual fee). Migrations are
  HAND-WRITTEN SQL in `packages/db/migrations/` (no drizzle-kit), applied via
  `wrangler d1 migrations apply DB --local` from `apps/backoffice`
  (`migrations_dir` points there; local state shared with `astro dev`).
  **Every fresh worktree starts with an EMPTY local D1** (Miniflare state is
  per-worktree in `apps/backoffice/.wrangler/`) — symptom: login /callback
  dies with `Failed query: select … from "organizations"`. Since 2026-08-18
  the backoffice `dev` script self-heals this (it runs
  `wrangler d1 migrations apply DB --local` before `astro dev`); a dev server
  started BEFORE a new migration landed still needs the apply run manually
  (no restart needed — state is shared live). **The self-heal silently
  DEADLOCKED until 2026-08-20:** `wrangler d1 migrations apply` prompts
  `? About to apply N migration(s)`, turbo keeps a TTY on the task but
  multiplexes every package's output, so nobody can answer it — backoffice's
  `astro dev` never started and not one migration ran, while marketing's
  `[vite] connected` line made `pnpm dev` look healthy. Fixed by prefixing
  `CI=1` (wrangler skips the confirmation when non-interactive) — keep that
  prefix on any wrangler command a dev/CI script chains. Check the real state
  instead of trusting the log:
  `sqlite3 apps/backoffice/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite \
  ".tables" "select * from d1_migrations;"` — a `d1_migrations` table with
  ZERO rows and no app tables is the deadlock signature (apply creates the
  bookkeeping table *before* it prompts). Slug is
  assigned once by `ensureOrganization` (also backfills orgs that predate the
  table; `/o/[slug]` still resolves legacy name-derived slugs and redirects).
  **Public org pages** (added 2026-07-28; renamed `/org/*` → `/bli-medlem/*`
  2026-08-20, spec `specs/concepts/join-page.md` — the former landing-page and
  join-entry-point concepts MERGED into one address): `/bli-medlem/[slug]` join
  page + `/bli-medlem/[slug]/vilkar` standard salgsvilkår — the two URLs Vipps'
  Faste betalinger order form requires. `/org/*` stays ROUTED in
  wrangler.jsonc purely so `worker.ts` can 301 it to the new path (printed QR
  codes / registered Vipps URLs must never break) — don't drop that route.
  Path segment lives in ONE place: `JOIN_PAGE_PATH_SEGMENT` /
  `joinPagePath()` in `@stottemedlem/core` (also `joinPageUrl`,
  `joinPageTermsUrl`); public in middleware (with `/favicon.ico` —
  else crawlers get bounced into the login flow), rendered by
  `PublicShell.astro` (indexable, brand attribution; admin `Shell.astro` stays
  noindex). Astro template gotcha found here twice: text + `{expr}` separated
  by a newline collapses the space ("arbeidet iNordnes") — join with `{" "}`.
  Same class, third sighting 2026-08-24: **two adjacent expressions on ONE line
  inside a component slot** — `<Text>{a} {b}</Text>` — also lose the space
  ("var 2024.Den årlige"). Building the sentence in the frontmatter
  (`[a, b].filter(Boolean).join(" ")`) is immune to both and reads better.
  **Org visual identity** (added 2026-08-12, branch org-image-editing):
  `logo_key`/`banner_key` columns (migration `0002_org_images.sql`) hold R2
  object keys in the backoffice `MEDIA` bucket binding; upload/validate/serve
  logic in `apps/backoffice/src/lib/orgImages.ts` (magic-byte sniff, PNG/JPEG/
  WebP only — SVG rejected on purpose: stored SVGs served same-origin can carry
  scripts; content-hashed keys → `?v=` cache busting + immutable caching).
  Public endpoints `/bli-medlem/[slug]/logo|banner` (already public via the
  `/bli-medlem/*` middleware rule — no `isPublic()` change needed); uploads happen on
  `o/[slug]/innstillinger` (multipart form POST, same-page handling; that page
  also edits the org NAME, mirrored to WorkOS via
  `organizations.updateOrganization` — slug never changes). Landing page shows
  the identity Facebook-style (restyled 2026-08-12, branch logo-banner-styling):
  banner as a 12:5 backdrop (max 15rem tall), logo ALWAYS in a circle with a
  subtle outline (white disc + `object-fit: contain` — the circle rule applies
  everywhere a logo is shown, incl. the settings preview), name beside the logo
  which overlaps the banner's bottom edge. Banner focal point:
  `banner_focus_x/y` columns (migration `0003_banner_focus.sql`,
  object-position percentages, NULL = center) chosen via a drag-the-visible-
  frame picker in `OrgImageFields.astro`, applied as `object-position` on the
  join page (spec: `specs/concepts/join-page.md`).
  **Membership tiers** (added 2026-08-19, branch vips-membership-tiering, spec
  `specs/concepts/membership-tier.md`): `membership_tiers` table (migration
  `0004_membership_tiers.sql`; backfills the old single
  `organizations.annual_fee_nok` — column now LEGACY/unused — into one tier)
  is the org's catalogue of membership levels, CRUD'd at
  `/o/[slug]/medlemskap` (archive-not-delete). **Vipps has NO product-catalogue
  API** (verified against the Recurring v3 OpenAPI spec 2026-08-19: agreements
  + charges only) — our D1 is the catalogue; each tier projects onto future
  agreements via `productName` (≤45)/`productDescription` (≤100)/`externalId`
  (≤64) with helpers + limits in `@stottemedlem/core` (`membershipTierKey`,
  `tierAgreementExternalId` = `<tierKey ≤24>:<membershipId>`; tier `key` is
  stable/immutable, unique per org; internal — never shown to admins, and the
  back office offers no per-membership link). Landing page + vilkår enumerate
  tiers cheapest-first; a card's own button carries the picked tier onward
  (`?medlemskap=<key>`) — internal navigation, not a shareable address. **Minimum
  one tier** (decided 2026-08-19, replacing an earlier placeholder-offer
  idea): org creation collects the first membership's annual fee (default
  name `DEFAULT_MEMBERSHIP_TIER_NAME` from core, changeable later) and the
  last active tier can't be archived (`archiveMembershipTier` returns null) —
  Vipps evaluates the page against a real priced product. Zero tiers exists
  only for legacy orgs (dashboard prompts; public pages degrade gracefully).
  **Member registry** (added 2026-08-20, branch scaffold-vips-test, migration
  `0005_memberships.sql`, specs `concepts/membership.md` +
  NEW `concepts/annual-period.md`): four tables, because they move on different
  clocks — `supporting_members` (the person; `vipps_sub` is how a returning
  supporter is recognized, UNIQUE per org), `membership_agreements` (the
  standing yearly Vipps arrangement, one per subscription, spans years),
  `memberships` (ONE CALENDAR-YEAR period each; unique per member+year; created
  only when money was captured — status active/lapsed is DERIVED from
  `period_year`, never stored), `membership_charges` (every payment attempt;
  `vipps_charge_id` UNIQUE = the webhook idempotency key). **The annual period
  is the calendar year** (decided 2026-08-19, specced 2026-08-20): mid-year
  joins pay a pro-rated remainder (`proratedJoinFeeNok`/`annualPeriodFor` in
  `@stottemedlem/core`), renewals cost the full fee each January — this
  REPLACED the old "renewal is an explicit payment, proration out of scope"
  wording in `use-cases/renew-annual-membership.md`. Repository helpers in
  `packages/db/src/index.ts` (`recordDraftedAgreement`, `activateAgreement`,
  `recordCharge`, `grantMembershipForCapturedCharge`, `listMembersForPeriod`)
  are all idempotent by design. NOT yet built: the join route, receipt page,
  webhook receiver/queue consumer, member-list UI.
  **Joining + the payment loop** (added 2026-08-20, same branch): public
  `POST /bli-medlem/[slug]/start` drafts the Vipps agreement (full annual fee
  as the agreement price, PRO-RATED initial charge) and 303s to Vipps;
  `kvittering.astro` is the redirect landing page (asks Vipps, never trusts the
  redirect — also the polling fallback); `min-side.astro?n=<manage_token>` is
  the member's own page (spec `concepts/member-self-service.md`: no login, the
  unguessable token IS the credential, offers a real stop, noindex);
  `POST /api/vipps/[slug]` is the per-org webhook receiver (HMAC-verified →
  401, unknown org → 404, apply failure → 500 so Vipps redelivers; `/api/vipps/*`
  is public in middleware). Shared logic in `src/lib/membership.ts`
  (`startJoin`, `syncAgreement`, `applyCharge`/`syncCharge`, `applyVippsEvent`) — the
  dispatcher ALWAYS syncs the agreement first because charge-captured beats
  agreement-activated in practice, and settles captures that arrived too early.
  Admins connect events on `/o/[slug]/vipps` ("Betalingsvarsler"), which stores
  the registration + secret in Vault beside the keys; locally
  `VIPPS_WEBHOOK_SECRET` in `.dev.vars` stands in (test env only).
  **Worker cache gotcha this created:** the public-page cache now SKIPS any URL
  with a query string (an error message for one visitor must not be cached for
  all) and its key carries the date (the join page quotes a pro-rated price
  that changes daily) — `publicPageCache.ts` purge keys must match, incl. the
  date fragment.
  **Renewals + repricing** (added 2026-08-20): `src/lib/renewals.ts`
  (`repriceAgreements`, `createDueRenewalCharges`) driven by `worker.ts`
  `scheduled` — 02:00 reconcile-then-reprice, 04:00 reprice-then-renew — with the jobs
  DYNAMICALLY imported so the worker tsconfig (no DOM lib) doesn't have to
  typecheck app libs. Both are idempotent by comparison, not by memory: a
  reprice runs only where `membership_agreements.annual_fee_nok` ≠ the tier's
  current fee, a renewal only where no charge row exists for next period. Fee
  policy (decided 2026-08-20, spec `use-cases/change-the-annual-fee.md`): a
  change hits EXISTING members at their next renewal (no grandfathering),
  history keeps what was actually paid, returning lapsed members pay the
  current fee, and notifying members is an ACKNOWLEDGED GAP — the tier edit
  page tells the admin to do it themselves. Renewal timing lives in core
  (`isRenewalWindow`/`renewalPeriodYear`, tested): arranged from 1 Dec, due
  1 Jan, `retryDays: 7`. The renewal charge's Idempotency-Key is DERIVED
  (`stableUuid("renewal:<agreementId>:<year>")` in core), not random, so a run
  that creates the charge and then fails to write it down cannot bill the member
  twice tomorrow. The tier form also reprices immediately on save so
  members' apps match at once.
  **Period schemes / accelerated staging** (added 2026-08-27, branch
  vip-staging-accelerated, spec section in `concepts/annual-period.md`): the
  "year" is now a `PeriodScheme` in core (`getPeriodScheme`,
  `calendarYearScheme`/`isoWeekScheme`, `periodLabel`), selected by the
  `PERIOD_SCHEME` wrangler var and exposed to app code as `periods` from
  `src/lib/periods.ts` — STAGING runs `iso-week` (week-as-year: period =
  ISO week Mon–Sun, key `isoYear*100+week` e.g. 202635, fits `period_year`
  with no migration; crons HOURLY :00 renew/:30 reconcile, worker.ts matches
  both cron sets; agreements drafted with `interval: WEEK`; fee-notice rule
  ≈6.4 real hours, retryDays 1, lookbacks 2/1 days), production stays
  `calendar-year`. Renewal window on iso-week opens SATURDAY, not a
  proportional "Dec 1" — Vipps requires a charge's `due` ≥1 REAL day out, so
  the accelerated December (~13 h) can't hold it; any future compressed
  calendar hits the same floor. Don't call the old core functions
  (`annualPeriodFor`/`proratedJoinFeeNok`/`isRenewalWindow`/
  `renewalPeriodYear`) from app code — go through `periods`; db functions
  deriving member status now REQUIRE a `currentPeriodKey` arg
  (`membershipStatus`, `listOrganizationMembers`, `getOrganizationMember`,
  `listMessageableMembers`), pass `periods.periodFor().year`. Local smoke of
  the accelerated mode: append `PERIOD_SCHEME="iso-week"` to `.dev.vars`,
  restart dev, seed a FRESH slug (public-page cache!), then the join page
  quotes "resten av uke NN/YYYY" with day-granular proration (Thursday =
  4/7 of the fee); remove the line afterwards — seeded `period_year: 2026`
  rows read as "Utløpt" under iso-week, which also happens to staging's old
  D1 rows when this deploys (expected). **Remote staging runs iso-week since
  2026-08-27** (manual branch deploy of vip-staging-accelerated; a later
  main-merge REVERTS it unless that branch merges first). Remote test
  baseline: staging D1 was empty, now seeded with the same fictitious org as
  seed.sh (`eksempel-musikkorps`, tok-seed-1) — seed.sh is local-only, the
  remote variant is its SQL via `CI=1 wrangler d1 execute DB --remote --env
  staging --command "..."` with `period_year` as the CURRENT ISO-week key,
  not `strftime('%Y')`. Manual staging deploy recipe (verified):
  `CLOUDFLARE_ENV=staging turbo build` → `CI=1 wrangler deploy --env
  staging` from apps/backoffice; the seeded org has NO Vipps keys, so the
  hourly crons SKIP it silently (`getVippsForOrg` → null → continue) — no
  log noise, no renewals; only a real org with keys exercises the cron path
  (an earlier note claiming reconcile noise here was wrong).
  **Member list** (added 2026-08-24, spec `use-cases/curate-member-list.md`):
  `/o/[slug]/medlemmer` (list, `?sok=` search) + `/o/[slug]/medlemmer/[memberId]`
  (history + the one editable thing, contact details). Queries live in
  `@stottemedlem/db` (`listOrganizationMembers`, `countMembersByStatus`,
  `matchesMemberSearch`, `getOrganizationMember`, `updateMemberContactDetails`);
  status is DERIVED (never a column, never settable) and a supporter with no
  completed payment renders as "Ikke betalt", not lapsed. Two conventions this
  established, worth following for new back-office screens: (1) the page is thin
  — `requireOrgAccess(session, slug)` in `src/lib/orgAccess.ts` resolves the org
  + checks WorkOS membership (an org you may not see and one that does not exist
  are deliberately identical), then it loads data and renders a `*Screen.astro`;
  (2) that screen is a pure presentational component with a `.stories.ts`, which
  is the ONLY way to see an auth-gated page (see `preview-screenshot`) — fixtures
  shared via `components/memberFixtures.ts`. The whole list is loaded and
  filtered in the screen on purpose, so counts do not move while you search.
  **Org messages** (added 2026-08-25, branch glowing-snarl/PR #32, spec
  `specs/concepts/org-message.md` + resolved open questions in
  `use-cases/keep-supporters-in-the-loop.md`): `/o/[slug]/meldinger` composes
  a plain-text message to supporting members (subject, body, audience,
  preview, per-message result at `/meldinger/[messageId]`). Decided
  2026-08-25: default audience = ACTIVE members, lapsed only via the explicit
  "Alle, også utløpte" choice; declining is one click, no login, at
  `memberUnsubscribePath` (`/bli-medlem/[slug]/meldinger-av?n=<manageToken>`,
  POST mutates — never GET), reversible there and shown on min-side, and
  NEVER stops a member notice (`supporting_members.messages_declined_at`,
  migration 0009). Sending is ASYNC: the POST records the message
  (`org_messages`) and enqueues on the `org-messages` queue (`ORG_MESSAGES`
  binding); the `worker.ts` queue consumer (its first real job) derives the
  audience from the live register at delivery time (`deliverOrgMessage` in
  `src/lib/messages.ts`) and records one outcome row per member
  (`org_message_recipients`, unique per message+member = retry idempotency;
  only provider-accepted sends count as `sent`). Deploy validates queue
  consumers and fails without the queues; `org-messages` +
  `org-messages-staging` ARE provisioned (2026-08-27 — `wrangler queues
  create` did NOT auto-edit wrangler.jsonc this time, unlike r2). Proving the send job needs no auth and no
  queue: a scratch `pnpm dlx tsx` script in `apps/backoffice` with wrangler's
  `getPlatformProxy({ configPath: "./wrangler.jsonc", persist: true })` (same
  live local D1 as `astro dev`) calling `deliverOrgMessage` with
  `createLoggingSender()` — the logger prints the composed email (incl. the
  unsubscribe URL) and reports `sent:false`, honestly recorded as `failed`.
  That harness pattern works for ANY app lib that only touches D1 + packages.
  **Reconciliation** (added 2026-08-21, spec `concepts/payment-reconciliation.md`):
  `src/lib/reconcile.ts` (`reconcileOrganization`) runs FIRST in the 02:00 job.
  Webhook delivery is at-least-once, which also means at-most-never — a real
  captured renewal was lost this way when its receiver URL died — so the product
  re-reads Vipps instead of trusting that it was told. Per agreement it calls
  `getAgreement` + `listCharges` and makes D1 match; `listCharges` is the only
  thing that can find a charge Vipps has and we have NO row for. Which
  agreements a run visits comes from `selectAgreementsToReconcile` in
  `@stottemedlem/db`: suspicion first (open charge due on/before today, captured
  charge with no membership, PENDING draft < 14 days old), then a rotation over
  ACTIVE agreements ordered by the new `last_reconciled_at` column (migration
  `0007_agreement_reconciliation.sql`; NULLs sort first in SQLite), capped at
  250 per org per run so a night's cost is predictable. A failed read is NOT
  marked reconciled, so it goes first next time; drafts too old to chase are
  counted and logged rather than silently dropped. Read-only + idempotent —
  it never creates or cancels a charge. **Testing the cron locally:** `astro dev` can't
  reach `scheduled` — build, then `wrangler dev --test-scheduled` and hit
  `/cdn-cgi/handler/scheduled?cron=0+2+*+*+*` (NOT `/__scheduled`, which our
  custom fetch handler swallows into a /login redirect). The `vipps-test-rig`
  skill has a recipe for proving reconciliation against a real agreement.
  `PUBLIC_ORIGIN` is now a wrangler var per env (the deployed origin): a
  scheduled job has no request to derive the origin from, and worker.ts now
  typechecks `lib/membership.ts` transitively, so it must exist on the
  generated `Env` too — not just in `src/env.d.ts`.
  **Public org pages are stale-while-revalidate cached** in
  `worker.ts` (named cache `public-org-pages`, key = origin+path, no query/
  trailing slash; `x-sm-cache: hit|miss` header; every visit revalidates in
  the background via `ctx.waitUntil`, 7-day s-maxage backstop; only 200s
  without Set-Cookie are stored) — cache is per-datacenter, so back-office
  saves do a best-effort same-POP purge (`src/lib/publicPageCache.ts`; keep
  cache name/key shape in sync with worker.ts). Verified in dev: the custom
  `worker.ts` fetch handler DOES run under `astro dev` (workerd), so
  miss→hit→stale-then-fresh is testable with curl.
- `packages/vipps/` — `@stottemedlem/vipps` (added 2026-08-10, scaffolding
  step 5): typed Vipps MobilePay client — access token (pluggable cache, KV in
  the Worker via `apps/backoffice/src/lib/vipps.ts`), Recurring v3
  agreements/charges, Webhooks v1 registration + delivery HMAC verification.
  Web-standard APIs only (fetch + Web Crypto), runs on workerd and Node.
  `VIPPS_API_BASE_URL` picks the environment: **apitest.vipps.no everywhere
  except production**, and since 2026-08-18 it is the only Vipps env config —
  **each org's own sales-unit keys** are added by its admin at
  `/o/[slug]/vipps` (validated live against Vipps before storing; spec
  `specs/concepts/vipps-api-keys.md`), stored per org in **WorkOS Vault**
  (`apps/backoffice/src/lib/vippsKeys.ts`; client factory `getVippsForOrg`
  in `src/lib/vipps.ts`). Vault enablement smoke:
  `pnpm --filter @stottemedlem/backoffice run vault-smoke`. Read-only
  credential smoke (keys via env vars):
  `pnpm --filter @stottemedlem/vipps run smoke` (refuses prod).
  **Local end-to-end rig (added 2026-08-20, branch scaffold-vips-test):**
  `run recurring-test` (packages/vipps/scripts/) drives a REAL yearly
  agreement on apitest from the CLI — draft (+ a QR to scan with the Merchant
  Test app) → poll → userinfo → charges → renewal charge → stop — plus
  `listen`, a local receiver for the three URLs Vipps calls back into
  (`/retur`, `/min-side` = the mandatory management page, `/webhook`
  HMAC-verified), exposed by `run tunnel` (cloudflared quick tunnel writing
  `.vipps-tunnel`; NEW URL every restart, so re-register webhooks). Keys come
  from `apps/backoffice/.dev.vars`; those same four vars are a test-env-ONLY
  fallback in `getVippsForOrg` when an org has no Vault keys. Runbook +
  prerequisites (MT app, test users, PIN 1236):
  `docs/vipps-local-recurring-test.md`. API
  behaviour ground truth: `docs/research/vipps-recurring-payments.md` +
  stack-docs "Vipps API mechanics" + "WorkOS Vault".
- `packages/email/` — `@stottemedlem/email` (added 2026-08-24, branch
  member-notices, spec `specs/concepts/member-notice.md`): the ONLY way the
  product speaks to a member — Resend REST client (fetch-only, batched at 100,
  a rejected batch counts as nobody told) plus the notice copy itself
  (`feeChangeNotice`, Norwegian). **The sending address is always ours**
  (`EMAIL_FROM_ADDRESS` var, `varsel@xn--stttemedlem-hgb.no`) — a provider only
  sends from a domain we own; the org is the display name + `reply_to`.
  `RESEND_API_KEY` is a secret; **absent = `createLoggingSender()`**, which
  prints the notice and reports `sent: false`, so nothing is recorded as told
  and nobody's price moves. That fallback is what makes the whole flow testable
  locally with no provider account. Wiring: `apps/backoffice/src/lib/email.ts`
  (sender) + `lib/notices.ts` (who is owed one).
  **The 14-day rule** (decided 2026-08-24): a member is charged the fee they
  have known for ≥14 days, never a newer one — `renewalFeeNok()` in
  `@stottemedlem/db`, and `member_notices` (migration 0008) is the evidence
  that decides it. What they were TOLD beats what they last PAID, and both beat
  `membership_agreements.annual_fee_nok` (repricing overwrites that column, so
  it is only a last resort). Notices are sent from the tier form on save AND
  from both nightly crons as the retry; the nightly path needs `PUBLIC_ORIGIN`
  (a scheduled run has no request to derive a member's URL from) and is
  therefore a no-op in local dev unless you set it.
  **`RESEND_API_KEY` is set in PRODUCTION ONLY** (decided 2026-08-25) — from
  `apps/backoffice`, `wrangler secret put RESEND_API_KEY`, no `--env`. Staging
  is deliberately left unset so it falls back to the logging sender: staging's
  D1 holds test members with undeliverable addresses (`…@eksempel.example`),
  and those bounces would land on the SAME verified domain production sends
  from, damaging the real sending reputation. Don't "fix" the missing staging
  secret. If staging ever must send for real, give it its own verified
  subdomain in `EMAIL_FROM_ADDRESS` first, then
  `wrangler secret put RESEND_API_KEY --env staging`.
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
- **A fresh worktree has NO `node_modules`** (nothing is shared with the main
  checkout): `pnpm lint`/`typecheck`/`test` fail up front with `sh: biome:
  command not found` / `turbo: command not found`, which is a missing install,
  not a broken tree. Run `pnpm install` once per worktree first (~seconds, the
  store is shared).
- **The local `main` ref in a worktree is stale**, so `git log main..HEAD` lists
  commits that are already merged and makes a one-commit branch look like ten.
  Scope a branch/PR against `origin/main` (`git log --oneline origin/main..HEAD`)
  before writing the PR body.
- **Stacked PRs strand silently** (this cost the project PR #28, recovered as
  #29 on 2026-08-25). If PR B is based on branch A and A is merged to `main`
  *without deleting A*, B still targets the now-stale A: merging B lands it on
  a dead branch, `gh pr list` says MERGED, and nothing ever reaches main. The
  files simply are not there. **Delete the base branch when merging the lower
  PR** — that is what makes GitHub retarget the dependent one to `main`. To
  check for an already-stranded PR: `git ls-tree origin/main --name-only <path>`
  for a file the PR added, not the PR's own merged/unmerged status.
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
  still green — don't chase them). A NEW PACKAGE needs `.js` extensions on its
  own relative imports (`from "./types.js"`) — `tsconfig.base.json` uses
  node16 resolution, so extensionless ones fail the build with TS2835, and the
  knock-on is a wave of bogus TS7006 implicit-`any` errors from the types that
  failed to resolve. A new package with `"test": "vitest run"`
  and zero test files FAILS `pnpm test` — add a first test with the package.
  **`git stash` KILLS a running `astro dev` server** (hit 2026-08-20 while
  stashing to get a Biome baseline): swapping files under the daemon takes it
  down silently, and every later curl returns `000` — looks like a routing bug
  you just introduced, isn't. Restart via `devlog.sh start` and re-verify.
  `pnpm lint` (Biome) is RED even on a clean tree (verified 2026-08-12): Biome
  only parses `.astro` frontmatter, so imports/props used solely in the
  template trip noUnusedImports/noUnusedVariables (Shell, PublicShell,
  CreateOrgScreen, …). Pre-existing — judge your change by whether it adds NEW
  findings (compare against `git stash` if unsure), and never "fix" these by
  deleting the imports.
- **Brand attribution (rule, 2026-07-28):** every public-facing surface carries a
  subtle "støttemedlem.no" (ø in visible text, punycode in hrefs; admin-only
  backoffice screens exempt; bare QR images exempt — the card around them carries
  it, via `qrCardSvg`'s default `footer`). Spec: `specs/concepts/brand-attribution.md`.

## Deployment (as of 2026-07-07)
- **Nothing runs on a pull request.** `.github/workflows/` holds only
  `deploy-marketing.yml` and `deploy-backoffice.yml`, both `on: push` to `main`
  — `gh pr checks <n>` reports "no checks reported" on every branch (confirmed
  2026-08-24 on PR #27). So a PR is unverified until it merges, and the first
  thing that runs the build is the deploy itself: run
  `pnpm turbo run build typecheck test` locally before opening one, and don't
  read a green PR page as a green build. Merging also applies remote D1
  migrations (each deploy job runs `wrangler d1 migrations apply --remote`
  first), so merge is when schema changes land for real — keep them additive.
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
  then a `production` job (`needs: staging`), so main ships to both. Since
  2026-08-18 each job applies remote D1 migrations BEFORE its deploy
  (`wrangler d1 migrations apply DB --remote [--env staging]` — the --env
  split-brain from stack-docs applies; wrangler auto-confirms when
  non-interactive; keep migrations additive so the still-running old code
  stays compatible). If the migration step 401s in CI, the API token lacks
  Account → D1 → Edit — add it in the dashboard (token value survives
  permission edits). Env is chosen
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
  explicitly). **CI deploy-on-merge is GREEN again** (PR #14 run, 2026-08-12):
  the old auth-error-10000 failure was wrangler auto-provisioning KV with
  placeholder ids — with explicit ids the token's permissions suffice. Manual
  deploy when needed: `CLOUDFLARE_ENV=<env> turbo build` then `wrangler deploy`
  from apps/backoffice. Account has Workers Paid (Queues work). Still unset on
  prod: WorkOS client id var + secrets (Vipps keys are per-org via the
  backoffice UI since 2026-08-18, not Worker secrets). Org-media R2 buckets
  (`stottemedlem-media`, `-staging`) ARE provisioned and migration 0002 applied
  remotely on both envs (2026-08-12). Two wrangler gotchas found provisioning
  them: (1) **`wrangler r2 bucket create` AUTO-EDITS wrangler.jsonc** — appends
  a snake_case binding entry to the top-level env and reformats the file to
  tabs; a later `git add -A` swept these into PR #18 (cleaned up in PR #19) —
  after any `wrangler <resource> create`, diff wrangler.jsonc before
  committing. (2) `wrangler deploy` VALIDATES r2_buckets bindings against the
  R2 API, so the CI deploy token needs Account → Workers R2 Storage → Edit
  (dashboard-only edit; token value survives) — without it deploy fails with
  the familiar `Authentication error [code: 10000]`, this time on
  `/r2/buckets/...` (pending user action as of 2026-08-12, deploy red until
  then). Fresh custom domains take
  minutes for DNS/TLS to propagate — curl exit 6/35 right after deploy is
  propagation (possibly negative-cached locally: verify via `dig @1.1.1.1`
  before suspecting the deploy).

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
| (skill) `vipps-test-rig` | drive a REAL recurring subscription on apitest from the CLI (agreement → MT-app approval → charges → webhooks → stop) + the local receiver and tunnel; the sandbox-DNS gotcha when verifying a tunnel |
| (skill) `verify-qr` | decode a generated QR PNG (file or URL) + assert payload — real scan-level proof |
| (skill) `verify-public-routes` | + `d1.sh "<SQL>"` — read local D1 rows as JSON (the member-registry tables incl.); assert the public join pages over real HTTP (status, `/org/*` 301s, `x-sm-cache` miss→hit, brand attribution) + `seed.sh`, the tier-aware local D1 seed |
| (canonical) `docs/architecture/overview.md` | proposed architecture: 2 deployables (Astro static marketing + one Astro-SSR Worker for backoffice/API/webhooks/cron/queues), D1 as system of record, WorkOS org-gated admin, Vipps Login for members, 11-step scaffolding plan |
| (skill) `stack-docs` | verified platform gotchas: Astro CF adapter custom worker entry, WorkOS SDK on Workers |
| (skill) `spec-lint` | `node .claude/skills/spec-lint/check.mjs` — validates spec links + INDEX registration after any specs/ edit |
| (skill) `preview-screenshot` | headless-Chrome screenshot of any local URL → Read the PNG; the visual validation loop for UI work |
| (skill) `dev-logs` | `bash .claude/skills/dev-logs/devlog.sh start\|tail\|grep` — read the dev server's stdout (console.log/error, request lines, SSR stack traces) via `astro dev --background` + `.astro/dev.log`; foreground `pnpm dev` output is unreadable to agents |
| (canonical) `docs/vipps-local-recurring-test.md` | runbook for rehearsing a real recurring subscription on apitest from the CLI: prerequisites (test keys, MT app + test users, cloudflared), the tunnel and why it's needed, the lifecycle commands, what to look for at each step, cleanup, troubleshooting |
| (canonical) `docs/research/vipps-recurring-payments.md` | verified Vipps Recurring API v3 research (yearly agreements, tiers via LEGACY pricing PATCH, 10 webhook events, local DB as system of record, NO onboarding/retention rules); Appendix A rules out Vipps Donasjoner definitively (monthly-only enum, no API amount control) — read before any payment work; not yet fed into `specs/` |
| (canonical) `docs/vipps-portal-walkthrough/README.md` | IN-PROGRESS (started 2026-07-28) recorded click-through of portal.vippsmobilepay.com with user-supplied screenshots (→ `images/`) — verifies onboarding checklist open question 6 and collects MSN + test API keys; session log is empty until the first screenshot lands — continue the recording there, one numbered entry per screen |
| (canonical) `docs/vipps-org-onboarding.md` | iterable checklist of what an org must do to get Vipps live — baseline assumes an EXISTING standard Vipps business account; steps = add Faste betalinger to the agreement, approval, then org pastes its own MSN + API keys (DECIDED 2026-07-28: no Vipps platform-partner model to begin with) — in two forms: detailed post-org-creation instructions + 3-step marketing-site headlines — the source for future onboarding UI/marketing copy; not yet fed into `specs/` |
