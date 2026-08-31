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
  create) + `o/[slug]/` (the org's back office) implement the org rule (0 orgs →
  create, 1 → straight in, many → pick). **Route map — two parallel `[slug]`
  trees, easy to confuse:** `src/pages/o/[slug]/**` is the AUTHED admin back
  office (`medlemskap/[tierId].astro` = the one add/edit membership form where
  `ny` means create); `src/pages/bli-medlem/[slug]/**`
  is the PUBLIC surface (landing `index.astro`, `vilkar.astro`, `banner.ts`,
  `logo.ts`), plus `src/pages/api/qr/[slug].ts`. Admin edits call
  `purgeOrgPublicPages` so the public copy refreshes.
  **Back-office shape (2026-08-27, specs/concepts/back-office.md):** an org is
  FOUR tabbed pages — `index.astro` (Oversikt: public links + warnings),
  `innstillinger.astro`, `medlemmer/`, `medlemskap/` — each a real page, no
  client-side tab widget. Every org page is thin: it loads `requireOrgView()`
  (`lib/orgView.ts` — access check + tiers + Vipps keys + derived warnings, one
  Vault read) and renders
  `<Shell frame={false}><OrgScreen …><SomeScreen …/></OrgScreen></Shell>`.
  `OrgScreen` owns the chrome (org name as the page's ONE h1 — screens start at
  `level={2}` — account links, and tabs with warning-count badges from
  `lib/orgNav.ts` + `lib/orgWarnings.ts`). Vipps keys sit under the
  Innstillinger tab.
  **Editable surfaces present first** (specs/concepts/presenting-and-editing.md):
  a screen shows stored values via `@stottemedlem/ui/components/InfoList.astro`
  plus an "Endre" action opening `?rediger=1`; a save closes the form, a
  rejected save keeps it open. Follow that for any new editable screen.
  Screen markup lives in `src/components/*Screen.astro` with a `.stories.ts`
  beside it — pages hold only data + POST handling, so every screen is
  reviewable in Storybook (see `preview-screenshot`'s click-through note).
  **A screen UNDER a tab (a member, a tier form, the Vipps keys, a message)
  wraps its content in `components/Subpage.astro`** (`backHref` + `backLabel`)
  instead of a `<Stack gap="lg">` root: that renders `@stottemedlem/ui`'s
  `BackLink` above AND below the content, which the spec requires of every
  subpage — don't hand-roll a bottom-only `CardFooter` link.
  Backoffice logging goes
  through `logger("<area>")` from `src/lib/log`
  (specs/concepts/operational-alerting.md): stable message, ids/counts in
  context — that's what reaches the operator via Sentry. Since 2026-08-27
  BOTH deployed envs report to the ONE Sentry project (org `stottemedlem`,
  project `backoffice-server`, region de.sentry.io — the Sentry MCP's
  `find_dsns` can read the DSN, no need to ask the user), told apart by the
  `SENTRY_ENVIRONMENT` var stamped as the event environment; operator email
  alerts stay production-scoped, local dev never has the DSN. To prove
  wiring without waiting for a real error: POST a 3-line event envelope to
  `https://<host>/api/<projectId>/envelope/?sentry_key=<key>` with
  `environment` set, then search `environment:staging` via the MCP and
  resolve the test issue (done 2026-08-27, BACKOFFICE-SERVER-5). Do NOT
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
  `joinPagePath()`/`joinPageTermsPath()` in `@stottemedlem/core` (also
  `joinPageUrl`, `joinPageTermsUrl` — CANONICAL-origin-only, for marketing +
  fallback). **Shareable addresses are env-aware since 2026-08-27** (branch
  staging-membership-links; staging used to show PRODUCTION links): backoffice
  code showing/encoding the shareable address (dashboard "Offentlige lenker",
  `/api/qr/[slug]` payloads) must use `shareableJoinUrl`/`shareableJoinTermsUrl`
  from `src/lib/joinLinks.ts` — `JOIN_PAGE_ORIGIN` wrangler var (set on staging
  only) falling back to `CANONICAL_ORIGIN`; note this is NOT `PUBLIC_ORIGIN`,
  which is the Vipps-callback origin (`app.` host on prod, where `/api/*` is
  routed — the apex only routes `/bli-medlem/*` + `/org/*` to this worker).
  Public pages link to EACH OTHER with relative paths (visitor stays on the
  origin they arrived at). Public in middleware (with `/favicon.ico` —
  else crawlers get bounced into the login flow), rendered by
  `PublicShell.astro` (indexable, brand attribution; admin `Shell.astro` stays
  noindex). Astro template gotcha found here twice: text + `{expr}` separated
  by a newline collapses the space ("arbeidet iNordnes") — join with `{" "}`.
  Same class, third sighting 2026-08-24: **two adjacent expressions on ONE line
  inside a component slot** — `<Text>{a} {b}</Text>` — also lose the space
  ("var 2024.Den årlige"). Fourth, 2026-08-27: **an expression followed by a
  COMPONENT tag on one line** — `{msg} <TextLink>…</TextLink>` inside `<Alert>`
  — renders "…kontakt-e-post).Fyll inn nå". Treat it as the general rule: any
  space that touches an `{expr}` boundary inside a slot is unreliable, so write
  `{" "}` explicitly. Corollary when EXTRACTING markup into a shared component:
  the original probably had `{expr}{" "}` on its own line — carry it over
  verbatim instead of "tidying" it onto one line. Building the sentence in the
  frontmatter (`[a, b].filter(Boolean).join(" ")`) is immune to all of them and
  reads better.
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
  are all idempotent by design. (The join route, receipt page, webhook
  receiver and member-list UI, once listed here as unbuilt, all exist now —
  see below.)
  **Payment receipts** (added 2026-08-28, branch membership-receipt-emails,
  spec `specs/concepts/payment-receipt.md`): every captured charge — the join
  AND every renewal — owes its member exactly one receipt, in two same-content
  forms: the `kvittering.astro` page (renders an InfoList when the payment is
  confirmed) and a `membershipReceipt` email (`@stottemedlem/email`,
  non-declinable member notice, kind `receipt`). Sending is a comparison
  sweep, `sendOwedReceipts` in `src/lib/receipts.ts`: captured charges with no
  `member_notices` row pointing at them (migration 0010 added `charge_id` +
  a partial UNIQUE index = one payment, one receipt), 14-day lookback so a
  deploy never mails receipts for long-settled payments. Runs from the
  kvittering page, the webhook receiver (AFTER the event is applied — an email
  failure must never 500 the webhook or Vipps redelivers), and the nightly
  cron as the retry. The legal content (bokføringsforskriften § 5-1-6b jf.
  § 5-1-1 nr. 2–5, mval § 3-13 exemption) is ground-truthed in
  norwegian-receipt-law.md (this skill). Members with no email get the page
  only and are counted `unreachable` (self-limiting: they age out of the
  lookback). The fee-rule queries filter `kind = "fee-change"`, so receipt
  rows cannot disturb the 14-day fee rule.
  **Joining + the payment loop** (added 2026-08-20, same branch): public
  `POST /bli-medlem/[slug]/start` drafts the Vipps agreement (full annual fee
  as the agreement price, PRO-RATED initial charge) and 303s to Vipps;
  `kvittering.astro` is the redirect landing page (asks Vipps, never trusts the
  redirect — also the polling fallback); `min-side.astro?n=<manage_token>` is
  the member's own page (spec `concepts/member-self-service.md`: no login, the
  unguessable token IS the credential, offers a real stop, noindex).
  **Simplified 2026-08-31** (branch simplify-membership-page) to four things:
  the h1, the full-bleed card, ONE status line built in the FRONTMATTER
  (`statusLine` — `<tier> i <org> — <paid> kr betalt for <period>.` plus
  renews / does not renew), then the stop action. The "Dine hjerter" and "Del
  medlemsbeviset" sections are GONE: the card already shows the hearts and now
  carries its own share button, and the spec now forbids this page captioning
  its own card. `memberCardDisplayUrl` went with them;
  `POST /api/vipps/[slug]` is the per-org webhook receiver (HMAC-verified →
  401, unknown org → 404, apply failure → 500 so Vipps redelivers; `/api/vipps/*`
  is public in middleware). Shared logic in `src/lib/membership.ts`
  (`startJoin`, `syncAgreement`, `applyCharge`/`syncCharge`, `applyVippsEvent`) — the
  dispatcher ALWAYS syncs the agreement first because charge-captured beats
  agreement-activated in practice, and settles captures that arrived too early.
  **Webhook registration ("Betalingsvarsler") is AUTOMATIC since 2026-08-27**
  (branch automate-payment-reminder — there is NO manual connect button
  anymore): `ensureWebhookRegistration` + `webhookReceiverUrl` in
  `src/lib/vippsKeys.ts` (idempotent by URL comparison) run right after keys
  are saved/re-tested on `/o/[slug]/vipps` AND in every scheduled run
  (worker.ts, before reconcile, gated on `PUBLIC_ORIGIN`, logger area
  "webhooks"), storing the registration + one-time secret in Vault beside the
  keys; the page section is status-only, and "Test nøklene på nytt" doubles
  as the manual retry. Locally `VIPPS_WEBHOOK_SECRET` in `.dev.vars` stands
  in (test env only) — save-time registration fails politely on localhost
  (Vipps requires public https).
  **Worker cache gotcha this created:** the public-page cache now SKIPS any URL
  with a query string (an error message for one visitor must not be cached for
  all) and its key carries the date (the join page quotes a pro-rated price
  that changes daily) — `publicPageCache.ts` purge keys must match, incl. the
  date fragment.
  **Refunds** (built 2026-08-27, branch `refund-handling`, specs
  `problems/honouring-a-refund-request.md` + `use-cases/refund-a-payment.md`):
  ORG-INITIATED ONLY, never partial, offered on the member's page under
  Medlemmer. `refundMembershipPayment` in `src/lib/membership.ts` is the whole
  action, and the ORDER IS DELIBERATE: it stops the agreement FIRST, then
  refunds — money handed back on an agreement that renews anyway is the one
  state this must never leave behind, and a failure after the stop is
  retryable while a failure after the refund would not be. The amount is never
  ours: it refunds `summary.captured` read back from Vipps (`Charge.summary`,
  added to `packages/vipps`), and the 204 answer means the outcome is read back
  with `syncCharge`. Idempotency keys are DERIVED via `stableUuid`
  (`refund:<chargeId>`, `stop:<agreementId>`) — Vipps validates the key as a
  UUID, so a random one would let a double-press ask for a second refund.
  **The follow path is the half that is not optional:** `applyCharge` revokes
  on `REFUNDED` (`revokeMembershipForRefundedCharge` in `@stottemedlem/db` —
  nulls the charge's `membershipId`, then deletes the `memberships` row unless
  another charge still points at it), so a refund made in Vipps' PORTAL lands
  the same way, via webhook or the nightly sweep. `PARTIALLY_REFUNDED` is
  recorded and deliberately does NOT revoke (the year was still paid for); it
  can only ever arrive from the portal. Stars need no code — the scorecard
  derives from membership periods, so a revoked period takes its star with it.
  Policy lives in `@stottemedlem/core` (`refundRefusal`, `paymentState`,
  `REFUND_WINDOW_DAYS` = a real 365 days, NOT a period-scheme day) so it is
  unit-tested and so the member screen can import it without dragging in
  `cloudflare:workers`; the screen's shaping is `src/lib/refunds.ts`.
  **Known edge, accepted:** reconciliation's `rotation` group only revisits
  ACTIVE agreements, so a portal refund whose webhook was ALSO lost on an
  agreement stopped in the portal is never re-read. Webhook delivery or a
  still-active agreement covers every other case.
  **One member can hold SEVERAL agreements** (confirmed against staging D1
  2026-08-27, and it surprised us): joining, stopping and joining again drafts a
  NEW agreement with its own INITIAL charge, so one supporter can have two
  captured charges for the SAME period at the same price — on the accelerated
  calendar, minutes apart. `grantMembershipForCapturedCharge` is
  `onConflictDoNothing` per member+period, so BOTH charges end up pointing at
  ONE `memberships` row. Consequences that are easy to get wrong: refunding one
  of them must NOT delete the period (`revokeMembershipForRefundedCharge` checks
  for other charges first), and any UI listing payments must tell them apart —
  period + amount is not enough, and neither is the DAY (see the member screen's
  `whenLabel`, which adds the clock only when a day is shared). The
  duplicate-renewal alarm does NOT fire here: it only looks at RECURRING charges
  within one agreement.
  **Third consequence, found 2026-08-31: `min-side` is per-AGREEMENT while the
  member is not.** `findAgreementByManageToken` resolves ONE agreement (the
  token is per-agreement), but `listMembershipHistory` beside it is
  per-MEMBER — so any sentence on that page about the PERSON (above all
  "du blir ikke belastet igjen") must be derived member-wide or it lies:
  a member holding a stopped agreement and a live one gets promised the
  payments stopped while the other renews. `hasOtherRunningAgreement` in
  `@stottemedlem/db` is that check; use it for any new claim on that page.
  Same asymmetry to watch for in any future token-addressed member surface.
  **KNOWN AND UNHANDLED:** a member with TWO live agreements is charged twice
  per period, and nothing detects, prevents or reports it — not the join
  route, not reconcile, not the duplicate-renewal alarm. Deliberately left
  open 2026-08-31 (it needs prevention at join time, not wording); the
  self-service page only stopped MISDESCRIBING the state.
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
  current fee, and the PRODUCT notifies members (member notices, below).
  **A fee change is confirmed before it saves** (added 2026-08-28, branch
  price-change-confirmation): the tier form's save, when the fee changed and
  anyone is affected, stores nothing and re-renders with a confirm box —
  `feeChangeReach` in `lib/notices.ts` counts, against the PROPOSED fee, who
  would be emailed (no opt-out) and who is unreachable; the confirm form
  re-submits the values as hidden fields with `bekreft=1`, Avbryt links back
  to the tier list. A change affecting nobody saves straight through.
  Renewal timing lives in core
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
  **Heart brand mark + scorecard hearts** (added 2026-08-31, branch wry-frigate,
  specs `concepts/brand-mark.md` NEW + `concepts/scorecard.md` display rules;
  loyalty counters were briefly STARS the same day — the user replaced them
  with hearts, so don't reintroduce ★ anywhere): the RED HEART character (❤️)
  is the product's ONE symbol — the favicon of BOTH apps (character-in-`<text>`
  SVG trick, `public/favicon.svg`; marketing's was missing entirely before), it
  precedes the wordmark wherever brand attribution appears
  ("❤️ støttemedlem.no": PublicShell footer, marketing hero/404, both email
  footers, `qrCardSvg`'s default footer), AND it is what a member collects —
  `MemberOverview.hearts` in `@stottemedlem/db` is DERIVED (one per membership
  period; a full refund takes its heart), rendered by
  `components/HeartRows.astro` as a game-HUD buildup, ten ❤️ per row, no empty
  placeholders, count-form "❤️ 12" where space is tight (MemberRow, CSV
  export's "Hjerter" column). Surfaces: member detail history, member list,
  export, marketing perks row — plus the member card, which is how hearts now
  reach min-side and the receipts (the standalone "Dine hjerter" section on
  min-side was REMOVED 2026-08-31, see the card note below).
  **Member card + referrals** (added 2026-08-31, branch member-validity-card,
  spec `concepts/member-card.md` NEW; this REPLACES the old note that recruit
  counts / referrals / printable proof were unbuilt — they are built): the card
  is the member's proof of support — name, org + circled logo, hearts, validity,
  QR, brand attribution — drawn ONCE by `memberCardSvg` in `@stottemedlem/qr`
  and reused everywhere, so what a member shares is what they were shown.
  **ONE card, 760x1040 UPRIGHT, since 2026-08-31** (branch
  simplify-membership-page). It briefly had TWO shapes (`shape: "wide" |
  "tall"`, wide 1200x628 for link previews) — the user killed the wide one the
  same day: "we only need one version of the card… the one that's best
  suitable for mobile phones". Gone with it: `MemberCardShape`,
  `memberCardSize(shape)`, `MEMBER_CARD_TALL_*`, core's
  `MEMBER_CARD_SHAPE_PARAM`/`MEMBER_CARD_TALL_SHAPE` and the `?form=staaende`
  query, `memberCardShapeFromQuery`, the `shape` args on `memberCardOptions` /
  `renderMemberCardSvg`, render-card's `--shape`, and the `Upright*` stories.
  **Accepted cost, don't "fix" it:** og:image/twitter:image are now portrait,
  so feeds that preview 1.91:1 crop the card to its middle (name, chip,
  hearts, top of QR). That was the trade the user made.
  **The card is a self-contained block, and every layout number in it is
  coupled**: `drawCard` centres one stacked block between the header band and
  the attribution rule, so shrinking the QR (210→172, then the single card's
  240→196) does not tighten the card, it opens a hole in the middle — the
  canvas dropped 1120→1040 to compensate. Before changing any of them, compute
  the WORST case (`LongLoyalty`, 34 hearts → 4 shrunken rows) against the body
  height, confirm with `render-card --raster`, and re-decode with `verify-qr` —
  a smaller QR is only smaller until it stops scanning.
  Review card artwork with the `render-card` skill, not in Storybook alone.
  `MemberCardFigure.astro` is now a bare `<img>` (no `<picture>`) and owns two
  page-level behaviours: FULL-BLEED by default, cancelling `PublicShell`'s
  gutter (published as `--sm-page-gutter` — don't hard-code 1.25rem), capped
  at `max-width: 24rem` above 34rem so an upright card does not become a
  poster on desktop; and an optional `shareUrl` puts a share pill in the
  card's bottom-right (`navigator.share` → clipboard → plain navigation; drive
  both branches with `drive-page`). It is shared by min-side, kvittering AND
  `/medlemsbevis/[token]`, so a change there lands on three public pages.
  Public at `/medlemsbevis/<cardToken>` (+ `/kort.svg`, `/kort.png`), embedded
  on min-side, kvittering and the receipt email (which now LEADS with the card
  and attaches the PNG). Two separate secrets, and confusing them is the one
  real hazard here: `supporting_members.card_token` is safe to post publicly,
  `membership_agreements.manage_token` can STOP the membership — never render
  the latter anywhere shareable. Referral: the QR carries `?verva=<cardToken>`
  → hidden field on the join form → `membership_agreements.referred_by_member_id`
  (the joiner is still anonymous at draft time) → copied onto the member at
  activation, set once and only for a member row being CREATED (a returning
  supporter was not recruited today). `recruits` is derived, joins-with-a-payment
  only, and now sits on `MemberOverview` — so any new `MemberOverview` fixture
  needs it. Migration `0011_member_card.sql` backfills a card token for every
  existing member. Rendering/route details: `qr-codes.md` in this skill.
  **Member list** (added 2026-08-24, spec `use-cases/curate-member-list.md`):
  `/o/[slug]/medlemmer` (list, `?sok=` search) + `/o/[slug]/medlemmer/[memberId]`
  (history + the one editable thing, contact details). Queries live in
  `@stottemedlem/db` (`listOrganizationMembers`, `countMemberStandings`,
  `matchesMemberSearch`, `getOrganizationMember`, `updateMemberContactDetails`);
  status is DERIVED (never a column, never settable) and a supporter with no
  completed payment renders as "Ikke betalt", not lapsed.
  **Standing is FOUR values, not two** (added 2026-08-31, branch
  member-status-filters): `memberStanding(entry)` in `@stottemedlem/db` folds
  the two derived facts — `status` active/lapsed and `renewing` (any ACTIVE
  agreement) — into `renewing | ending | lapsed | unpaid`, and `unpaid` wins
  over everything because a supporter recorded on approval has a live
  agreement seconds before any money lands. **`ending` is the one that was
  missing**: a member who cancels in the VIPPS APP stays fully active until
  their period runs out, and the product already knew (webhook/reconcile set
  the agreement STOPPED — verified against staging D1) but only whispered it
  in a prose sentence, which is exactly the complaint that prompted this.
  `countMembersByStatus` is GONE — it also mis-counted `unpaid` people as
  lapsed. The WORDS and the filter pills live in
  `apps/backoffice/src/lib/memberStanding.ts` (`standingLabel`,
  `standingDescription`, `MEMBER_FILTERS`, `memberFilterFor`), imported by the
  row, the member page AND `eksport.csv.ts`, so the three can't disagree —
  put any new member-facing wording there, not inline in a screen. List pills
  are plain `?status=<key>` links (Norwegian keys: `aktive`, `fornyes`,
  `slutter`, `utlopt`, `ikke-betalt`) that compose with `?sok=`; each pill's
  count is over the WHOLE register, never the narrowed view. Two conventions this
  established, worth following for new back-office screens: (1) the page is thin
  — `requireOrgAccess(session, slug)` in `src/lib/orgAccess.ts` resolves the org
  + checks WorkOS membership (an org you may not see and one that does not exist
  are deliberately identical), then it loads data and renders a `*Screen.astro`;
  (2) that screen is a pure presentational component with a `.stories.ts`, which
  is the ONLY way to see an auth-gated page (see `preview-screenshot`) — fixtures
  shared via `components/memberFixtures.ts`. The whole list is loaded and
  filtered in the screen on purpose, so counts do not move while you search.
  **Org messages are REMOVED** (built 2026-08-25 as PR #32, removed
  2026-08-28, branch price-change-confirmation; specs
  `concepts/org-message.md` + `use-cases/keep-supporters-in-the-loop.md` +
  `problems/supporters-never-hear-back.md` all RETIRED): the product no
  longer carries an organization's own email to members — the member list
  offers a CSV export instead (`/o/[slug]/medlemmer/eksport.csv`,
  semicolon+BOM Excel-friendly via `csvDocument` in core, spec
  `use-cases/export-member-list.md`), and member NOTICES (fee changes) remain
  the only product-sent email. Gone with it: `/o/[slug]/meldinger`,
  `/bli-medlem/[slug]/meldinger-av` (must 404 now), `lib/messages.ts`,
  `memberUnsubscribePath`, the email package's `orgMessage`, the db message
  helpers, the ORG_MESSAGES binding + org-messages queue config (worker.ts
  keeps a drop-everything `queue` stub because the vipps-events consumer is
  still declared). The `org_messages`/`org_message_recipients` tables and
  `messages_declined_at` column stay in deployed DBs (additive migrations)
  but nothing reads them; the provisioned `org-messages(-staging)` queues on
  Cloudflare are simply unused. Useful harness pattern that survives the
  feature — with limits found 2026-08-28: a scratch `pnpm dlx tsx` script in
  `apps/backoffice` with wrangler's `getPlatformProxy({ configPath:
  "./wrangler.jsonc", persist: true })` (same live local D1 as `astro dev`)
  can drive app libs, no auth or queue needed — BUT (1) the script must live
  IN `apps/backoffice` (a scratchpad path can't resolve workspace deps),
  (2) it must be `.mts` (a bare `.ts` outside the package transpiles as CJS
  → "Top-level await is not supported"), and (3) it CANNOT import any lib
  that transitively imports `cloudflare:workers` — tsx dies with
  ERR_UNSUPPORTED_ESM_URL_SCHEME, and `src/lib/periods.ts` does exactly
  that, so most period-aware libs (notices, membership, renewals) are out
  of reach this way. For those, validate via unit-tested core/db functions
  + HTTP against `astro dev` instead.
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
  (`feeChangeNotice`, `membershipReceipt`, Norwegian).
  **Resend's BATCH endpoint does not accept attachments** (verified against the
  docs 2026-08-31: "The `attachments` field is not supported yet" on
  `/emails/batch`), so since the member card `createResendSender` splits —
  a message with `attachments` goes one-at-a-time to `POST /emails`, everything
  else still batches — and results are re-assembled IN THE CALLER'S ORDER,
  because `sendOwedReceipts`/`notices` read results by position. Keep
  attachments to the few messages that want them.
  **Reading Resend's docs:** the rendered HTML is a JS shell that greps as
  noise; append `.md` to any docs URL for the source
  (`resend.com/docs/api-reference/emails/send-batch-emails.md`) and grep that.
  `resend.com/docs/llms.txt` is the index. **The sending address is always ours**
  (`EMAIL_FROM_ADDRESS` var, `noreply@xn--stttemedlem-hgb.no`) — a provider only
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
  dev-only story pages): root alias `pnpm story` / `pnpm stories` (added
  2026-08-31; pre-builds core+db+qr first — the backoffice screen stories
  import `@stottemedlem/qr`, so without its `dist/` the build dies with
  "Failed to resolve entry for package") or
  `pnpm --filter @stottemedlem/ui run storybook --ci`
  (port 6006) via the community `@storybook-astro/framework` (Storybook 10 +
  Astro 7; storybook-astro.org).
  Pinned at `storybook` + `@storybook/builder-vite` `^10.5.10` and
  `@storybook-astro/framework` `^1.10.0` (upgraded and re-locked deliberately
  2026-08-31; `build-storybook` verified green). Framework 1.11.0 exists but is
  held back by the workspace's 7-day `minimumReleaseAge` quarantine — that is
  policy, not a bug, so do not fight it with `minimumReleaseAgeExclude`.
  **Running Storybook can rewrite `packages/ui/package.json` and break CI**
  (hit 2026-08-31): an automigration bumped those specifiers in the MANIFEST
  while leaving `pnpm-lock.yaml` alone, so `pnpm install --frozen-lockfile` — the
  FIRST step of ci.yml — dies with "specifiers in the lockfile don't match
  specifiers in package.json" before a single test runs. Nothing local catches
  it: test/typecheck/build/lint all stay green against the already-installed
  node_modules. **The `verify-workflow` skill DOES catch it** (tested by
  re-breaking it deliberately 2026-08-31: `run-steps.mjs .github/workflows/ci.yml
  check` exits 1 on "Install dependencies" with ERR_PNPM_OUTDATED_LOCKFILE) —
  which is the argument for running it before every push, not just after
  editing a workflow. Bare `pnpm install --frozen-lockfile` is the same check,
  cheaper. Fix it by re-locking deliberately (`pnpm install`), not by hand-
  editing either file back. Stories are CSF colocated with components
  (`*.stories.ts`); slots pass via `args.slots.default` (HTML string, component
  ref, or configured `{ component, props, slots }`); a second glob in
  `packages/ui/.storybook/main.ts` pulls in app screen stories from
  `apps/backoffice/src` (e.g. CreateOrgScreen, wrapped in the shared
  `ScreenFrame.astro` via a configured-component slot since decorators aren't
  supported yet). **Storybook's own onboarding UI is turned off** in
  `packages/ui/.storybook/main.ts` (2026-08-31): `features.sidebarOnboardingChecklist`
  + `features.menuOnboardingChecklist` = false kill the "Getting started"
  checklist box at the top of the sidebar and its Guide menu entry, and
  `core.disableWhatsNewNotifications: true` kills the "Learn what's new in
  Storybook" popup bottom-left. These flags are undocumented in the release
  notes — the way to find such a switch is to grep the shipped manager bundle:
  `grep -o -E "FEATURES\?\.[A-Za-z]+" packages/ui/node_modules/storybook/dist/manager/runtime.js
  | sort -u` lists every manager-side feature flag (also `changeDetection`,
  `controls`, `interactions`, `viewport`), and `python3` + a regex window around
  a UI string finds the component that reads it. Verifying a change to Storybook's
  own chrome means shooting the MANAGER url, not a story iframe:
  `npx playwright screenshot --channel=chrome --viewport-size=1440,900
  --wait-for-timeout=7000 "http://localhost:6006/?path=/story/primitives-button--primary" out.png`.
  Screenshot loop: see `preview-screenshot` skill. Gotcha that
  motivated the package: Astro `<style>` in a layout is scoped, so styling
  slotted page content from `Shell.astro` silently does nothing — never style
  across the slot boundary; use the primitives.
- `specs/` — the product intent layer (problems → use cases → concepts). Entry: `specs/INDEX.md`.
- `.claude/hooks/` — Stop hooks: `spec-sync-stop.sh` (spec harness) + `close-gaps-stop.sh`.
- `CLAUDE.md` — auto-loaded agent instructions; the canonical "start here".

## Run / build / test
- `pnpm install` · `pnpm dev` · `pnpm build` · `pnpm test` (vitest) · `pnpm typecheck` · `pnpm lint` (Biome) · `pnpm format`.
- **Never pipe a check into `head`/`tail` — you read the pager's exit code, not
  the check's.** `pnpm typecheck 2>&1 | tail -20` exits 0 while typecheck fails
  (cost a false "typecheck ✓" on 2026-08-27). Run
  `pnpm --filter <pkg> typecheck > /tmp/tc.log 2>&1; echo $?` and grep the log,
  or end the pipeline with `; echo exit=${PIPESTATUS[0]}`.
- **`astro check` typechecks `.stories.ts` too**, and nothing else does —
  `pnpm test` and `astro build` both pass with broken story types. After
  touching stories, run the backoffice `typecheck`, not just the build. Two
  traps there: `const [x] = FIXTURES` is `possibly undefined` (export named
  fixture consts instead of indexing an array), and a helper default
  `(warnings = [])` infers `never[]` — annotate it (`warnings: OrgWarning[] = []`).
- **A fresh worktree has NO `node_modules`** (nothing is shared with the main
  checkout): `pnpm lint`/`typecheck`/`test` fail up front with `sh: biome:
  command not found` / `turbo: command not found`, which is a missing install,
  not a broken tree. Run `pnpm install` once per worktree first (~seconds, the
  store is shared).
- **Dependency changes have three workspace-level rules** (`catalog:` shared
  versions, a 7-day `minimumReleaseAge` quarantine, blocked postinstall
  scripts) and one trap that reads as an unrelated types error: a filtered
  `pnpm --filter X update` leaves every OTHER package without `node_modules`.
  Read `dependencies.md` before any `pnpm add` / `pnpm update`.
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
  for a file the PR added, not the PR's own merged/unmerged status. **Second
  stranding variant (cost the kvittering fix a near-miss, 2026-08-27):
  commits pushed to a branch AFTER its PR merged go nowhere** — GitHub
  ignores them, `git push` still says success. In a long session, before
  pushing more work to the same branch, check `gh pr view --json state`; if
  MERGED, the push needs a NEW PR (same branch works — it diffs against
  main), and audit `git log origin/main..HEAD` for what's stranded.
- Single package: `pnpm turbo run <task> --filter=@stottemedlem/<name>`.
- **A green `pnpm test` does NOT prove the tests ran here** (hit 2026-08-27).
  The first `pnpm test` in a freshly-installed worktree reported `12 cached,
  12 total >>> FULL TURBO` in ~100ms and replayed cached stdout captured in
  OTHER worktrees — the log lines carried sibling worktree paths
  (`.../grateful-band/packages/vipps`, `.../petalite-sting/packages/qr`). Turbo
  keeps replay logs in per-package `.turbo/turbo-<task>.log` and restores task
  output by content hash; the hash does not include the worktree path, so
  identical sources replay across worktrees. (Observed directly; the exact
  sharing mechanism was not pinned down — deleting the `.turbo` dirs did not
  stop it.) **When you need real proof a task executed — before claiming tests
  pass, or when validating a CI change — add `--force`:**
  `pnpm turbo run test --force` (cold: 12 tasks, 119 tests, ~2.4s). `pnpm test
  -- --force` does NOT work; the `--` swallows the flag and turbo runs 0 tasks.
- Build-order gotcha: the apps consume `@stottemedlem/core` / `@stottemedlem/qr`
  from their built `dist/`, so an app build needs those packages built first.
  `pnpm --filter @stottemedlem/marketing run build` alone fails with
  `Rolldown failed to resolve import "@stottemedlem/core"` — it bypasses Turbo's
  dependency graph. Use `pnpm turbo run build --filter=@stottemedlem/marketing`
  (Turbo builds deps first) or build the packages before the app. `astro preview`
  serves `dist/` live, so the visual loop is: turbo build → preview → screenshot.
  **This bites a PACKAGE's own unit tests too, not just app builds** (hit
  2026-08-31): `cd packages/db && npx vitest run` dies with `Failed to resolve
  entry for package "@stottemedlem/core"` — `packages/db` imports core, and a
  fresh worktree has no `packages/core/dist/`. It reads like a broken test file
  and is a missing build. Never reach for a bare `npx vitest` to iterate on one
  package; `pnpm turbo run test --filter=@stottemedlem/db --force` is the same
  speed (~1.6s) and builds core first. (`--force` for the reason below: turbo
  replays cached output across worktrees.)
- Conventions: ESM everywhere; never use the `any` type; use `ast-grep` for structural search.
- **A client `<script>` in an `.astro` component is typechecked under the DOM
  tsconfig, and two things bite there** (both hit 2026-08-31 writing the member
  card's share button, and both are invisible to `pnpm test`/`build` —
  only `astro check` sees them): (1) `for (const el of
  document.querySelectorAll(...))` fails with ts(2488) "must have a
  `[Symbol.iterator]()`" — use `.forEach()`, and type the collection with
  `querySelectorAll<HTMLAnchorElement>(…)` so the element is not `Element`;
  (2) an unbalanced brace inside the script is reported as ts(1005) "')'
  expected" pointing at the `</script>` LINE, not at the actual mistake — read
  the block, don't trust the line number. Prove such a script actually works
  with the `drive-page` skill; nothing else in the repo executes it.
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
  **`pnpm lint` (Biome) is GREEN as of 2026-08-27 and is enforced in CI** — this
  REPLACES the long-standing "lint is red even on a clean tree" (true
  2026-08-12 → 2026-08-27). It exits 0 with **0 errors and ~380 warnings**
  (~296 on 2026-08-27, ~383 on 2026-08-31 — the count grows with every new
  `.astro` file, so treat it as noise, never as a regression):
  `biome check` fails on errors only, and the warnings are the known false
  positives — Biome parses only `.astro` frontmatter, so imports/props used
  solely in the template trip noUnusedImports/noUnusedVariables (Shell,
  PublicShell, CreateOrgScreen, …). **Never "fix" those by deleting the
  imports**, and don't add `--error-on-warnings`.
  **When `pnpm lint` DOES go red, don't grep its output for "error"** — the
  hundreds of warnings print the word too, and Biome truncates with
  "Diagnostics not shown: 363", so the real failures are usually not even in
  the output. Ask for them directly:
  `npx biome check --diagnostic-level=error .` prints only the errors, with
  the exact formatter diff. Then `npx biome check --write <paths>` fixes the
  safe ones (format + import order — the two that a hand-written import line
  or a new export in a test file will trip every time; both hit 2026-08-31).
  Run the pair after any edit, since `.claude/` is linted too. The 8 errors that used to
  make it red were cleared like this: 4 `noControlCharactersInRegex` in
  `packages/core/src/index.ts` were a FALSE POSITIVE — stripping control
  characters is what `normalizeMembershipTierDescription` is for — so they got
  a `// biome-ignore` with a reason, not a rewritten regex; the other 4 were
  formatting/import-order, fixed by `biome check --write` (safe fixes only,
  which is why it did not touch the `.astro` imports above). **Gotcha:** a
  `biome-ignore` comment must be a SINGLE line immediately above the node —
  continuing the reason onto further `//` lines silently breaks the
  suppression and the rule still fires.
  **Biome checks `.claude/` too, so a new SKILL SCRIPT can turn CI red** —
  `.claude/` is not gitignored and biome.json has no exclude for it (proved
  2026-08-27: dropping one sloppily-formatted `.mjs` under `.claude/skills/`
  flipped `pnpm lint` from 0 to 1; two of the eight original errors were
  exactly this, in `cloudlogs.mjs` and a script written that same session).
  After writing or editing anything under `.claude/skills/`, run
  `pnpm lint` — or just `npx biome check --write .claude/` — before pushing.
  **Reformatting a long-unformatted config is safe but noisy** (`wrangler.jsonc`
  was tab-indented → 496-line whitespace diff). Prove such a diff is
  semantics-preserving rather than eyeballing it: parse both revisions with
  comments stripped and deep-compare their JSON, and check the comment count
  survives (`grep -c '^\s*//'`).
- **Brand attribution (rule, 2026-07-28):** every public-facing surface carries a
  subtle "støttemedlem.no" (ø in visible text, punycode in hrefs; admin-only
  backoffice screens exempt; bare QR images exempt — the card around them carries
  it, via `qrCardSvg`'s default `footer`). Spec: `specs/concepts/brand-attribution.md`.

## Deployment (as of 2026-07-07)
- **PRs now run checks** (`.github/workflows/ci.yml`, added 2026-08-27 — this
  REPLACES the long-standing "nothing runs on a pull request", true through PR
  #27). One `check` job on `pull_request` + `push: main` runs
  `pnpm turbo run test typecheck build` on ubuntu-latest with no secrets, so it
  works on forked PRs too. **Confirmed green on a real runner** (PR #43, run
  33067643844, 43s) — a workflow added *inside* a PR does run on that same PR,
  so a CI change proves itself. Cold run ~9s for 22 tasks locally.
  - **`main` is NOT branch-protected** (`gh api repos/.../branches/main/protection`
    → 404 "Branch not protected", checked 2026-08-27), so `check` is ADVISORY:
    a red PR is still mergeable and nothing blocks a merge. Making it a required
    status check is a repo setting, not a file — it has to be done via
    `gh api` / the dashboard, and has NOT been done.
  - **All three workflows pin actions that target Node 20**
    (`actions/checkout@v4`, `actions/setup-node@v4`, `pnpm/action-setup@v4`).
    Every run now carries a deprecation annotation — GitHub force-runs them on
    Node 24; it is a warning, not a failure. Kept at v4 so the new workflow
    matches the two deploy ones; bumping all three to v5 is a separate change.
  - **It seeds `.dev.vars` first** (`cp apps/backoffice/.dev.vars.example
    apps/backoffice/.dev.vars`). Without that the backoffice typecheck fails on
    a runner for exactly the reason it fails in a fresh worktree — `wrangler
    types` folds `.dev.vars` keys into `Env`, and the file is gitignored (see
    the `.dev.vars` note in the backoffice section). Placeholder values are
    enough for types and are useless as credentials.
  - **`lint` IS in CI** (added 2026-08-27, after fixing the 8 errors that had
    kept it out — see the `pnpm lint` note under Tooling gotchas). It runs
    AFTER test/typecheck/build on purpose: lint is ~50ms, but running it first
    would let a formatting nit mask a genuinely broken test.
  - Deploy still only happens on merge to `main`, and merging still applies
    remote D1 migrations (each deploy job runs `wrangler d1 migrations apply
    --remote` first), so merge is when schema changes land for real — keep them
    additive. CI does NOT cover anything needing a real remote: no deploys, no
    D1 migrations, no Vipps rig, no public-route checks.
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
**Method that works (2026-08-27): `curl` the yaml to a file and grep it, and `curl` the
doc page + strip tags rather than WebFetch it.** WebFetch summarizes with a small model
and DROPS things — asked about refunds it answered "no information available" for a page
that had none, while the yaml (`recurring-swagger-id.yaml`, 128 KB, 200 OK) carried the
whole `RefundChargeV3` + `RefundRequest` contract, and grepping the guide's stripped HTML
produced the exact quotes (365-day refund window, rate limits) that the summary missed.
Hard rules and exact wording live in the yaml and in the guide's own tables — go there.

## Index
| doc | covers |
|-----|--------|
| (canonical) `CLAUDE.md` | the mandatory spec harness + start-here loop |
| (canonical) `specs/process.md` | the spec-driven loop in full + enforcement |
| (canonical) `specs/INDEX.md` | high-level product map / spec registry |
| (canonical) `README.md` | monorepo layout, commands, toolchain |
| stop-hooks.md | how the two Stop hooks compose + how to test a hook locally. **Write `specs/**` with the Write/Edit tool, never a bash heredoc/python:** the spec hook only reads Edit/Write/MultiEdit/NotebookEdit calls out of the transcript, so Bash-written specs are invisible and it blocks the stop claiming you reconciled nothing — the default outcome in bypass-permissions mode, and it costs a turn every time (hit again 2026-08-27) |
| dependencies.md | pnpm workspace policy — `catalog:` centralised versions; the 7-day `minimumReleaseAge` supply-chain quarantine (why `pnpm update --latest` silently lands below npm's latest, and why `minimumReleaseAgeExclude` is the wrong fix); `onlyBuiltDependencies`; **the filtered-update trap** — `pnpm --filter X update` strands every OTHER package's `node_modules` and surfaces as a bogus `TS2304: Cannot find name 'crypto'`; re-lock check before pushing |
| qr-codes.md | @stottemedlem/qr package split, the /api/qr/[slug] embed contract (backoffice), the front-page card preview (marketing), qrcode-lib gotchas, open domain-routing item |
| (canonical) `docs/research/pii-in-admin-urls-and-phone-masking.md` | precedent research (2026-08-28) behind the ACCEPTED search-term-in-URL open question: search-in-URL is the industry norm (Stripe/Zendesk ship it as a feature), no GDPR enforcement on the pattern, no competitor masks admin-facing phone numbers, Vipps' masking = strangers-payment pattern; + the hardening options if revisited |
| phone-number-privacy.md | verified legal ground truth on masking/displaying member phone numbers: NO law requires masking (PCI DSS masks card PANs, nothing similar for phone); GDPR art. 5(1)(c)/25(2) analysis, why full display to org admins is within purpose, + the 2026-08-28 audit of every phone surface and the real gaps (search-in-URL, phone-as-title) |
| norwegian-receipt-law.md | verified legal ground truth for payment receipts: bokføringsforskriften § 5-1-6b (membership fees need only betalingsdokumentasjon with § 5-1-1 nr. 2–5 — no numbering, no PDF), mval § 3-13 VAT exemption, the rules that do NOT apply (kassasystem, § 5-2-9 file format, tax deduction), + how to curl Lovdata (WebFetch drops legal text) |
| (skill) `vipps-test-rig` | drive a REAL recurring subscription on apitest from the CLI (agreement → MT-app approval → charges → webhooks → stop) + the local receiver and tunnel; the sandbox-DNS gotcha when verifying a tunnel |
| (skill) `verify-workflow` | `node .claude/skills/verify-workflow/run-steps.mjs <workflow.yml> [job] --force-turbo` — run a GitHub Actions job's `run:` steps locally in a scrubbed, runner-like env; proves a CI change before pushing. Skips `uses:` steps and any step with a `${{ }}` expression (that guard is what stops it firing a real deploy / `--remote` D1 migration) |
| (skill) `verify-qr` | decode a generated QR PNG (file or URL) + assert payload — real scan-level proof |
| (skill) `render-card` | `node .claude/skills/render-card/render.mjs --raster` — draw the member card + the org QR card from real `@stottemedlem/qr` with NO server/D1/auth, rasterize through the SHIPPED resvg + embedded-Fraunces path, and emit a browser-vs-resvg contact sheet. The only way to see what a shared PNG / og:image / receipt attachment really looks like: resvg applies no variable font axes, so its text is bolder AND WIDER than any browser preview |
| (skill) `verify-public-routes` | + `d1.sh "<SQL>" [local\|staging\|production]` — read D1 rows as JSON, now including the DEPLOYED databases (SELECT-only off local; ask staging what shapes it really holds before trusting a fixture) (the member-registry tables incl.); assert the public join pages over real HTTP (status, `/org/*` 301s, `x-sm-cache` miss→hit, brand attribution) + `seed.sh`, the tier-aware local D1 seed |
| (canonical) `docs/architecture/overview.md` | proposed architecture: 2 deployables (Astro static marketing + one Astro-SSR Worker for backoffice/API/webhooks/cron/queues), D1 as system of record, WorkOS org-gated admin, Vipps Login for members, 11-step scaffolding plan |
| (skill) `stack-docs` | verified platform gotchas: Astro CF adapter custom worker entry, WorkOS SDK on Workers |
| (skill) `spec-lint` | `node .claude/skills/spec-lint/check.mjs` — validates spec links + INDEX registration after any specs/ edit |
| (skill) `preview-screenshot` | headless-Chrome screenshot of any local URL → Read the PNG; the visual validation loop for UI work |
| (skill) `drive-page` | `node .claude/skills/drive-page/drive.mjs <url> click=… assert=…` — CLICK a real page and assert what happens, incl. `--stub` for browser APIs a headless run lacks (`navigator.share`, clipboard). The only loop that executes an `.astro` client `<script>`; the screenshot loop's behavioural twin |
| (skill) `dev-logs` | `bash .claude/skills/dev-logs/devlog.sh start\|tail\|grep` — read the dev server's stdout (console.log/error, request lines, SSR stack traces) via `astro dev --background` + `.astro/dev.log`; foreground `pnpm dev` output is unreadable to agents |
| (skill) `cloud-logs` | search the DEPLOYED backoffice Workers' stored logs (staging + prod, 7-day retention) via `node .claude/skills/cloud-logs/cloudlogs.mjs` — search/filter/count/invocations over the Cloudflare observability query API (needs the dashboard-minted read token in `~/.config/stottemedlem/cloudflare-logs-token`; wrangler OAuth can't do it) + `wrangler tail` for live; errors also in Sentry (~90 d) via the Sentry MCP |
| (canonical) `docs/vipps-local-recurring-test.md` | runbook for rehearsing a real recurring subscription on apitest from the CLI: prerequisites (test keys, MT app + test users, cloudflared), the tunnel and why it's needed, the lifecycle commands, what to look for at each step, cleanup, troubleshooting |
| (canonical) `docs/research/vipps-recurring-payments.md` | verified Vipps Recurring API v3 research (yearly agreements, tiers via LEGACY pricing PATCH, 10 webhook events, local DB as system of record, NO onboarding/retention rules); **§13 = refunds** (endpoint + required amount/description/Idempotency-Key, 204 not the charge, 365-day window, refund≠cancel, refund does NOT stop the agreement, portal refunds still webhook us, `PARTIALLY_REFUNDED` arrives unasked, "Refund is not possible" = single-settlement sales unit, 5/min rate limit); Appendix A rules out Vipps Donasjoner definitively (monthly-only enum, no API amount control) — read before any payment work; not yet fed into `specs/` |
| (canonical) `docs/vipps-portal-walkthrough/README.md` | IN-PROGRESS (started 2026-07-28) recorded click-through of portal.vippsmobilepay.com with user-supplied screenshots (→ `images/`) — verifies onboarding checklist open question 6 and collects MSN + test API keys; session log is empty until the first screenshot lands — continue the recording there, one numbered entry per screen |
| (canonical) `docs/vipps-org-onboarding.md` | iterable checklist of what an org must do to get Vipps live — baseline assumes an EXISTING standard Vipps business account; steps = add Faste betalinger to the agreement, approval, then org pastes its own MSN + API keys (DECIDED 2026-07-28: no Vipps platform-partner model to begin with) — in two forms: detailed post-org-creation instructions + 3-step marketing-site headlines — the source for future onboarding UI/marketing copy; not yet fed into `specs/` |
