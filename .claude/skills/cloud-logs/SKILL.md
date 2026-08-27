---
name: cloud-logs
description: Search the DEPLOYED backoffice Workers' logs (staging + production) from the CLI — stored Workers Logs via the Cloudflare observability query API (7-day retention), plus live wrangler tail. Use when debugging remote/deployed behaviour (cron runs, webhooks, queue consumers, 500s) instead of asking the user to open the Cloudflare dashboard.
---

# Cloud logs (deployed Workers)

Two channels, different auth:

| channel | window | auth | command |
|---------|--------|------|---------|
| **Stored logs** (search back in time) | last **7 days** (Workers Paid) | API token file (below) | `node .claude/skills/cloud-logs/cloudlogs.mjs …` |
| **Live tail** (only what happens while attached) | now | existing `wrangler login` OAuth — works already | `pnpm exec wrangler tail [--env staging]` from `apps/backoffice` (non-TTY output is JSON; pipe to a file — under `timeout`/pipes it can look empty otherwise) |

Both backoffice envs have `observability.enabled: true` in wrangler.jsonc, so
every deployed request/cron/queue invocation and its `console.*` lines are
stored. The marketing worker is assets-only (no server code) — **no logs
exist for it**. Local dev output is a different skill: `dev-logs`.

## Auth setup (one-time, user action — dashboard only)

The wrangler OAuth token has NO observability scope (verified 2026-08-27:
`login --scopes-list` offers none, and the query API rejects it with code
10000). A real API token is required and can only be minted in the dashboard:

1. dash.cloudflare.com/profile/api-tokens → Create Token → Custom
2. Permission: **Account → Workers Observability → Read**
3. Account: the stottemedlem account (`9060f19fa0a38d810a96cda89572ce47`)
4. `mkdir -p ~/.config/stottemedlem` and save the token (one line) to
   `~/.config/stottemedlem/cloudflare-logs-token`

That file is user-global, so every worktree/agent shares it (unlike
`.dev.vars`). `CLOUDFLARE_LOGS_API_TOKEN` env var overrides it. The script
prints these same instructions whenever the token is missing/rejected.

Token set up + verified end-to-end 2026-08-27. Service names confirmed via
`values '$metadata.service'`: staging = `stottemedlem-backoffice-staging`,
production = `stottemedlem-backoffice` (despite live-tail scriptTags
suggesting a shared service name — the query API uses the script name).

## Usage

`node .claude/skills/cloud-logs/cloudlogs.mjs [command] [options]`

Commands: `events` (default, one greppable line per log event) ·
`invocations` (events grouped by request) · `count --group-by <key>` ·
`keys` (discover fields) · `values <key>` (discover values).

Options: `-e staging|production` (default production) · `--since 30m|6h|2d`
(default 1h) · `--from/--to ISO` · `-s "text"` full-text search (`--regex`) ·
`--level error|warn|log` · `-f 'key<op>value'` repeatable (`= != ~ !~ ^= $= > >= < <=`;
numeric values auto-typed) · `--exists key` · `-n limit` (default 50) ·
`--cursor <id>` next page · `--json` raw response · `--full` no truncation.

```bash
# errors on staging in the last 6 hours
node .claude/skills/cloud-logs/cloudlogs.mjs -e staging --level error --since 6h

# did the hourly renewal cron run, and what did it log?
node .claude/skills/cloud-logs/cloudlogs.mjs -e staging -s "renewal" --since 3h

# everything one request did (requestId from an event's req=…)
node .claude/skills/cloud-logs/cloudlogs.mjs invocations -e production -f '$workers.requestId=<id>'

# what messages are noisiest this week?
node .claude/skills/cloud-logs/cloudlogs.mjs count --since 7d -e production

# webhook deliveries (public POST /api/vipps/…)
node .claude/skills/cloud-logs/cloudlogs.mjs -e production -f '$metadata.trigger^=POST /api/vipps' --since 2d
```

Cron runs appear with the cron EXPRESSION as the trigger — e.g. staging's
hourly renewal job is `-f '$metadata.trigger=0 * * * *'` (reconcile
`30 * * * *`; production `0 4 * * *` / `0 2 * * *`). A cron that touches only
orgs without Vipps keys logs nothing (skips silently), so absence of lines ≠
the cron didn't run.

Useful fields (verified against live data): `$metadata.service`,
`$metadata.trigger` (e.g. `GET /path`, cron expression), `$metadata.message`,
`$metadata.error`, `$metadata.level`, `$workers.outcome` (`ok`/`exception`),
`$workers.requestId`, `$workers.eventType`. Dataset is `cloudflare-workers`.
Queries run with `dry: true` so they don't pile up in the dashboard's saved
runs.

## Facts (verified 2026-08-27)

- Retention: **3 days free / 7 days paid** — this account is Workers Paid, so
  7 days. 20M log events/month included. >256 KB per event is truncated.
- Endpoint: `POST /accounts/<id>/workers/observability/telemetry/query`
  (+ `/keys`, `/values` — both also POST). Request/response shapes came from
  the SDK source (the docs site is JS-rendered and unfetchable):
  `raw.githubusercontent.com/cloudflare/cloudflare-typescript/main/src/resources/workers/observability/telemetry.ts`
  — re-fetch that file if the API grows or a query 400s.
- `wrangler tail --env staging` verified live against the deployed staging
  worker (hourly crons make it chatty enough to see events within seconds).
- **Errors are ALSO in Sentry** with ~90-day retention — one project
  (`stottemedlem/backoffice-server`, de.sentry.io), events tagged
  `environment:staging|production`, searchable via the Sentry MCP
  (`search_events`/`search_issues`). Sentry has only what `logger()`/the
  Sentry integration reported; Workers Logs has EVERYTHING the worker
  emitted, including bare `console.*` and request lines — but only 7 days
  of it.
