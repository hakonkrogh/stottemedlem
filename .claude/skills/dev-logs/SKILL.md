---
name: dev-logs
description: Read the backend's stdout locally — console.log/error, request lines ([200] /path 4ms), and SSR stack traces from the astro dev server — via a background daemon whose output lands in a greppable log file. Use whenever debugging server-side behaviour needs the dev server's output (instead of asking the user to paste terminal output).
---
# Dev-server logs

`bash .claude/skills/dev-logs/devlog.sh <cmd>`

| cmd | does |
|-----|------|
| `start [app]` | start a log-capturing dev server (backoffice default, port 4322; `marketing` = 4321). Runs local D1 migrations first for backoffice, mirroring `pnpm dev`. **Idempotent**, and if a *foreground* dev server is running it restarts it in background mode so logs become readable. |
| `tail [N] [app]` | last N log lines (default 50), unwrapped to plain text |
| `grep <pattern> [app]` | case-insensitive grep over the whole log, unwrapped |
| `status` / `stop [app]` | daemon status / stop it |
| `path [app]` | print the raw log file path |

## The facts that make this work (verified 2026-08-18, astro 7.0.3)

- A **foreground** `pnpm dev` / `astro dev` writes stdout only to its terminal —
  agents cannot read it, and `astro dev logs` errors with "was not started with
  `astro dev --background`". `.astro/dev.log` stays stale (its mtime gives this
  away).
- `astro dev --port <p> --background` daemonizes and writes **everything** to
  `apps/<app>/.astro/dev.log`: astro/vite lines, request lines
  (`[200] /bli-medlem/x 4ms`), and `console.log`/`console.error` from SSR code
  **including full stack traces and inspected objects**. Verified end-to-end by
  triggering `callback.ts`'s `console.error` with a bogus OAuth code.
- The log is **truncated on each background start** — grep counts are per-run,
  and after a restart old evidence is gone (copy anything you need first).
- Log lines are JSON, and the SSR runtime's lines are double-wrapped
  (`{"message":"stdout: {…inner json…}"}`); `devlog.sh` unwraps both layers.
  For ad-hoc tools, use the raw file from `devlog.sh path`.
- `astro dev logs --follow` exists but blocks — don't use it from an agent;
  `tail` + re-run instead. (`--follow` in a *user's* terminal is the way for a
  human to watch the same shared server live.)
- `.astro/dev.json` records `pid` and `background`; `astro dev status`/`stop`
  work on foreground servers too (that's how `start` converts one).
- **Don't start the server with a bare `astro dev`** (hit 2026-08-31): without
  `--port` the backoffice daemonizes on 4321 — marketing's port, not 4322 — and
  the CLI exits 0 while the daemon keeps running, so a "completed" command +
  `curl: 000` on 4322 looks like a broken server. Always go through
  `devlog.sh start` (right port, migrations, readable logs); recover with
  `pnpm --filter @stottemedlem/backoffice exec astro dev stop`.

## Typical loop

```
bash .claude/skills/dev-logs/devlog.sh start
curl -s localhost:4322/some/page        # or drive the browser / run the flow
bash .claude/skills/dev-logs/devlog.sh tail 30
bash .claude/skills/dev-logs/devlog.sh grep "vipps"
```

Related: `preview-screenshot` (visual loop; its "dark error overlay" gotcha says
to check these logs for the request that actually threw).

## A 500 on every SSR route right after you changed config — restart, don't debug

Symptom (hit 2026-08-31): every page and endpoint answers **500**, and the log
says `Re-optimizing dependencies because vite config has changed` followed by
`The file does not exist at .../node_modules/.vite/deps_ssr/<chunk>.js?v=…
which is in the optimize deps directory`. The running server is holding
pre-bundled dependency chunks that its own re-optimization has just replaced.

It is not your code. Anything that rewrites config under the app — notably
`wrangler types` (which `pnpm typecheck` runs) or adding/removing `.dev.vars`
— can trigger it mid-session, so a route that worked five minutes ago starts
failing with no edit to blame.

    bash .claude/skills/dev-logs/devlog.sh stop && bash .claude/skills/dev-logs/devlog.sh start

Then re-run the request. If a 500 survives a restart, THEN it is worth reading.
