# stottemedlem

A pnpm + Turborepo TypeScript monorepo.

> **Product intent lives in [`specs/`](specs/INDEX.md).** What the product does,
> the problems it solves, and its domain concepts are specified there — kept in
> sync with code by a mandatory harness (see [`specs/process.md`](specs/process.md)
> and `CLAUDE.md`). This README covers the engineering setup only.

## Layout

```
.
├─ apps/
│  ├─ backoffice/     # Astro SSR on one Cloudflare Worker: admin UI + API +
│  │                  #   Vipps webhooks + cron + queue consumer
│  └─ marketing/      # Astro static landing page → Cloudflare Worker (assets only)
├─ packages/
│  ├─ core/           # @stottemedlem/core — shared domain types & logic
│  ├─ qr/             # @stottemedlem/qr — QR code/card generation
│  └─ ui/             # @stottemedlem/ui — shared UI primitives (.astro source +
│                     #   design tokens) with Storybook stories; run
│                     #   `pnpm --filter @stottemedlem/ui storybook`
├─ pnpm-workspace.yaml # workspace globs + shared dependency catalog
├─ tsconfig.base.json  # shared TS compiler options (extended per package)
├─ turbo.json          # task graph / caching
└─ biome.json          # lint + format
```

## Conventions

- **Package manager:** pnpm workspaces. Internal deps use `workspace:*`.
- **Shared versions:** declared once in `pnpm-workspace.yaml` under `catalog:`,
  referenced from each `package.json` with `"catalog:"`.
- **TypeScript:** ESM everywhere. Packages compile with `tsc` to `dist/`
  (`module: nodenext`); the apps use `moduleResolution: bundler`.
- **Builds:** orchestrated by Turborepo. `^build` ensures dependencies build first.
- **Lint/format:** Biome.
- **Supply chain:** `minimumReleaseAge` (7-day cooldown) + `onlyBuiltDependencies`
  in `pnpm-workspace.yaml`.

## Commands

```bash
pnpm install         # install everything
pnpm dev             # run the stack: marketing :4321, backoffice :4322 (real
                     #   workerd w/ local D1/KV/Queue); core in watch
                     # NOTE: Astro 7 dev servers are persistent daemons — if a
                     #   port is "already running", stop it with
                     #   `pnpm --filter <app> exec astro dev stop`, not kill
pnpm build           # build all packages + the app
pnpm test            # run tests (vitest)
pnpm story           # run Storybook (packages/ui, port 6006; alias: pnpm stories)
pnpm typecheck       # type-check all packages
pnpm lint            # biome check
pnpm format          # biome format --write
```

Target a single package with Turborepo's `--filter`, e.g.
`pnpm turbo run build --filter=@stottemedlem/core`.

## Deployment

The marketing site deploys automatically to Cloudflare Workers on every push to
`main` (`.github/workflows/deploy-marketing.yml`; also runnable manually via
workflow_dispatch). It needs two repo secrets: `CLOUDFLARE_ACCOUNT_ID` and
`CLOUDFLARE_API_TOKEN` (a token with the "Edit Cloudflare Workers" permissions).
Deploy manually with `pnpm --filter @stottemedlem/marketing deploy`.

## Adding a shared package

1. Create `packages/<name>/` with a `package.json` (`@stottemedlem/<name>`,
   `"type": "module"`, an `exports` map pointing at `dist/`) and a
   `tsconfig.json` that extends `../../tsconfig.base.json`.
2. Reference shared dep versions with `"catalog:"`.
3. Consume it elsewhere with `"@stottemedlem/<name>": "workspace:*"`.
