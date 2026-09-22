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

## Prove a new DSN before trusting it

```sh
node .claude/skills/betterstack-context/dsn-check.mjs "https://KEY@HOST/APP_ID"
```

Sends one Sentry envelope by hand, no SDK, so a DSN is known good BEFORE it
becomes a Worker secret. Judge it by the STATUS. `200` means the host accepted
the event, and the body is an empty object rather than Sentry's `{"id":…}`. A
`401 {"detail":"Unauthorized"}` means the `X-Sentry-Auth` header was missing,
NOT that the DSN is bad: the envelope's own `dsn` field is not accepted as
authentication here. The script sends the header.

It files one real event into the application, labelled as a check and safe to
resolve.

## Prove the DEPLOYED error channel delivers

```sh
bash .claude/skills/betterstack-context/alert-check.sh staging
```

`dsn-check.mjs` proves a DSN is good. This proves the deployed WORKER is
actually using it, which is a different question and the one that goes wrong
quietly. A wrong `SENTRY_DSN` secret does not fail, it goes silent, and
typecheck, vitest and dsn-check all pass while it does.

It works by POSTing to `/api/card-without-words`, the product's one alert
raised from an address anybody can reach, which answers 204 whatever happens
and raises a real error on the way. Within seconds the vendor's error list
should show "a member card was drawn without its words", tagged Backoffice and
`staging`. The environment tag is half the proof.

**Staging only, and the script refuses `production` for a reason.** That
message is a CONSTANT, so a test in production fires the same issue a genuinely
broken card would, inflating its count forever and training the operator to
dismiss the one alert that says members are being handed wordless cards.
Production wiring is inferred from staging: same code, same DSN, same command
writing the secret.

**Verified working 2026-09-22**, staging Worker through to the vendor, on the
day the error channel moved off Sentry.

## Rules

- **Read-only by default.** `create` is the only write and it is explicit.
  There is deliberately no delete: removing a heartbeat silently stops the one
  alarm that fires when the product says nothing.
- **`create` sets e-mail only** (sms, call and push off). The alerting spec
  commits the operator to being informed, never paged, and Better Stack's own
  defaults do not match that. Check any heartbeat made in the dashboard the
  same way.
- **The vendor's error list resists automated clicking.** Resolving a row from
  the browser worked once and then silently did nothing across three further
  attempts on a second row (2026-09-22). Resolve by hand rather than spending
  the session on it.
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
