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
(`{ pattern: "xn--stttemedlem-hgb.no/org/*", zone_name: … }`) on one Worker
**takes precedence over another Worker's custom domain** on the same hostname —
this is how the SSR backoffice serves the canonical public org pages on the
apex while the assets-only marketing Worker keeps everything else. Reuse the
same pattern for future public paths (`/bli-med/*`, `/api/qr/*`). Wrangler
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
- **MT (Merchant Test) app:** iOS via TestFlight / Android via Google Play
  (join their Google Group first) — real-app mirror; approve test recurring
  agreements on a phone with a test user for true end-to-end.

### Vipps API mechanics (verified 2026-08-10, implemented in `packages/vipps`)

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
- **Env selection is pure config:** `VIPPS_API_BASE_URL` var —
  `https://apitest.vipps.no` in `.dev.vars` + wrangler `env.staging`,
  `https://api.vipps.no` only in top-level (production) vars. Secrets:
  `VIPPS_CLIENT_SECRET`, `VIPPS_SUBSCRIPTION_KEY` via `wrangler secret put`.
  Read-only credential check: `pnpm --filter @stottemedlem/vipps run smoke`
  (refuses to run against prod).

## Forward references (not captured yet)

| topic | where |
|-------|-------|
| Cloudflare product guidance (D1, Queues, Cron Triggers, static assets, wrangler) | global `cloudflare` / `wrangler` skills + https://developers.cloudflare.com/ |
| Text/cards over the marketing collage — DECIDED 2026-07-07: localized top scrim + frosted-glass cards (implemented in apps/marketing); duotone brand tint is the fallback if photo colors prove too busy | smashingmagazine.com/2023/08/designing-accessible-text-over-images-part1/ (+part2) · ishadeed.com/article/handling-text-over-image-css/ · superdesign.dev/styles/glassmorphism · web.dev/learn/css/blend-modes |
| Vipps Recurring API behaviour | `docs/research/vipps-recurring-payments.md` (canonical, cited) |
