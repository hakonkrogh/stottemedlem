# @stottemedlem/db

Drizzle schema and query helpers for the D1 system-of-record database
(architecture: `docs/architecture/overview.md`). Consumed by `apps/backoffice`
via its `DB` binding.

## Migrations

Hand-written SQL files in [`migrations/`](migrations/), applied with wrangler's
built-in D1 migrations (the backoffice `wrangler.jsonc` points `migrations_dir`
here). Keep `src/schema.ts` and the SQL in sync — there is no drizzle-kit
codegen step (introduce it if the schema grows past hand-maintainable).

```sh
cd apps/backoffice
pnpm exec wrangler d1 migrations apply DB --local           # local dev (astro dev shares .wrangler/state)
pnpm exec wrangler d1 migrations apply DB --remote          # production
pnpm exec wrangler d1 migrations apply DB --remote --env staging
```

Local dev state lives in `apps/backoffice/.wrangler/state` — `astro dev`
(platform proxy/Miniflare) and `wrangler d1 … --local` read the same database
when run from `apps/backoffice`.
