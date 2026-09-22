---
name: betterstack-context
description: Ask Better Stack whether the nightly runs actually beat, from the CLI - list the heartbeats that watch the cron jobs, read one in full, create one, or `check` that each heartbeat expects a beat on the cadence its cron actually keeps (`--dry` needs no account). Needs BETTERSTACK_API_TOKEN (the user's to give). Use when checking that a nightly run reported in or that a deployed environment is watched at all, and ALWAYS after changing triggers.crons or a heartbeat, instead of asking the user to open the dashboard.
---

# Better Stack (the nightly runs' watchdog)

The dead-man's switch for the cron jobs lives here: each nightly run beats to a
heartbeat when it finishes, and Better Stack raises the alarm when the beat does
not come (specs/concepts/operational-alerting.md, and stack-docs, "The nightly
runs' watchdog"). This reaches that account so the answer to "did last night's
run report in, and is staging watched at all?" does not need a browser.

```sh
export BETTERSTACK_API_TOKEN=...   # Better Stack, API tokens, team-scoped Uptime token
node .claude/skills/betterstack-context/bs.mjs heartbeats
node .claude/skills/betterstack-context/bs.mjs heartbeat <id>
node .claude/skills/betterstack-context/bs.mjs create "reconcile production" 86400 3600
node .claude/skills/betterstack-context/bs.mjs check
node .claude/skills/betterstack-context/bs.mjs check --dry   # no account needed
node .claude/skills/betterstack-context/bs.mjs raw /api/v2/monitors
```

`check` is the one worth running after ANY change to `triggers.crons` or to a
heartbeat. It reads the crons out of `wrangler.jsonc`, works out how often each
job therefore beats, and compares that against what each heartbeat actually
expects. `--dry` does the repo half alone, so it runs with no token at all.

`heartbeats` is the one to reach for: it prints each heartbeat's status, how
often a beat is expected, its grace, and its name, which is the whole picture of
what is being watched.

## Rules

- **Read-only by default.** `create` is the only write and it is explicit.
  There is deliberately no delete: removing a heartbeat silently stops the one
  alarm that fires when the product says nothing.
- **`create` sets e-mail only** (sms, call and push off). The alerting spec
  commits the operator to being informed, never paged, and Better Stack's own
  defaults do not match that. Check any heartbeat made in the dashboard the
  same way.
- **`raw` is the escape hatch**, so this stays a generic surface. Reach for a
  documented endpoint through it rather than growing a command per call.
- **The token is the user's to give.** Read from `BETTERSTACK_API_TOKEN`,
  never hardcoded, never committed. UNVERIFIED as of 2026-09-16: whether the
  free plan issues API tokens at all. If it does not, the dashboard is the
  only path and this skill cannot help; say so rather than working around it.

## What the numbers should be

Nothing derives one from the other, so `check` is what keeps them honest.
**This went wrong on the very first setup (found 2026-09-22):** all four
heartbeats were created expecting a beat every 1 day, staging included, while
staging beats hourly. Staging was being read against production's clock, which
`specs/concepts/operational-alerting.md` forbids in as many words, and nothing
looked broken: all four sat green, because beating more often than expected is
never an error. What it cost was the alarm, not the beat. A day of staging
silence is roughly a year of membership time on its accelerated calendar.

| heartbeat | cron | period | grace |
|-----------|------|--------|-------|
| reconcile production | `0 2 * * *` | 86400 | 3600 |
| renewals production | `0 4 * * *` | 86400 | 3600 |
| reconcile staging | `30 * * * *` | 3600 | 900 |
| renewals staging | `0 * * * *` | 3600 | 900 |

Each heartbeat's address goes into the matching Worker secret
(`HEARTBEAT_URL_RECONCILE`, `HEARTBEAT_URL_RENEWALS`, with `--env staging` for
staging's pair). A heartbeat stays Pending until its first beat arrives.

To prove the Worker beats to the right address WITHOUT this account, use
`.claude/skills/vipps-test-rig/beat-check.sh`.
