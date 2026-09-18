---
name: betterstack-context
description: Ask Better Stack whether the nightly runs actually beat, from the CLI - list the heartbeats that watch the cron jobs, read one in full, or create one. Needs BETTERSTACK_API_TOKEN (the user's to give). Use when checking that a nightly run reported in, or that a deployed environment is watched at all, instead of asking the user to open the dashboard.
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
node .claude/skills/betterstack-context/bs.mjs raw /api/v2/monitors
```

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

Periods have to match `apps/backoffice/wrangler.jsonc` `triggers.crons` by
hand, because nothing derives one from the other:

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
