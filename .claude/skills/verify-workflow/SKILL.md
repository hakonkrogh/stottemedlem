---
name: verify-workflow
description: Run a GitHub Actions workflow's `run:` steps locally in a runner-like scrubbed env, to prove a CI change is green BEFORE pushing. Use after editing anything in .github/workflows/.
---
# Verify a GitHub Actions workflow locally

CI failures in this repo are almost never "the YAML is malformed" — they are
**environment** failures: a step leans on a gitignored file, a local secret, or a
warm turbo cache that a fresh runner does not have. Pushing to find out costs a
round-trip per guess. This runs a job's `run:` steps here, in an environment
scrubbed the way a runner is.

```bash
node .claude/skills/verify-workflow/run-steps.mjs <workflow.yml> [job] [flags]
```

| flag | effect |
|------|--------|
| `--list` | print the steps and what would be skipped; run nothing |
| `--force-turbo` | append `--force` to `pnpm turbo run …` steps (see the caching trap below) |
| `--keep-env` | do NOT scrub the environment (rarely what you want — it hides exactly the bugs this finds) |

```bash
# the normal check after editing CI
node .claude/skills/verify-workflow/run-steps.mjs .github/workflows/ci.yml --force-turbo
```

## What it does and does not do

Each step runs via `bash -eo pipefail` from the repo root with an `env -i`-style
environment: only `PATH`, `HOME`, `LANG`, plus `CI=true`, `GITHUB_ACTIONS=true`
and the workflow/job/step-level `env:` blocks. First non-zero exit fails the run.

Two kinds of step are **skipped**, and this is the tool's honest limit:

- `uses:` steps (`actions/checkout`, `setup-node`, `pnpm/action-setup`) — not
  reproducible locally. So it does not prove the node/pnpm versions resolve, and
  it runs against your working tree, not a clean clone.
- Any step whose `run:` **or `env:`** contains a `${{ … }}` expression. This is a
  **safety guard, not just a limitation**: a deploy step here is a bare
  `wrangler deploy` whose credentials arrive only through `env:`, so scanning
  `run:` alone would fire a REAL production deploy and a REAL `--remote` D1
  migration. Never loosen this to make a deploy workflow "runnable".

It is therefore a strong check on `ci.yml` (whose steps are all plain commands)
and only a partial one on the deploy workflows (build step yes, deploy no).

## The turbo caching trap — why `--force-turbo` exists

`pnpm turbo run test` can print `12 cached, 12 total >>> FULL TURBO` in ~100ms
while executing **nothing**, replaying stdout cached in a *sibling worktree*. A
local green then means nothing about CI, where the cache is always cold. Pass
`--force-turbo` whenever you want real proof. See `project-overview` →
Run / build / test.

## Confirming it actually catches things

Verified 2026-08-27 on `ci.yml`: green (22/22 turbo tasks, 0 cached) with the
`.dev.vars` seed step present, and red with that one step deleted —
`error TS2339: Property 'VIPPS_CLIENT_ID' does not exist on type 'Env'`, the
exact failure a runner hits. If a change to this script makes both cases pass,
the script is broken.
