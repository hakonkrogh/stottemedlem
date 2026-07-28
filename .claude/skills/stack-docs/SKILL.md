---
name: stack-docs
description: Verified platform facts for the stottemedlem stack (Astro on Cloudflare Workers, WorkOS on Workers). Load before scaffolding or configuring apps/marketing or apps/backoffice, or assuming how the Astro Cloudflare adapter / WorkOS SDK behave on Workers.
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

## Forward references (not captured yet)

| topic | where |
|-------|-------|
| Cloudflare product guidance (D1, Queues, Cron Triggers, static assets, wrangler) | global `cloudflare` / `wrangler` skills + https://developers.cloudflare.com/ |
| Text/cards over the marketing collage — DECIDED 2026-07-07: localized top scrim + frosted-glass cards (implemented in apps/marketing); duotone brand tint is the fallback if photo colors prove too busy | smashingmagazine.com/2023/08/designing-accessible-text-over-images-part1/ (+part2) · ishadeed.com/article/handling-text-over-image-css/ · superdesign.dev/styles/glassmorphism · web.dev/learn/css/blend-modes |
| Vipps Recurring API behaviour | `docs/research/vipps-recurring-payments.md` (canonical, cited) |
