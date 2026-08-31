# Dependencies — pnpm workspace policy

All three rules below live in `pnpm-workspace.yaml`. Read it before any
`pnpm add` / `pnpm update`; each rule produces an error that reads like a
different bug.

## 1. `catalog:` — shared versions are centralised

Cross-package versions (`astro`, `typescript`, `vitest`, `wrangler`,
`@types/node`, `@cloudflare/workers-types`, `drizzle-orm`, `@astrojs/*`,
`@workos-inc/node`, `tsx`, `@fontsource-variable/fraunces`) are declared once
under `catalog:` in `pnpm-workspace.yaml`; manifests reference them as
`"astro": "catalog:"`. To bump a shared dep, edit the catalog entry — NOT the
package.json, which carries no version to edit. A dep used by only one package
keeps a normal range in that package's manifest (this is why the Storybook deps
are plain `^10.5.10` in `packages/ui/package.json`).

## 2. `minimumReleaseAge: 10080` — a 7-day supply-chain quarantine

Deliberate hardening: pnpm refuses to install any version published less than
7 days ago, giving the ecosystem time to catch compromised releases.

Two consequences that are easy to misread:

- **`pnpm update --latest` resolves to the newest *permitted* version, silently.**
  On 2026-08-31 it took `@storybook-astro/framework` to `1.10.0` while `1.11.0`
  was the npm latest (published 4 days earlier). Nothing in the output says a
  version was held back. So after an upgrade, cross-check with
  `npm view <pkg> version` to know whether you actually landed on latest — and
  record in the manifest note *why* if you didn't.
- **Asking for the quarantined version by name is a hard error**, not a warning:
  ```
  The latest release of <pkg> is "1.11.0". Published at 8/27/2026
  ... you can add the package name to the minimumReleaseAgeExclude setting
  ```
  That suggestion is the wrong fix here. **Do not add
  `minimumReleaseAgeExclude`** — it defeats the policy for that package
  permanently, to buy a version that becomes installable on its own in a few
  days. Take the permitted version and note the held-back one, or wait.

## 3. `onlyBuiltDependencies` — postinstall scripts are blocked by default

pnpm 10 blocks dependency build scripts; only `esbuild`, `sharp` and `workerd`
are allowed to run postinstall. A new dep that needs a native build stays
silently unbuilt until it is added to that list.

## The filtered-update trap — always re-install at the root

`pnpm --filter <pkg> update …` re-resolves the whole workspace but only wires up
the filtered package. **Every other workspace package is left without
`node_modules`**, and the next build fails somewhere unrelated with what looks
like a types bug:

```
packages/core/src/index.ts(588,24): error TS2304: Cannot find name 'crypto'.
                                    error TS2304: Cannot find name 'TextEncoder'.
WARN  Local package.json exists, but node_modules missing, did you mean to install?
```

That is not a missing `@types/node` or a tsconfig `lib` problem — it is the
missing install. The `WARN` line at the bottom is the real diagnosis. Fix:
plain `pnpm install` at the repo root after ANY filtered update (hit
2026-08-31, cost a detour chasing a phantom `lib: ["webworker"]` issue).

Same shape as the documented "a fresh worktree has NO `node_modules`" trap in
the overview's Run / build / test section — a filtered update recreates it
mid-session, on a tree that was working a minute earlier.

## Before pushing a dependency change

`pnpm install --frozen-lockfile` (or the `verify-workflow` skill, which replays
it as CI's first step). A manifest whose specifiers drifted from
`pnpm-lock.yaml` keeps test / typecheck / build / lint green locally against the
already-installed `node_modules`, and dies on the runner before the first test.
See the Storybook automigration note in the overview for how that drift appears
without anyone editing a manifest on purpose.
