---
name: stack-docs
description: Verified platform facts for the stottemedlem stack (Astro on Cloudflare Workers, WorkOS on Workers, Vipps MobilePay test environment). Load before scaffolding or configuring apps/marketing or apps/backoffice, assuming how the Astro Cloudflare adapter / WorkOS SDK behave on Workers, or starting Vipps API work.
---
# Stack facts (verified 2026-07-03, in-repo)

The chosen architecture is in `docs/architecture/overview.md` (canonical). These facts
were verified against vendor docs and then **confirmed by the actual scaffold** in
`apps/marketing` + `apps/backoffice` — read those for working examples.

## Astro Cloudflare adapter: one Worker with fetch + scheduled + queue

Installed: astro 7 + `@astrojs/cloudflare` **v14** (v14 pairs with Astro 7; released
2026-06-22). Set `main: "./src/worker.ts"` in `wrangler.jsonc` and export a standard
Worker object; Astro's request handling comes from `@astrojs/cloudflare/handler`:

```ts
import { handle } from '@astrojs/cloudflare/handler';
export default {
  fetch: (req, env, ctx) => handle(req, env, ctx),
  scheduled: (controller, env, ctx) => { /* cron */ },
  queue: (batch, env) => { /* consumer */ },
} satisfies ExportedHandler<Env>;
```

Gotcha: v12 used an adapter option `workerEntryPoint: { path, namedExports }` with a
`createExports()` convention — **removed in v13**. Don't mix the two patterns; check
the installed adapter major before writing the entry file.
Source: https://docs.astro.build/en/guides/integrations-guide/cloudflare/

Verified v14 behaviours (from the scaffold):
- `astro dev`/`preview` run in **real workerd** (Cloudflare Vite plugin) — local
  D1/KV/Queue bindings work in dev, no separate `wrangler dev` needed.
- Build writes `dist/server/wrangler.json`; plain `wrangler deploy` from the app dir
  picks it up automatically (config redirection). `wrangler deploy --dry-run`
  validates without auth.
- The adapter **auto-injects** a `SESSION` KV binding and an `IMAGES` binding at
  build. First real deploy needs a session KV namespace created (or sessions
  disabled) even though `SESSION` isn't in our wrangler.jsonc.
- Assets-only Worker (marketing): `assets.not_found_handling: "404-page"` requires a
  built `404.html` → keep `src/pages/404.astro`.

## TypeScript: Workers runtime types vs DOM (dual tsconfig)

`wrangler types` generates `worker-configuration.d.ts` (gitignored) whose runtime
globals **conflict with the DOM lib** that Astro's JSX types require. Pattern used in
`apps/backoffice`: app `tsconfig.json` (Astro strict + DOM) excludes `src/worker.ts` +
`worker-configuration.d.ts`; `tsconfig.worker.json` (lib ES2023, no DOM) includes only
those. Typecheck script chains: `wrangler types && astro check && tsc -p
tsconfig.worker.json`. Don't add `@cloudflare/workers-types` — generated types replace it.

Cache API across the split (verified 2026-08-19, SWR org-page caching):
`caches.default` exists only in the Workers types, so app code under the DOM
tsconfig can't use it. **Named caches — `await caches.open("name")` — typecheck
in BOTH worlds** (DOM CacheStorage and Workers) and workerd/Miniflare support
them in `astro dev`, so shared cache logic uses a named cache. Also verified:
the custom `src/worker.ts` fetch handler DOES run under `astro dev` (not just
built deploys) — worker-level caching/webhook interception is curl-testable in
dev (`x-sm-cache: hit|miss` pattern in worker.ts). Gotcha: **the local Cache
API persists in `.wrangler/state` across dev-server restarts** — after a code
change + restart, the first visit to a cached page still serves the PRE-change
copy (that's SWR working, not a broken build); curl twice, or purge, before
judging a change invisible.

## Repo-specific install gotchas

- `workerd` must be in `onlyBuiltDependencies` (pnpm-workspace.yaml) — its postinstall
  downloads the runtime binary; pnpm 10 blocks it otherwise and dev silently breaks.
- **`pnpm --filter <pkg> deploy` does NOT run the package's `deploy` script** — it
  invokes pnpm's built-in `deploy` command and fails with
  `ERR_PNPM_INVALID_DEPLOY_TARGET`. Always `pnpm --filter <pkg> run deploy`
  (bit the first marketing CI run, 2026-07-07).
- `minimumReleaseAge` (7 days) silently resolves ranges to older releases — e.g.
  `^7.0.0` → 7.0.3 when 7.0.6 is 1 day old. Expect lockfile versions to lag npm.
- A plain `pnpm add` can leave a package's *declared* deps unlinked in its
  `.pnpm/<pkg>/node_modules/` (seen 2026-07-28: `recast` missing `tslib` →
  Storybook died with `Cannot find module 'tslib'`). Not a missing-dependency
  bug in the package — a broken link state; `pnpm install --force` (slow, ~5
  min) heals it.
- **Astro 7 dev servers are persistent daemons.** `pkill` does not deregister them —
  the next `astro dev` refuses with "Another astro dev server is already running".
  Stop with `pnpm --filter <app> exec astro dev stop` (or start with
  `astro dev --force`). Applies to smoke tests: always `astro dev stop` after.
- **Astro's compiler collapses the newline between text and an inline element** in
  `.astro` templates: `Skriv til\n<a>…</a>` renders as `Skriv til<a>` (no space).
  Keep the text and the inline element on one line with an explicit space, and
  verify in `dist/` output (bit the marketing footer contact link, 2026-07-07).
- Biome lints `.astro` frontmatter as plain TS and can't see template usage → false
  "unused variable" on frontmatter vars only used in the template. Inline the
  expression in the template or suppress; do NOT auto-apply Biome's `_` rename (it
  breaks the template reference).
  **Consequence (as of 2026-07-08): `pnpm lint` exits 1 on `main` itself** — false
  `noUnusedImports` on `HeroBackdrop.astro` (`Image`) and `index.astro`
  (`HeroBackdrop`), both template-used, plus an organizeImports warning. When lint
  fails, check whether YOUR files are the cause before chasing it:
  `pnpm exec biome check <changed paths>` — don't "fix" the false positives by
  removing template-used imports (breaks the build).

Zone routes vs custom domains (verified live 2026-08-12): a zone route
(`{ pattern: "xn--stttemedlem-hgb.no/bli-medlem/*", zone_name: … }`) on one Worker
**takes precedence over another Worker's custom domain** on the same hostname —
this is how the SSR backoffice serves the canonical public org pages on the
apex while the assets-only marketing Worker keeps everything else. Reuse the
same pattern for future public paths (`/api/qr/*`). Wrangler
warns "routes will attempt to serve Assets on a configured path" — harmless.

Webhook pattern: route `POST /webhooks/vipps` in `worker.ts` *before* delegating to
`handle()` — the webhook path is then plain Worker code (raw `Request` for HMAC over
the raw body; no framework body parsing). Astro endpoints also pass the raw `Request`
through untouched, so either placement is HMAC-safe. If the non-webhook API surface
ever outgrows Astro's basic routing, mount Hono in the same `worker.ts` before
`handle()` — additive, no architecture change.

## Astro images (`astro:assets`) — verified 2026-07-07

- **`sharp` is NOT bundled with astro 7** — the default image service throws at
  build the first time an `<Image>` actually renders. Add `sharp` to the app's
  devDependencies (done in `apps/marketing`). sharp ≥0.33 ships prebuilt binaries
  via optional deps, so pnpm's `onlyBuiltDependencies` gate does not block it.
- **Zero-image globs hide the failure**: `import.meta.glob` over an empty folder
  builds fine because the image service never runs. To validate the pipeline
  before real assets exist, generate throwaway images with sharp itself
  (`sharp({create:{width,height,channels,background}}).jpeg().toFile(...)`),
  build, then delete them.
- Working example: `apps/marketing/src/components/HeroBackdrop.astro` — glob +
  `<Image widths sizes>` emits hashed multi-width `.webp` srcsets in `dist/_astro/`.
- Native CSS masonry (`display: masonry` / `grid-template-rows: masonry`) is still
  unshipped in stable browsers (as of 2026-07); CSS multi-column is the working
  masonry for decorative layouts.
- To review a folder of images in one Read (ordering, focal points), composite a
  labeled contact sheet with sharp: resize each to ~300px wide, stack an SVG
  filename label under each, composite column-major onto one canvas. Filenames
  with spaces/parens are fragile as Vite asset URLs — rename to `NN-slug.ext`;
  the numeric prefix doubles as composition order for globbed collages.
- **Sourcing backdrop/stock photos (verified 2026-08-12):** Unsplash's internal
  search API works unauthenticated via curl:
  `curl -s "https://unsplash.com/napi/search/photos?query=<urlencoded>&per_page=6"`
  — but returns **401 with a Mozilla User-Agent** (python urllib fails; curl's
  default UA works). Skip results whose `urls.raw` is on `plus.unsplash.com`
  (Unsplash+ premium, restricted license); only `images.unsplash.com` is the
  standard free license. Download to match the existing backdrop assets
  (EXIF-stripped ~640px progressive JPEG) with `{urls.raw}?w=640&q=75&fm=jpg&fit=max`.
  Record photo ids in `apps/marketing/src/assets/backdrop/README.md` (Sources
  table) for license provenance. New files continue the `NN-slug.jpeg` sequence;
  off-center subjects get a `focalPoints` entry in `HeroBackdrop.astro`.
  CSS multi-column fills column-by-column, so appended images cluster in the
  right-most columns — fine for variety, renumber only if composition demands it.
  User-supplied photo drops (e.g. ~/Downloads): re-encode to the convention with
  sharp — `.rotate()` (bake EXIF orientation) + `.resize(640,640,{fit:'inside',
  withoutEnlargement:true})` + `.jpeg({quality:75,progressive:true})` (sharp
  strips metadata by default). Dedupe BEFORE adding: md5 catches nothing when
  files were re-downloaded at different sizes — the real dupes are
  same-photo-different-encode and same-shoot-different-frame, found only by a
  side-by-side contact sheet against the existing backdrop images with the same
  theme (verified 2026-08-12: 4 of 10 user downloads duplicated existing assets).

## WorkOS on Cloudflare Workers

`@workos-inc/node` supports the Workers runtime (fetch API + Web Crypto, no Node
`http`/`crypto`). Gotcha: at least one v7 release broke on Workers via a `buffer`
polyfill (workos-node issue #1130) — smoke-test the installed version under
`wrangler dev` before building on it. AuthKit has no Astro-specific SDK; use the Node
SDK directly in Astro middleware (walkthrough: https://chan.dev/authkit-astro/).
Sources: https://workos.com/blog/launch-week-spring-2024-day-4-cloudflare-workers-edge-support · https://github.com/workos/workos-node

Verified 2026-07-08 (backoffice AuthKit login, scaffolding step 3):
- **v10.7.0 works on workerd out of the box** — the package `exports` map has a
  `workerd`/`edge-light` condition resolving to a `index.worker.mjs` build, so a
  plain `import { WorkOS } from "@workos-inc/node"` picks the Workers-safe bundle
  automatically. No buffer crash with `nodejs_compat` on. (The #1130 warning was a
  v7 concern; long gone by v10.)
- **Sealed sessions need no `iron-session` dep.** The SDK seals/unseals internally:
  `authenticateWithCode({ code, clientId, session: { sealSession: true, cookiePassword } })`
  returns `{ user, organizationId?, accessToken, refreshToken, sealedSession }`;
  store `sealedSession` in an httpOnly cookie; `userManagement.loadSealedSession({
  sessionData, cookiePassword })` → a `CookieSession` with `authenticate()` (verify),
  `refresh({ organizationId?, cookiePassword })` (rotate the sealed cookie AND switch
  active org — its success response already carries `user`/`sessionId`/`organizationId`/
  `role`, no re-auth needed), and `getLogoutUrl()`.
- **Org routing facts:** `getAuthorizationUrl({ provider: "authkit", clientId,
  redirectUri })` is synchronous → 302 to it. `listOrganizationMemberships({ userId,
  statuses: ["active"], limit })` returns `AutoPaginatable` (`.data` is the first
  page — pass `limit` up to 100; auto-paginate only if an admin can exceed that).
  Each `OrganizationMembership` already includes `organizationName`, so the org
  selector needs no extra `organizations.get` call. Working example: `apps/backoffice`
  (`src/middleware.ts` gate + `src/lib/workos.ts` + `src/pages/{login,callback,logout}.ts`
  and `orgs/`).
- **Redirect URIs must be registered in punycode** (bit prod login wiring,
  2026-08-12): the app sends `redirect_uri=https://app.xn--stttemedlem-hgb.no/callback`;
  registering the visible-ø form (`https://app.støttemedlem.no/callback`) in the
  WorkOS dashboard does NOT match — WorkOS 302s to
  `error.workos.com/redirect-uri-invalid`. Headless check: `curl -sD-` the
  `api.workos.com/user_management/authorize?...` URL our /login redirects to —
  a Location on `error.workos.com` means registration mismatch; an
  `authkit.workos.com` URL means the pair is valid.

## Astro 7 + adapter v14: env access and per-environment deploys

Two load-bearing facts the scaffold proved (2026-07-08), both easy to get wrong:

- **`Astro.locals.runtime.env` was REMOVED in Astro v6+.** The adapter throws at
  runtime pointing you to `import { env } from "cloudflare:workers"` — that virtual
  module is now the only way to read bindings/secrets in pages/middleware/lib. (It
  also removed `locals.runtime.cf` → `Astro.request.cf`, `.caches` → global `caches`,
  `.ctx` → `Astro.locals.cfContext`.) Because the app tsconfig excludes the generated
  `worker-configuration.d.ts` (DOM-lib clash, see dual-tsconfig above), app code can't
  see the global `Env`; declare the subset it reads in `src/env.d.ts`:
  `interface Env { … }` + `declare module "cloudflare:workers" { export const env: Env }`.
  `worker.ts` still type-checks against the full generated `Env` via tsconfig.worker.json.
- **Per-environment deploys select the wrangler env at BUILD time, not deploy time.**
  The adapter writes a *flattened* `dist/server/wrangler.json` (config redirection)
  for one environment; `wrangler deploy --env staging` against it **silently uses the
  top-level/production values** (`definedEnvironments` is preserved but the override
  values are not). Correct flow: `CLOUDFLARE_ENV=staging astro build` produces a
  config named `<name>-staging` with the `env.staging` bindings/vars flattened in,
  then a plain `wrangler deploy` (no `--env`). Validate either env without auth via
  `wrangler deploy --dry-run` after the matching build. So per-env WorkOS config lives
  in `wrangler.jsonc` `vars` (non-secret: `WORKOS_CLIENT_ID`, `WORKOS_REDIRECT_URI`) +
  `wrangler secret put` (secret: `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD`), repeated
  per env because vars/bindings are non-inheritable; locally all four come from `.dev.vars`.
  - **Legacy environments** (the adapter sets `legacy_env: true`): prod and staging are
    two *separate* Workers, `stottemedlem-backoffice` and `stottemedlem-backoffice-staging`,
    each with its own Cloudflare-side secret store. Set secrets from `apps/backoffice`:
    `wrangler secret put WORKOS_API_KEY` (prod) and `… --env staging` (staging), likewise
    `WORKOS_COOKIE_PASSWORD` — 4 puts, distinct values per env. Split-brain to remember:
    `secret put`/`secret list` read the **source** `wrangler.jsonc` (so `--env staging`
    resolves the `env.staging` block → the `-staging` worker), but `deploy` uses the
    **flattened build** (so the env is chosen by `CLOUDFLARE_ENV` at build, not `--env`).
    Secrets attach to the running Worker immediately (no redeploy); the Worker must exist
    first (deploy once, or let the `secret put` prompt create it).

## Vipps MobilePay test environment (verified 2026-07-29)

Full merchant test env exists — build everything against it before touching the
real account. Source: developer.vippsmobilepay.com/docs/knowledge-base/test-environment/

- **Base URL `https://apitest.vipps.no`** — same API surface as prod (Recurring
  v3, Webhooks: `https://apitest.vipps.no/webhooks`), separate keys. No real
  money, **no settlements**, push notifications may be flaky, no gender in
  profile-sharing data.
- **Test sales unit + test keys appear automatically "when you order a Vipps
  MobilePay product that includes an API"** — i.e. at Faste betalinger order
  submission, apparently NOT gated on approval (unverified whether submission
  alone suffices — check portal *For utviklere* right after submitting; the
  walkthrough log records the answer once observed).
- **Test users:** portal → *For utviklere* → *Test users* — auto-generates
  phone number + test NIN; usable on multiple devices simultaneously.
- **MT (Merchant Test) app:** iOS via TestFlight
  (https://testflight.apple.com/join/hTAYrwea, no invitation code) / Android
  via Google Play after joining
  https://groups.google.com/u/0/g/vipps-mobilepay-test-app with the same
  account — real-app mirror, coexists with the production app; approve test
  recurring agreements on a phone with a test user for true end-to-end.
  **PIN in the MT app is `1236`.** Vipps documents special test amounts that
  force outcomes (e.g. insufficient funds) — see the test-environment page.
- **The rig for all of this ships with the repo** (added 2026-08-20):
  `pnpm --filter @stottemedlem/vipps run recurring-test` + `run tunnel` drive a
  real agreement end to end and receive the webhooks. Skill: `vipps-test-rig`;
  runbook: `docs/vipps-local-recurring-test.md`.

### Vipps API mechanics (verified 2026-08-10, implemented in `packages/vipps`)

- **No product-catalogue API anywhere in Vipps** (verified 2026-08-19 against
  the Recurring v3 + Management OpenAPI specs): the Recurring surface is
  agreements + charges only — `productName` (≤45) / `productDescription`
  (≤100) are free text per agreement, `externalId` (≤64, not filterable in
  the list endpoint) is a merchant-side mapping key, and the Management API's
  "product orders" are Vipps API-product orders (e.g. ordering Faste
  betalinger), not merchandise. Membership tiers therefore live in OUR D1
  (`membership_tiers`) and project onto agreements via the conventions in
  `@stottemedlem/core` (`membershipTierKey`, `tierAgreementExternalId` =
  `<tierKey ≤24>:<membershipId>` — always ≤64 for UUID ids). Spec:
  `specs/concepts/membership-tier.md`.
- **Access token:** `POST /accesstoken/get` with the keys as *headers*
  (`client_id`, `client_secret`, `Ocp-Apim-Subscription-Key`,
  `Merchant-Serial-Number`). Response fields are **numbers** (`expires_in`,
  `expires_on` epoch seconds) + `access_token` JWT. Lifetime **1 h in test,
  24 h in prod** — cache per sales unit (we use KV, TTL `expires_in − 300`).
  A newer `POST /miami/v1/token` (Basic auth, form-encoded
  `grant_type=client_credentials`, no subscription key, 15-min tokens) exists;
  we use the classic endpoint.
- **Webhook HMAC:** signed string is
  `POST\n<pathAndQuery>\n<x-ms-date>;<host>;<x-ms-content-sha256>`; the key is
  the registration `secret` string **used as raw UTF-8 bytes** (NOT
  base64-decoded — confirmed by the official JS sample:
  `crypto.createHmac('sha256', secret)`), signature base64 in
  `Authorization: HMAC-SHA256 SignedHeaders=…&Signature=…`. Docs publish a
  testable body→`x-ms-content-sha256` example pair (used as a fixture in
  `packages/vipps/src/webhook-verification.test.ts`). Verify with
  `crypto.subtle.verify` (constant-time) — works on workerd and Node alike.
- **Userinfo (member identity):** an agreement drafted with
  `scope: "name email phoneNumber"` (camelCase scope names, space-separated)
  comes back carrying `sub`; fetch the profile with
  `GET /vipps-userinfo-api/userinfo/{sub}` using the same auth headers as any
  other call (`client.getUserinfo(sub)`). The **response fields are OIDC
  snake_case** — `phone_number`, `phone_number_verified`, `given_name`,
  `family_name`, `birthdate`, `address` — NOT the camelCase scope names.
  Reachable for **168 hours after consent only**, so identity must be
  persisted at signup (spec: `specs/concepts/supporting-member.md`).
  Source: developer.vippsmobilepay.com/docs/APIs/userinfo-api/userinfo-api-quick-start/
  (has a verbatim example body). Doc-URL gotcha: `/docs/developer-resources/…`
  paths 404 — the test-environment page lives under `/docs/knowledge-base/`.
- **Local key fallback (test env only):** `getVippsForOrg` falls back to
  `VIPPS_CLIENT_ID/_SECRET/_SUBSCRIPTION_KEY/VIPPS_MSN` from `.dev.vars` when
  an org has no Vault keys AND `VIPPS_API_BASE_URL` is apitest — so the join
  flow can be exercised locally without a WorkOS account. Production never
  does this (spec: `specs/concepts/vipps-api-keys.md`).
- **Full recurring lifecycle VERIFIED LIVE 2026-08-20** (test sales unit, MT
  app approval on a real phone, rig in `packages/vipps/scripts`). What the run
  established beyond the docs:
  - Approving an agreement that carries an `initialCharge` fires **two**
    webhooks ~1 s apart, `recurring.charge-captured.v1` **before**
    `recurring.agreement-activated.v1`. Don't wait for the activation event
    before recording the payment — and expect either order to be possible.
  - Our HMAC verification passes on **real** deliveries (previously only
    proven against the docs' fixture).
  - A charge's `due` comes back from GET as a **timestamp**
    (`2026-08-20T12:31:23Z`), though create takes `YYYY-MM-DD`. Don't compare
    the two as strings.
  - A charge created inside the 30-day visibility window is **DUE
    immediately**, never PENDING. The INITIAL charge reads `CHARGED`.
  - `userinfo` for a test user also returns `sid`, and `email_verified` is
    `false` while `phone_number_verified` is `true`.
  - **A merchant-created RECURRING charge really is captured on its due date**,
    with nothing running on our side — confirmed 2026-08-21 by leaving a charge
    due overnight and reading it back `CHARGED`. Costs a real day to reverify,
    so take this one on record. Its webhook went to a dead tunnel and Vipps
    retried for days; the charge itself was unaffected.
  - **`GET /agreements/{id}/charges` is the reconciliation surface**: it returns
    every charge on the agreement — INITIAL and RECURRING, in every status —
    which makes it the only way to find a charge Vipps has and we have no row
    for. Verified 2026-08-21 by pointing an empty local record at a real
    agreement: two captured charges whose webhooks were never received came back
    in full and rebuilt the membership. A charge id + agreement id is all a
    recovery needs. (`GET /agreements?status=` still lists ONE status per call,
    so it cannot replace the local record — see the agreement note below.)
- **An agreement carries NO member identity** (verified live 2026-08-20 on a
  real ACTIVE agreement — asked repeatedly, so record it once): the full field
  set is `campaign, countryCode, created, externalId, id, interval,
  merchantAgreementUrl, merchantRedirectUrl, paymentMethod, pricing,
  productDescription, productName, start, status, stop, sub, userinfoUrl,
  uuid, vippsConfirmationUrl`. The member's name/email/phone appear in **none**
  of the values — identity exists only behind `userinfoUrl`, for 168 hours.
  Combined with "no all-statuses listing" and no documented retention, this is
  the concrete proof that **Vipps cannot serve as the member registry**; our D1
  is (specs/concepts/membership.md). Open question needing portal access: does
  the portal UI list payer names for Faste betalinger? The API does not.
- **`Idempotency-Key` must be a UUID** (found the hard way 2026-08-20, in the
  join route): passing our own business key — `externalId`, i.e.
  `<tierKey>:<uuid>` — gets `400 … "Invalid value for Idempotency-Key"`. The
  colon is the problem; the docs' "1–40 chars" understates the validation.
  Pass `crypto.randomUUID()`; the business key belongs in `externalId`.
- **Testing the app through a tunnel needs two non-Vipps unlocks** (both cost
  an hour on 2026-08-20):
  1. Vite blocks unfamiliar Host headers — a tunnel gets
     `403 Blocked request. This host … is not allowed`, which reads exactly
     like a broken tunnel. Fixed permanently in `apps/backoffice/astro.config.mjs`
     (`vite.server.allowedHosts` covers `.trycloudflare.com`/`.ngrok*`).
  2. Astro rejects cross-site form POSTs, so `curl -X POST -d …` gets
     `403 Cross-site POST form submissions are forbidden`. Real browsers send
     `Origin`; curl must too (`-H "Origin: https://<host>"`). JSON bodies (the
     Vipps webhook) are unaffected — the check only applies to form content
     types.
- **Webhook registration validates the receiver URL's reachability**
  (verified 2026-08-20): a `400 … extraDetails[{name:"url", reason:"The URL
  and/or hostname you provided is not allowed"}]` right after a tunnel starts
  is TRANSIENT — the hostname simply isn't in public DNS yet. Re-probed
  seconds later, `*.trycloudflare.com`, `*.ngrok-free.app` and
  `staging.app.xn--stttemedlem-hgb.no` were all accepted (all ten events), so
  there is no tunnel-domain blocklist. Retry before concluding otherwise.
- **The Recurring approval deeplink is short-lived:** the
  `vippsConfirmationUrl` JWT carries `exp = iat + 600` — **10 minutes** to
  approve in the app before the draft must be re-created.
- **Env selection is pure config:** `VIPPS_API_BASE_URL` var —
  `https://apitest.vipps.no` in `.dev.vars` + wrangler `env.staging`,
  `https://api.vipps.no` only in top-level (production) vars. Since
  2026-08-18 that base URL is the ONLY per-environment Vipps config: there
  are no platform-level Vipps credential vars/secrets — each org's sales-unit
  keys are entered in the backoffice (`/o/[slug]/vipps`, validated live
  against Vipps first) and stored per org in WorkOS Vault
  (`apps/backoffice/src/lib/vippsKeys.ts`). Read-only CLI credential check
  (keys via env vars): `pnpm --filter @stottemedlem/vipps run smoke`
  (refuses to run against prod).

### Vipps as a notification channel — what it can and cannot carry (verified 2026-08-24)

Asked every time someone proposes "just send it through Vipps". Vipps pushes
**only about money**, only to members with a live agreement, on **its** schedule.

- **Pushes Vipps sends by itself, no work from us:** 1 day before `due`
  ("One day before the due date, the user is notified"); **every failed charge**
  ("We always send a push notification to the user in the app if a charge
  attempt is unsuccessful"); card-about-to-expire. **Successful payment is
  opt-in** — the "Notify me when paying" toggle on the agreement confirmation
  screen, off by default.
- **Passive visibility:** the upcoming charge appears in the app's *Payments*
  tab **up to 35 days before `due`**, once it flips `PENDING → DUE` (~30 days
  out). `RENEWAL_ARRANGED_FROM` (Dec 1 → due Jan 1 = 31 days) sits just inside
  that window — move it earlier to use the full one.
- **The ONE free-text lever: `charge.description`, `maxLength: 100`**, and the
  OpenAPI spec annotates it verbatim *"This field is visible to the end user
  in-app"* (`recurring-swagger-id.yaml`). Title above it is
  `agreement.productName` (≤45). We currently spend ~20 of the 100 chars
  (`"${tier.name} ${periodYear}"`). This is the only text the product can put
  in front of a member today, and it rides on a payment.
- **What it CANNOT do — don't design around it:** (1) no messaging API at all
  (Recurring v3 = agreements + charges, same reason there's no product
  catalogue); (2) **a price change is silent** — `PATCH pricing.amount`
  triggers no notification and no re-approval, the member just sees a
  different number, so the merchant owns that notice; (3) the channel **dies
  with the agreement** — a stopped or lapsed member is unreachable, which is
  exactly who an org most wants to write to; (4) timing is Vipps' (1 day), not
  "enough notice to opt out".
- **Therefore:** `specs/use-cases/renew-annual-membership.md` §3 is nearly
  satisfiable by Vipps alone; `change-the-annual-fee.md` §5 and
  `keep-supporters-in-the-loop.md` are **not** — those need our own email. The
  address book already exists: userinfo `name email phoneNumber` is persisted
  at signup (168-hour window) and editable in the member list. Only a sender
  is missing.
- Sources: developer.vippsmobilepay.com/docs/APIs/recurring-api/
  {recurring-api-guide,recurring-api-faq}/ +
  developer.vippsmobilepay.com/redocusaurus/recurring-swagger-id.yaml

### WorkOS Vault (verified against SDK v10.7.0, 2026-08-18)

- **Vault ≠ the dashboard's per-org "API Keys" tab** (evaluated 2026-08-19,
  workos.com/docs/authkit/api-keys): API Keys is WorkOS *minting* keys your
  customers use to authenticate INBOUND calls to *your own* API (value
  generated by WorkOS, shown once, validated via WorkOS on each request) —
  it cannot store externally-issued values. Storing a customer's third-party
  credentials (our per-org Vipps keys, used OUTBOUND toward Vipps) is
  Vault's headline use case — keep using Vault. API Keys only becomes
  relevant if støttemedlem ever exposes its own public API.

- `@workos-inc/node` ≥10.7.0 ships a full `workos.vault` module, present in
  the workerd build too (same factory chunk as `WorkOS`): `createObject({
  name, value, context })`, `readObject({ id })`, `readObjectByName({ name })`,
  `updateObject({ id, value, versionCheck? })`, `deleteObject({ id })`,
  `listObjects`, `describeObject`, `listObjectVersions` (+ data-key/encrypt
  helpers). `context` is an arbitrary key/value map that selects the
  encryption key — we use `{ organizationId: <workos org id> }` for per-org
  cryptographic isolation. Object `name` is unique per WorkOS environment;
  a missing object throws `NotFoundException`. `readObjectByName` returns the
  decrypted `value`; `describeObject`/`listObjects` do not.
- **Key management: Vault-managed (the default) is the DECIDED choice**
  (2026-08-19). The dashboard's Vault → Keys "Customer managed" page is BYOK
  (KEKs from your own/your customer's AWS/GCP/Azure KMS, for
  compliance-driven key-custody demands) — wrong for us: no KMS in the
  Cloudflare stack, adds an external decrypt dependency, no customer asking.
  Empty "Customer managed" list is correct; per-context KEKs appear under
  "Vault managed", stored objects under Vault → Objects. BYOK can be adopted
  per-org later without code changes.
- **Enablement VERIFIED live 2026-08-18** on the test WorkOS environment: an
  org's Vipps keys were validated against apitest.vipps.no and written to
  Vault end-to-end via `/o/[slug]/vipps` in local dev. For checking a
  different WorkOS environment, the round-trip smoke exists:
  `pnpm --filter @stottemedlem/backoffice run vault-smoke` (create → read →
  update → delete of a throwaway object; a 401/402/403 means Vault isn't
  enabled there).

## Forward references (not captured yet)

| topic | where |
|-------|-------|
| Cloudflare product guidance (D1, Queues, Cron Triggers, static assets, wrangler) | global `cloudflare` / `wrangler` skills + https://developers.cloudflare.com/ |
| Text/cards over the marketing collage — DECIDED 2026-07-07: localized top scrim + frosted-glass cards (implemented in apps/marketing); duotone brand tint is the fallback if photo colors prove too busy | smashingmagazine.com/2023/08/designing-accessible-text-over-images-part1/ (+part2) · ishadeed.com/article/handling-text-over-image-css/ · superdesign.dev/styles/glassmorphism · web.dev/learn/css/blend-modes |
| Vipps Recurring API behaviour | `docs/research/vipps-recurring-payments.md` (canonical, cited) |
