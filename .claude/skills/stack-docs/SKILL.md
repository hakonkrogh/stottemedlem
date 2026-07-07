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
- `minimumReleaseAge` (7 days) silently resolves ranges to older releases — e.g.
  `^7.0.0` → 7.0.3 when 7.0.6 is 1 day old. Expect lockfile versions to lag npm.
- **Astro 7 dev servers are persistent daemons.** `pkill` does not deregister them —
  the next `astro dev` refuses with "Another astro dev server is already running".
  Stop with `pnpm --filter <app> exec astro dev stop` (or start with
  `astro dev --force`). Applies to smoke tests: always `astro dev stop` after.
- Biome lints `.astro` frontmatter as plain TS and can't see template usage → false
  "unused variable" on frontmatter vars only used in the template. Inline the
  expression in the template or suppress; do NOT auto-apply Biome's `_` rename (it
  breaks the template reference).

Webhook pattern: route `POST /webhooks/vipps` in `worker.ts` *before* delegating to
`handle()` — the webhook path is then plain Worker code (raw `Request` for HMAC over
the raw body; no framework body parsing). Astro endpoints also pass the raw `Request`
through untouched, so either placement is HMAC-safe. If the non-webhook API surface
ever outgrows Astro's basic routing, mount Hono in the same `worker.ts` before
`handle()` — additive, no architecture change.

## WorkOS on Cloudflare Workers

`@workos-inc/node` supports the Workers runtime (fetch API + Web Crypto, no Node
`http`/`crypto`). Gotcha: at least one v7 release broke on Workers via a `buffer`
polyfill (workos-node issue #1130) — smoke-test the installed version under
`wrangler dev` before building on it. AuthKit has no Astro-specific SDK; use the Node
SDK directly in Astro middleware (walkthrough: https://chan.dev/authkit-astro/).
Sources: https://workos.com/blog/launch-week-spring-2024-day-4-cloudflare-workers-edge-support · https://github.com/workos/workos-node

## Forward references (not captured yet)

| topic | where |
|-------|-------|
| Cloudflare product guidance (D1, Queues, Cron Triggers, static assets, wrangler) | global `cloudflare` / `wrangler` skills + https://developers.cloudflare.com/ |
| Vipps Recurring API behaviour | `docs/research/vipps-recurring-payments.md` (canonical, cited) |
