# stottemedlem

A pnpm + Turborepo TypeScript monorepo.

## Layout

```
.
├─ apps/
│  └─ web/            # Next.js 16 app (App Router) — the primary web app
├─ packages/
│  └─ core/           # @stottemedlem/core — shared domain types & logic
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
  (`module: nodenext`); the app uses `moduleResolution: bundler`.
- **Builds:** orchestrated by Turborepo. `^build` ensures dependencies build first.
- **Lint/format:** Biome.
- **Supply chain:** `minimumReleaseAge` (7-day cooldown) + `onlyBuiltDependencies`
  in `pnpm-workspace.yaml`.

## Commands

```bash
pnpm install         # install everything
pnpm dev             # run the app (builds deps first)
pnpm build           # build all packages + the app
pnpm test            # run tests (vitest)
pnpm typecheck       # type-check all packages
pnpm lint            # biome check
pnpm format          # biome format --write
```

Target a single package with Turborepo's `--filter`, e.g.
`pnpm turbo run build --filter=@stottemedlem/core`.

## Adding a shared package

1. Create `packages/<name>/` with a `package.json` (`@stottemedlem/<name>`,
   `"type": "module"`, an `exports` map pointing at `dist/`) and a
   `tsconfig.json` that extends `../../tsconfig.base.json`.
2. Reference shared dep versions with `"catalog:"`.
3. Consume it elsewhere with `"@stottemedlem/<name>": "workspace:*"`.
