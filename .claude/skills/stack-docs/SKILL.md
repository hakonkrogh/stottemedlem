---
name: stack-docs
description: Verified platform facts for the stottemedlem stack (Astro on Cloudflare Workers, WorkOS on Workers, Vipps MobilePay test environment, D1 platform limits and what Cloudflare will and will not alert on), plus one explicitly UNVERIFIED section on the browser's Web Share API. Load before scaffolding or configuring apps/marketing or apps/backoffice, assuming how the Astro Cloudflare adapter / WorkOS SDK behave on Workers, quoting a D1 limit or quota, starting Vipps API work, or reaching for `navigator.share` or a Facebook share link.
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

**Before believing a `Property 'X' does not exist on type 'Env'` error, check
for `.dev.vars`** (verified 2026-08-31). `wrangler types` builds
`worker-configuration.d.ts` from wrangler.jsonc **plus `.dev.vars`**, and that
file is gitignored, so a fresh worktree has no `WORKOS_API_KEY`,
`VIPPS_SUBSCRIPTION_KEY`, `VIPPS_MSN` or `VIPPS_WEBHOOK_SECRET` on `Env` — and
`tsc -p tsconfig.worker.json` then reports four errors in files nobody touched.
Real bindings from wrangler.jsonc (D1, KV, R2, Queues) are always there;
secret-only vars are the tell. To typecheck a worktree without the real file:

    cd apps/backoffice && cp .dev.vars.example .dev.vars   # the example lives
    cd - && pnpm --filter @stottemedlem/backoffice typecheck # in the APP, not
    rm apps/backoffice/.dev.vars                             # at the repo root

**Never read a check's result through a pipe.** `pnpm typecheck 2>&1 | tail -6`
exits with *tail's* status, so a failing typecheck reports success — which is
exactly how the missing-`.dev.vars` errors above got mistaken for a passing run
(2026-08-31). Redirect to a file and echo `$?`, and read turbo's own verdict
(`Failed: @stottemedlem/backoffice#typecheck`) rather than the tail of the
output:

    pnpm typecheck > /tmp/tc.log 2>&1; echo "exit=$?"; tail -5 /tmp/tc.log

Turbo also caches the task (`13 cached, 14 total`), so an unchanged package's
"success" is a replay, not a run — fine, as long as the exit code is real.

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

Secrets are NOT in the generated `Env` (verified 2026-08-24, adding
`RESEND_API_KEY`). `wrangler types` builds `Env` from wrangler.jsonc `vars`
**plus whatever keys happen to be in the local `.dev.vars`** — so a secret
typechecks on your machine and fails in CI or a fresh worktree with
`error TS2339: Property 'X' does not exist on type 'Env'`. It only bites in
`worker.ts`'s import tree (app code uses the hand-written `src/env.d.ts`
instead), which is easy to trip by importing one new lib from the scheduled
handler. Declare the secret at the point of use:

```ts
// The weak-type check rejects `const s: { X?: string } = env` with TS2559
// ("no properties in common"), so widen instead of annotating:
const secrets = env as typeof env & { RESEND_API_KEY?: string };
```

Non-secret config has the better fix — make it a real wrangler `var` in both
envs (that is why `PUBLIC_ORIGIN` is one).

Consequence (as of 2026-08-26): **`pnpm run typecheck` in apps/backoffice
FAILS on a fresh worktree with no `.dev.vars`** — 6 pre-existing TS2339
errors in `src/lib/vipps.ts` + `src/lib/workos.ts` (they read
`env.VIPPS_*`/`env.WORKOS_API_KEY` directly instead of widening). Not your
change's fault; check whether YOUR files appear in the errors before chasing
it. (Also remember the workspace packages must be built first —
`pnpm --filter './packages/*' run build` — or `astro check` drowns in
"Cannot find module '@stottemedlem/db'".)

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
same pattern for future public paths. Better still, hang a new public address
BENEATH an already-routed page (`/bli-medlem/<slug>/qr`, 2026-09-10): the
page's route covers it, so there is no new route to forget. Wrangler
warns "routes will attempt to serve Assets on a configured path" — harmless.

Webhook pattern: route `POST /webhooks/vipps` in `worker.ts` *before* delegating to
`handle()` — the webhook path is then plain Worker code (raw `Request` for HMAC over
the raw body; no framework body parsing). Astro endpoints also pass the raw `Request`
through untouched, so either placement is HMAC-safe. If the non-webhook API surface
ever outgrows Astro's basic routing, mount Hono in the same `worker.ts` before
`handle()` — additive, no architecture change.

## Astro templates: a line break before an inline tag EATS the space (verified 2026-09-10)

`compressHTML` defaults to **true**, and it collapses the newline + indentation
between text and a following tag to **nothing**, not to a space. So this source:

```astro
<p>Skriv til
  <a href="mailto:...">hei@example.no</a>, ...</p>
```

ships as `Skriv til<a href=...>hei@example.no</a>`, so the words run together. Plain
HTML would render a space there, so the source looks correct and only the output is
wrong. Verified in **both `astro dev` and `astro build`** (setting
`compressHTML: false` restores the newline), so a dev-server check does not catch it.

Two consequences:

- Keep the text and the opening tag on the **same line**. When the formatter wants to
  wrap, break *inside* the tag instead: `... Skriv til <a\n  href="...">text</a\n>`.
  That is the style biome already produces elsewhere in `apps/marketing`.
- **A screenshot is how you catch this**: it is invisible in the source and survives
  lint, typecheck and build. When a change puts a link or `<strong>` inside a
  sentence, read the rendered text in the shot (or
  `grep -o 'word.\{0,80\}' dist/index.html`), not just the layout.

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
- **Self-service sign-up is a per-ENVIRONMENT dashboard switch, not code**
  (read from the docs 2026-09-23, dashboard state NOT checked): `/registrer`
  passes `screenHint: "sign-up"`, which only opens the account-creation form
  if the environment allows it. Two settings under Authentication → Features
  (dashboard.workos.com/environment/authentication/features) decide it: the
  "Sign up" toggle must be ON, and the "Waitlist" must be OFF, because an
  enabled waitlist supersedes sign-up and swaps the form for an email-only
  waitlist form (invited users still get through). Set both for staging and
  production separately. The user confirmed 2026-09-23 that sign-up is on and
  the waitlist off (environment not named). `/registrer` itself needs NO
  registration in WorkOS: it is our route, and the only address WorkOS checks
  is the redirect URI `/callback`, already registered for sign-in. Sources:
  workos.com/docs/authkit/invite-only-signup.md, workos.com/docs/authkit/waitlist.md.

### Administrators and invitations (verified against SDK v10.7.0's types, 2026-09-10)

Everything the back office needs to show who administers an organization, and to
let another person in, is on `workos.userManagement`. All of these return an
`AutoPaginatable` whose `.data` is the first page, `limit` maxes at 100:

- `listOrganizationMemberships({ organizationId, statuses: ["active"], limit })` is
  the authority on who has access. Note the options type is a UNION: you must pass
  `organizationId` or `userId` (or both), and TypeScript rejects neither. A
  membership carries `userId`, `status` (`active` | `inactive` | `pending`),
  `organizationName` and `role`, but NOT the person's name or email.
- `listUsers({ organizationId, limit })` is how you get the names and addresses
  without an N+1 of `getUser(id)`: build a `Map` by `user.id` and join it to the
  memberships. `User` has `email`, `name`, `firstName`, `lastName` (all nullable
  but `email`). Keep a `getUser` fallback for ids the listing misses, or a line
  vanishes from a list that is meant to be complete.
- `listInvitations({ organizationId, limit })` returns EVERY state, so filter
  `state === "pending"` yourself. An `Invitation` carries `email`, `state`
  (`pending` | `accepted` | `expired` | `revoked`), `createdAt`, `expiresAt`,
  `acceptInvitationUrl` and `token`.
- `sendInvitation({ email, organizationId, inviterUserId, expiresInDays?, roleSlug?, locale? })`
  sends the email. `locale` is a closed enum that DOES include `"nb"`, so the
  invitation goes out in Norwegian.
- `revokeInvitation(invitationId)` withdraws one, `resendInvitation(id, { locale })`
  sends it again, and `deleteOrganizationMembership(membershipId)` takes a
  person's access away. NONE of the three takes an organization id, so an id
  posted by a browser must be checked against that organization's own loaded
  list before it is acted on, or one org's administrator could reach into
  another's.
- **WorkOS will let you empty an organization.** `deleteOrganizationMembership`
  has no last-administrator guard of any kind, so "an organization always keeps
  at least one administrator" is the product's rule to enforce, in the product's
  code, every time (`administratorRemovalRefusal` in `@stottemedlem/core`).
- `updateOrganizationMembership(id, { roleSlug })` and
  `listOrganizationRoles(organizationId)` exist, so roles ARE available if the
  product ever wants them. It deliberately does not (2026-09-10): there is one
  level of access and every back-office screen is admin-only, so a second role
  would need every screen and every POST gated before it meant anything.
- Accepting needs NO new route: the invitation link goes to AuthKit, which sends
  the person back to the registered redirect URI, so the existing `/callback` plus
  `resolveLanding` puts them in the organization. Working example:
  `apps/backoffice/src/lib/administrators.ts` +
  `src/pages/o/[slug]/administratorer.astro`.

**How to find any of this again:** the package ships FLATTENED types, so there is no
`lib/user-management/` directory to browse, only one big
`node_modules/@workos-inc/node/lib/factory-*.d.mts`. Grep that file by name
(`grep -n "sendInvitation\|listInvitations" factory-*.d.mts`), then `sed -n` the
interface around the hit. Faster and more reliable than the docs site, and it is the
version actually installed.

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
  - **Worker secrets are WRITE-ONLY** (verified 2026-08-25): `wrangler secret
    list` shows names only; no wrangler command or API returns a value, and the
    Secrets Store is equally unreadable. So deployed-env secrets can never seed
    a local `.dev.vars` — and the user explicitly REJECTED working around this
    with a readable Cloudflare-side copy (a dev-secrets KV namespace was built,
    then rolled back and deleted the same day). If pulling secrets from
    Cloudflare comes up again: state the write-only constraint and stop;
    `.dev.vars` is populated by copying from the main checkout.

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

- **Vipps appends NOTHING to `merchantRedirectUrl`** (verified the hard way
  2026-08-27: a bare `/kvittering` URL bounced a real staging supporter back
  to the join page — the page waited for an `?agreementId=` that never
  comes). The return address must carry the merchant's OWN reference, baked
  in at draft time; this product reuses the manage token
  (`kvittering?n=<manageToken>`), which exists before the draft precisely
  because Vipps needs the management URL in the draft itself. Never assume a
  Vipps redirect carries parameters, and never treat arrival as payment
  proof (the page syncs from Vipps regardless).

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
  **Postal address (verified against the docs' example body 2026-09-22):**
  the scope word is `address` (so `"name email phoneNumber address"`,
  `MEMBER_USERINFO_SCOPE_WITH_ADDRESS`), and the response carries
  `address: { address_type: "home", country: "NO", formatted:
  "Robert Levins gate 5, 0154\nOSLO\nNO", postal_code: "0154", region:
  "OSLO", street_address: "Robert Levins gate 5" }` plus `other_addresses:
  []`. `region` is the postal TOWN (uppercase), not a county; `country` is
  the ISO code. The docs say nothing about the sales unit having to enable
  the scope separately, and the research note (docs/research, finding 12)
  says a scope outside the merchant's agreement is dropped SILENTLY, so treat
  the address as usually-absent and never as proof the org asked for it.
  Only requested where `collectsPostalAddresses(org)`
  (specs/use-cases/collect-postal-addresses.md): Vipps consent is
  all-or-nothing, so asking makes sharing a condition of joining.
  Source: developer.vippsmobilepay.com/docs/APIs/userinfo-api/userinfo-api-quick-start/
  (has a verbatim example body). Doc-URL gotcha: `/docs/developer-resources/…`
  paths 404 — the test-environment page lives under `/docs/knowledge-base/`.
  Likewise `/docs/knowledge-base/merchant-questions/` (linked from search
  results) 404s; the merchant FAQ content, including "User anonymity in
  transactions", lives at `/docs/knowledge-base/merchant-info/`.
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
  is (specs/concepts/membership.md). **The portal does not list payer identity
  either** (answered 2026-09-09 from a real production screenshot: the "Fra"
  column on Transaksjoner is empty for a Faste betalinger charge). Vipps
  documents this as policy, not a setting: "The transaction overview on the
  business portal shows customer names for some Vippsnummer and
  MobilePay-nummer payments. For online payments, the payment's ID is shown
  instead of the customer name" (docs/knowledge-base/merchant-info, "User
  anonymity in transactions"). Nothing in the agreement or charge body
  (`phoneNumber`, `productName`, `productDescription`, `externalId`) changes
  that; the only merchant-side identity is the userinfo we persist at signup.
  Orgs that need "who paid" look in our member list, not the portal. The
  portal's transaction detail ("Sammendrag av transaksjonen") shows the
  Vipps CHARGE id as "Ordre-ID" (`chr-…`) plus the sales unit; it shows NO
  agreement id and no externalId (production screenshot, 2026-09-09). The
  charge id is the only key an admin can carry from the portal into our
  data, and we store it on every charge row (refunds run on it).
- **`Idempotency-Key` must be a UUID** (found the hard way 2026-08-20, in the
  join route): passing our own business key — `externalId`, i.e.
  `<tierKey>:<uuid>` — gets `400 … "Invalid value for Idempotency-Key"`. The
  colon is the problem; the docs' "1–40 chars" understates the validation.
  Pass `crypto.randomUUID()`; the business key belongs in `externalId`.
  **Idempotency-Key retention on charge creation VERIFIED LIVE 2026-08-26
  (rig: `vt idempotency`): a byte-identical `createCharge` replay with the
  same key returned the SAME `chargeId` at 0m, 1h, 6.5h and 24h19m — no
  duplicate at any point. A second probe (2026-08-27) added a 12h5m
  data point, same result.** This is what `createDueRenewalCharges`
  (`apps/backoffice/src/lib/renewals.ts`) leans on: its deterministic key
  (`stableUuid("renewal:<agreementId>:<periodYear>")`) makes the next night's
  retry land on the charge a crashed run created but never recorded. The
  nightly window (~24 h) is proven; the Recurring docs still state no formal
  retention limit, so a retry *months* later is unproven — irrelevant for the
  nightly job, and reconciliation (`GET /agreements/{id}/charges`, see below)
  closes that residual gap within its 60-day lookback anyway.
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
  in front of a member today, and it rides on a payment. The SAME text is
  what the merchant sees as the "Melding" column on the portal's
  Transaksjoner list (confirmed by a production screenshot, 2026-09-09), so
  it is also the only merchant-facing free text per charge. Two limits when
  using it to identify the payer: the INITIAL charge's description is fixed
  in the agreement draft, before approval and before userinfo reveals who
  the member is, and Recurring v3 has no way to edit a charge afterwards. So
  anything meant to identify the member in "Melding" must exist before the
  draft (our own ids do; the member's name does not).
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

## Resend sending domain (verified 2026-08-25 against resend.com/docs)

Member notices go out from `noreply@xn--stttemedlem-hgb.no` — the apex, in
punycode (derive it, never retype it). Add the domain in Resend as
`xn--stttemedlem-hgb.no` and pick the **EU (Ireland)** region: the region is
what decides the bounce hostname below, and the members are Norwegian.

Three records on the Cloudflare zone `xn--stttemedlem-hgb.no`
(`95aa7289a9c15a7787106b8ab2583d67`), plus DMARC. **Nothing goes on the apex** —
the marketing Worker serves that, and Resend's records live on `send.` and
`resend._domainkey`:

| Type | Name | Value | Priority |
|------|------|-------|----------|
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |
| TXT | `resend._domainkey` | the account's own `p=…` DKIM key | — |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hei@xn--stttemedlem-hgb.no` | — |

- Resend runs on SES underneath, hence the `amazonses.com` values. Copy the
  real DKIM key and MX host from the dashboard — both are account/region
  specific.
- **Cloudflare gotcha the docs call out:** paste `send`, NOT
  `send.xn--stttemedlem-hgb.no` — Cloudflare appends the zone itself, so the
  full name yields `send.xn--stttemedlem-hgb.no.xn--stttemedlem-hgb.no`.
- Proxy status **DNS only** (grey cloud).
- The from-address may sit on the **apex** even though the records sit on
  `send.` — that subdomain only carries the Return-Path/bounce handling.
- Cloudflare Email Routing, if ever enabled on this zone, puts its own MX on
  the apex; no conflict with these.
- Start DMARC at `p=none` (observe only), tighten to `p=quarantine` once real
  sends are seen passing.
- **The CI Cloudflare token cannot add these** — it is scoped to Workers
  Scripts/Routes, D1 and R2, not Zone → DNS → Edit. Either the user adds them
  in the dashboard, or they mint a token with that permission.

**Check them rather than assume them** — records get added one at a time and a
missing SPF looks like nothing at all until the first send fails. On 2026-08-25
this found DKIM and the MX live but `TXT send` (SPF) never added:

```sh
for r in "TXT send" "TXT resend._domainkey" "MX send" "TXT _dmarc"; do
  t=${r% *}; n=${r#* }; printf "%-24s " "$n ($t)"
  echo "$(dig +short $t $n.xn--stttemedlem-hgb.no @8.8.8.8 | head -1)" | head -c 70; echo
done
```

Which environments hold the API key: `wrangler secret list [--env staging]`
from `apps/backoffice` (works off the local OAuth session, no token needed).

## Alerting channels — free-tier facts (verified 2026-08-25 against vendor pricing pages)

Checked while choosing a monitoring setup. Re-verify before relying on
limits — pricing pages drift.

**DECIDED 2026-08-25: personal email-only alerting.** The owner wants to know
something is wrong, not be paged — no Slack, no uptime SaaS, nothing
middle-of-the-night. Plan (revised same day, Sentry replacing a DIY Resend
alert helper once email-only made the free plan sufficient):
(1) **Sentry free** as the error layer — `@sentry/cloudflare`'s `withSentry`
wraps the existing `worker.ts` `ExportedHandler` (fetch + scheduled + queue);
auto-captures unhandled errors, groups/dedups (one email per issue, not per
occurrence), and deliberate business alerts (cron `failed > 0`, missing
`PUBLIC_ORIGIN`/`RESEND_API_KEY`) go through `captureMessage`. Independent of
Resend, so "Resend broken" still alerts. Docs:
docs.sentry.io/platforms/javascript/guides/cloudflare/
(2) a separate **dead-man's switch** for the cron jobs, because Sentry free
includes only 1 cron monitor and there are 2 triggers in 2 environments.
Healthchecks.io was the original pick; the switch actually made was to Better
Stack, see "The nightly runs' watchdog" below.
**Layer 1 implemented 2026-08-26** (spec `specs/concepts/operational-alerting.md`):
vendor-neutral `packages/log` (`@stottemedlem/log`:
`createLoggerFactory(sinks)` → `logger(area)` — the area slug is REQUIRED and
ENFORCED in the package (lowercase slug or throw at module init); it becomes
the `area` tag on Sentry issues and the `[area]` console prefix; `sentrySink`
takes a structural `SentryLike`, so the SAME sink works with
`@sentry/cloudflare` on the Worker and `@sentry/browser` in a page — the
package depends on no vendor). Wiring: `apps/backoffice/src/lib/log.ts` is
one factory export; modules take `const log = logger("webhooks")` at MODULE
scope (areas in use: renewals, reconcile, notices, webhooks, scheduled;
console always, Sentry only when `SENTRY_DSN` is set). Verified
2026-08-26: `import { env } from "cloudflare:workers"` IS readable at module
init in workerd (the factory reads `env.SENTRY_DSN` at import time; fetch and
scheduled both fine under `wrangler dev`),
`worker.ts` wrapped in `Sentry.withSentry` (fetch+scheduled+queue,
`tracesSampleRate: 0`), cron loop + Vipps webhook route log through it.
Grouping rule: STABLE messages, moving numbers in context.
**`SENTRY_DSN` is a production-only SECRET, not a var** (moved 2026-08-26,
same day the var shipped: a wrangler.jsonc top-level var is inherited by
local dev — `astro dev` runs the real worker — so the first local session
filed 4 localhost issues into prod Sentry; `wrangler secret put SENTRY_DSN`
excludes local/staging by construction since secrets never reach a local
machine. Being a secret it is also absent from the generated `Env` — both
readers, `lib/log.ts` and `worker.ts`, use the widening pattern above. Local
opt-in: paste a personal test project's DSN in `.dev.vars`). Prod DSN set
2026-08-26, EU-region project, ingest.de.sentry.io. **CORRECTED 2026-09-22:
this said "staging deliberately has none", and that was true for exactly one
day.** Staging got its own DSN secret on 2026-08-27, pointing at the SAME
project, and the spec was changed the same day to say both deployed
environments report. `SENTRY_ENVIRONMENT` is what tells them apart, and is the
reason one project is enough. Read wrangler.jsonc, not this line, if they ever
disagree again. Sentry project layout (settled
2026-08-26): ONE project, slug `backoffice-server` (renamed from
`javascript-astro`; rename is DSN-safe — DSNs key on project id, not slug —
id 4511977082519632); add staging/browser
projects only when those surfaces get wired; no project for marketing
(assets-only, no code). Still pending: the
Healthchecks.io pings. Verified in workerd via
`wrangler dev --test-scheduled` → `/cdn-cgi/handler/scheduled`.
A DSN can be verified headlessly, no SDK involved: POST one envelope
(three newline-separated JSON lines: `{event_id,sent_at,dsn}`,
`{"type":"event"}`, `{event_id,timestamp,platform,level,message}`; event_id =
32 lowercase hex) to `https://<host>/api/<projectId>/envelope/` with
content-type `application/x-sentry-envelope`. Sentry answers HTTP 200 +
`{"id":…}`.
**CORRECTED 2026-09-22 against a real Better Stack DSN:** the envelope's own
`dsn` header field is NOT accepted as authentication there. Without an
`X-Sentry-Auth` header the ingest host answers `401 {"detail":"Unauthorized"}`,
which reads exactly like a bad DSN and is not. Send
`X-Sentry-Auth: Sentry sentry_version=7, sentry_key=<KEY>, sentry_client=<any>`
and it answers `200 {}`, an empty object rather than Sentry's `{"id":…}`. So
judge the check by the STATUS, not the body.
`.claude/skills/betterstack-context/dsn-check.mjs <dsn>` does all of this.
### The nightly runs' watchdog (Better Stack heartbeats)

**SWITCHED 2026-09-16, from Sentry Crons to Better Stack heartbeats.** PR #110
shipped `Sentry.captureCheckIn` with one monitor slug per job per environment
(`renewals-production`, `reconcile-production`, `renewals-staging`,
`reconcile-staging`). Sentry then emailed "Cron Monitors 1 / 1, 100% of your
cron monitors budget consumed": the free plan includes exactly ONE cron
monitor, the first slug to check in took it, and the other three were refused
silently. No error, no issue, no monitor: three of the four nightly runs were
unwatched while looking watched. Anything past the first needs a
pay-as-you-go budget on Sentry's Subscriptions page.

**Rolling the switch out:** staging first, because its runs are hourly and
prove the wiring within the hour instead of overnight. Then **delete the
leftover Sentry cron monitor**: nothing sends check-ins to it any more, so it
sits there looking permanently missed and keeps e-mailing. A Sentry cron alert
arriving after 2026-09-16 means that monitor was never cleaned up, NOT that a
nightly run failed.

**Better Stack free: 10 monitors and heartbeats combined, 1 status page,
Slack and e-mail alerts** (betterstack.com/pricing). Four heartbeats fit with
room to spare, which is the whole reason for the move. Sentry stays as the
ERROR channel; only the dead-man's switch moved.

The heartbeat HTTP contract (betterstack.com/docs/uptime/cron-and-heartbeat-monitor/):

| what | request |
|------|---------|
| success | `GET https://uptime.betterstack.com/api/v1/heartbeat/<TOKEN>` |
| failure | `POST .../<TOKEN>/fail` (body is kept as the run's output) |
| exit code | `.../<TOKEN>/<code>`, 0 counting as success |

- **There is no `/start` signal.** Better Stack has no equivalent of Sentry's
  `in_progress` check-in or Healthchecks' `/start`, so there is no
  "maxRuntime" to configure either. That is not a loss here: a run that hangs
  simply never sends its beat, so the SAME missed-beat alarm covers both "never
  started" and "started and never finished". It does mean run DURATION is not
  measured.
- **The expectation lives with the vendor, not in the repo.** Each heartbeat
  carries its own "expect a heartbeat every" period plus a grace, set in the
  dashboard or via the API. Sentry's check-in could upsert its schedule from
  the cron string; this cannot, so `wrangler.jsonc` `triggers.crons` and the
  heartbeat periods have to be kept in step by hand.
- A heartbeat stays **Pending** until its first request arrives; the clock
  starts then, not at creation.
- API (only if the dashboard is not wanted): `POST
  https://uptime.betterstack.com/api/v2/heartbeats`, `Authorization: Bearer
  <TOKEN>`, fields `name`, `period` (SECONDS, min 30), `grace` (seconds, ~20%
  of period recommended), `email`/`sms`/`call`/`push`, `policy_id`,
  `heartbeat_group_id`. The 201 response carries the `url` to store as the
  secret.

Wiring in this repo: `runScheduledJobsWatched` in `apps/backoffice/src/worker.ts`
reads `HEARTBEAT_URL_RENEWALS` / `HEARTBEAT_URL_RECONCILE`. They are SECRETS,
not vars, for two reasons: vars are inherited by local dev (which must never
beat into the operator's watchdog and make a real missed night look fine), and
the address is itself the credential, so whoever holds it can silence the alarm
by beating in the run's place. Absent address = the run still happens and logs
a warn saying it is unwatched. Every beat is wrapped so a dead vendor can never
take down the run, and the failure body is identifiers only (job, environment,
cron), never member data.

**Verified 2026-09-16 against the real Worker**, not by reading the code:
a local receiver plus `wrangler dev --test-scheduled` and
`/cdn-cgi/handler/scheduled?cron=0+2+*+*+*` showed `GET /api/v1/heartbeat/
tok-reconcile` on a good run, `POST .../tok-reconcile/fail` with body
`reconcile failed on production (0 2 * * *)` when the job threw, and the
renewals cron beating to the renewals address.

**TRAP, cost an hour on 2026-09-16: `wrangler dev` serves `dist/`, not `src/`.**
The first run of that check "passed" while showing a request NO code in the
tree could produce (`POST .../tok-reconcile` with body `reconcile ok in 0s`),
because `apps/backoffice/dist` was a build from the previous day of an earlier,
abandoned heartbeat implementation. Always
`pnpm turbo run build --filter=@stottemedlem/backoffice` FIRST, the way
`.claude/skills/vipps-test-rig/cron.sh` does. A stale `dist` does not fail: it
lies, in the shape of a passing test.

### Creating the Better Stack Errors application (the form, 2026-09-22)

"Connect application" asks four things and gets two of them wrong by default:

| field | what this repo wants | why |
|-------|----------------------|-----|
| Data region | **Europe**, NOT the defaulted United States | matches the deliberate EU choice already made for Sentry, and costs $0.000050 per exception against the US $0.000075. Almost certainly not changeable after creation |
| Application name | ONE application for both environments, e.g. `backoffice-server` | production and staging both report and are told apart by `SENTRY_ENVIRONMENT`, exactly as they are in Sentry today. Two applications would mean two DSNs and two secrets for nothing |
| Connect to a source | leave empty | it links exceptions to a logs/traces source, and there is no logs source in this account. Linkable later |
| Platform | **Serverless**, Cloudflare Workers (else Server, Node.js). NOT the preselected React | React is for a browser frontend; this is server-side Worker code. The choice only picks which setup snippet is shown, and that snippet is not needed: the wiring already exists |

**The free tier is US-only** (reported by the account owner 2026-09-22 from
the real signup, correcting an earlier reading of the pricing page that said
100,000 exceptions a month in either region). Europe is a PAID region. So the
EU choice made for Sentry cannot simply be repeated here for nothing, and the
production application was created in `us-west-2a` for that reason. What
follows from that is a data question, not a billing one: see the personal-data
rules in specs/concepts/operational-alerting.md, and note that "identifiers and
counts" is pseudonymous, not anonymous.

Afterwards the DSN is on the application's Ingest tab, and adopting it is two
`wrangler secret put SENTRY_DSN` calls (one per environment) with NO code
change. Verify it BEFORE trusting it, with the headless envelope POST described
above, and check the application's notifications are e-mail only. Better
Stack's defaults are not, which is the same trap the heartbeats set.

### Could Better Stack take the ERROR channel too? (researched 2026-09-18)

Probably yes, and cheaply, because **Better Stack Errors speaks the Sentry
protocol**. Their pitch is "keep using your existing Sentry SDK, just send the
data to Better Stack": the DSN is
`https://$APPLICATION_TOKEN@$INGESTING_HOST/$APPLICATION_ID`, and Sentry's own
source-map upload integrations are said to work as-is
(betterstack.com/docs/errors/collecting-errors/sentry-sdk/).

That means the move would be a SECRET change, not a code change:
`@sentry/cloudflare`, `withSentry`, `packages/log` and its structural
`sentrySink` all stay exactly as they are. `packages/log` was built
vendor-neutral for this and would not be touched.

Quotas, free plan, from betterstack.com/pricing:

| | Sentry free | Better Stack free |
|---|---|---|
| errors / exceptions | 5,000 per month | 100,000 per month |
| retention | (see Sentry) | 90 days |
| cron monitors | 1 | 10 monitors and heartbeats |

Their Errors product does group exceptions by stack trace into one issue with
a count, which is what `specs/concepts/operational-alerting.md` requires by
"one problem is one conversation". Errors, logs and heartbeats would live in
one vendor, and their storage puts the surrounding logs next to an exception.

**NOT yet verified, and each one could sink it:**
- That `@sentry/cloudflare` specifically works against their ingest host. The
  protocol is the same envelope protocol, so the headless DSN check described
  above (POST an envelope to `/api/<id>/envelope/`, expect 200 + `{"id":…}`)
  proves or kills this in one curl, BEFORE any code moves.
- That a new issue can e-mail the operator, and only e-mail, the way the spec
  requires. Better Stack's notification defaults include more than e-mail.
- Whether the free plan issues the API tokens the `betterstack-context` skill
  wants.

Loose end if it happens: `SENTRY_ENVIRONMENT` becomes a misleading name. It
tags every event AND labels the environment in the nightly heartbeat body
(worker.ts), so renaming it touches both.

The facts below informed the choice:

- **Sentry Developer (free) plan: email alerts ONLY.** The Slack integration —
  and third-party integrations generally, plus API access — start at the paid
  Team tier. Free = 1 user, 5k errors/mo, email notifications, 1 uptime + 1
  cron monitor. Don't design a free Sentry→Slack alert path; it doesn't exist
  natively. (The claude.ai Sentry MCP connector works against the account —
  verified 2026-08-26: org slug `stottemedlem`, regionUrl
  `https://de.sentry.io` (EU) — pass regionUrl to every call. The free plan
  has no API tokens, so the MCP is the only headless read/update path;
  authenticate via `/mcp` in-session.)
- **Better Stack Uptime free tier is the generous one:** 10 monitors, 30 s
  checks, and email + Slack + SMS + phone alerts all included on free.
  UptimeRobot free = 50 monitors but 5-min checks and murkier Slack support.
- **Cloudflare Notifications: webhook destinations (→ Slack) require a paid
  plan**; free accounts get email notifications only, and the useful
  Workers-health alert types sit on Pro/Business. Email Routing is free on all
  plans (can forward/intercept notification mail with an Email Worker).
- Free do-it-yourself path that always works on Workers free plan: post
  directly to a Slack incoming webhook from the Worker's own error handling
  (`ctx.waitUntil(fetch(SLACK_WEBHOOK_URL, …))`). Tail Workers require the
  paid Workers plan; in-handler try/catch does not.

## D1 platform limits + capacity watching (verified 2026-09-15)

Source: https://developers.cloudflare.com/d1/platform/limits/ (re-check it, the
numbers move). This account is **Workers Paid**, so the Paid column applies.

| limit | Workers Paid | note |
|-------|--------------|------|
| database size | **10 GB** | HARD, cannot be raised by request. The only D1 ceiling with no escape hatch. |
| storage per account | 1 TB | requestable |
| databases per account | 50,000 | we hold 2 (prod + staging) |
| **queries per Worker invocation** | **1,000** | the tightest real risk for us: the nightly work loops per agreement |
| bound parameters per query | 100 | caps any `IN (...)` list |
| columns per table | 100 | our widest table is ~20 |
| row size | 2 MB | |
| SQL statement length | 100 KB | |
| query execution | 30 s | |
| **Time Travel restore window** | **30 days** | this IS our backup story. Nothing else backs D1 up. |

Rows read/written have no daily quota; they are billed.

**Prod baseline 2026-09-15** (`stottemedlem`, `d7d2afff-7d1e-4df5-987b-9974676550df`,
created 2026-08-12): 213 kB, 10 tables, region EEUR, read replication disabled,
24h traffic 91 reads / 5 writes / 311 rows read / 8 rows written. At these row
sizes the 10 GB ceiling is unreachable even at hundreds of thousands of members,
so the query-per-invocation cap is the one to design against, not size.

**Reading live size when node_modules is empty** (every fresh worktree):
`pnpm exec wrangler` fails with `Command "wrangler" not found`. Skip the install:

```sh
cd apps/backoffice && CI=1 npx --yes wrangler@4 d1 info stottemedlem
# staging: ... d1 info stottemedlem-staging
```

It runs off the GLOBAL wrangler OAuth login, so it needs no API token.

**There is NO D1 alert to switch on.** Verified against
https://developers.cloudflare.com/notifications/notification-available/ : the
notification catalogue has no D1 type and no Workers type. The only adjacent
thing is "Usage Based Billing", which needs Pro plan or higher and is
per-product. So capacity watching has to be ours (a cron step reading `d1 info`
or the D1 API and throwing to Sentry above a threshold), or it does not exist.
`specs/concepts/operational-alerting.md` covers FAILURES only (renewals,
reconciliation, webhooks, notices, config gaps), never capacity.

**The cloud-logs token cannot read D1.** `~/.config/stottemedlem/cloudflare-logs-token`
is scoped to Workers Observability read; hitting
`/accounts/<id>/d1/database` with it returns `code 10000 Authentication error`.
A DIY capacity check needs either a new token with D1 read, or the OAuth session
via `npx wrangler` above.

## Web Share API (`navigator.share`): NOT verified in-repo, model knowledge 2026-09-22

Written while designing the member card's sharing (branch `web-share-member-card`).
Treat every line as a claim to check before it decides anything, EXCEPT the ones
marked "seen on a device": those were reported from a real iPhone and are now what
the code does. Canonical sources to re-fetch:
https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share ·
https://caniuse.com/web-share · https://w3c.github.io/web-share/

- **Where it exists at all.** iOS/iPadOS Safari and every iOS browser, Android
  Chrome, Safari on macOS, Chrome/Edge on Windows. **Not** Firefox on desktop, and
  **not** Chrome on macOS or Linux. So a hand-made chooser stays the desktop path;
  the sheet is an enhancement, never the only way.
- **It needs a secure context and transient user activation.** The call must happen
  inside the click handler. Awaiting a fetch first (for a picture) spends the
  activation on iOS and the call is rejected, so anything shared has to be in hand
  before the press.
- **`title` is ignored by most targets.** `text` and `url` are what travel. Many
  targets concatenate them, which is why a `text` that already contains the address
  sends the address twice. Put the address in exactly one of the two.
- **`url` is canonicalized by the browser.** Expect an IDN host to arrive as
  punycode in the receiving app. This repo deliberately hands people the ø spelling
  (`readableShareableOrigin`, rule in `specs/concepts/member-card.md`), so if the
  readable form must survive, it belongs in `text` with no `url` field.
- **A `url` field can vanish from the message entirely (seen on a device,
  2026-09-22).** Sharing `{text, url}` from iOS Safari into Messages puts the
  address in a link preview bubble and leaves the typed body with no address in
  it, so the sender's own message looks as though the link fell off. The card's
  share therefore writes the address into `text` and never sets `url` at all.
- **Sharing the card picture** is `files: [File]`, gated on
  `navigator.canShare({files})` (feature-detect: `canShare` without `files` support
  still returns true for other payloads). It is the only route into Instagram or
  Snapchat. Reported cost: several targets drop `url` and `text` when a file is
  present, which would lose the link the whole thing exists to spread. The card's own
  QR code is the fallback way in when that happens.
- **A picture is not a dead end for the link.** If a target keeps the file and
  drops `url`, the card's QR code is still readable off the saved picture with no
  camera: iOS Live Text in Photos (iOS 15+), Google Lens, and Circle to Search on
  Android 14+ phones read a code straight off screen. It is a deliberate
  long-press, not a tap, so the link should still travel wherever the target
  allows it. UNTESTED here, and chat recompression is a separate unknown (see
  `verify-qr`).
- **Cancelling rejects with `AbortError`.** A bare `.catch(() => {})` therefore hides
  both "user changed their mind" and "the call was refused"; only the latter should
  fall back to the clipboard.

Local proof: headless Chrome has no sheet, so drive the stubbed API with
`drive-page`'s `--stub` (it already has worked examples for both share paths) and
assert what the page ASKED for. Everything above about how a target renders the
payload can only be settled on a device.

## Facebook's share link needs a facebook.com WEB session (verified 2026-09-22)

`https://www.facebook.com/sharer/sharer.php?u=<url>` is the only Facebook share
entry available without a registered Facebook app id, and it answers **"Not
Logged In. You are not logged in. Please login and try again."** to any browser
without a facebook.com session. Verified twice: with curl (a logged-out request
redirects to `m.facebook.com/login.php`) and in the user's own Chrome, which
showed the bare "Not Logged In" page.

What this means in practice:

- **The Facebook app being signed in does not help.** The link opens a browser,
  and most phone users have never signed in to Facebook there. This is why the
  Facebook place in the card's share chooser looked dead.
- **It is not the ø.** Both `støttemedlem.no` and its punycode spelling behave
  identically in the `u` parameter. (We send punycode anyway: that parameter is
  a machine reading the address, per `specs/concepts/member-card.md`.)
- **There is no better link to switch to.** Facebook publishes no deep link
  scheme for the web, and the official Share Dialog
  (`facebook.com/dialog/share`) requires `app_id`, which this product does not
  have. `sharer.php` also ignores any prefilled message.
- **The fix is the device's own share sheet**, which hands the card to the
  Facebook *app*. That is what the card's one share button does since
  2026-09-22 wherever `navigator.share` exists (see `project-overview`).
- A desktop share sheet (macOS Safari, Chrome on Windows) does **not** list
  Facebook, so `sharer.php` stays the desktop path, where a logged-in web
  session is normal.

## Forward references (not captured yet)

| topic | where |
|-------|-------|
| Cloudflare product guidance (D1, Queues, Cron Triggers, static assets, wrangler) | global `cloudflare` / `wrangler` skills + https://developers.cloudflare.com/ |
| Text/cards over the marketing collage — DECIDED 2026-07-07: localized top scrim + frosted-glass cards (implemented in apps/marketing); duotone brand tint is the fallback if photo colors prove too busy | smashingmagazine.com/2023/08/designing-accessible-text-over-images-part1/ (+part2) · ishadeed.com/article/handling-text-over-image-css/ · superdesign.dev/styles/glassmorphism · web.dev/learn/css/blend-modes |
| Vipps Recurring API behaviour | `docs/research/vipps-recurring-payments.md` (canonical, cited) |
| Web Share API (`files`, target behaviour, support table) | https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share · https://caniuse.com/web-share |
