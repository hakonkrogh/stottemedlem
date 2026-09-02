#!/usr/bin/env bash
# Read backend stdout (console.log/error, request lines, stack traces) from the
# astro dev server. Works by running the server with `astro dev --background`,
# which writes everything to <app>/.astro/dev.log — a foreground `pnpm dev`
# writes only to its own terminal and is unreadable to agents.
#
# Usage:
#   devlog.sh start  [app]          start (or convert a foreground server to) a
#                                   log-capturing background dev server
#   devlog.sh tail   [N] [app]      last N log lines, unwrapped (default 50)
#   devlog.sh grep   <pattern> [app] grep the raw log, print unwrapped matches
#   devlog.sh status [app]
#   devlog.sh stop   [app]
#   devlog.sh path   [app]          print the raw log file path
# [app] = backoffice (default) | marketing
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

resolve_app() {
  case "${1:-backoffice}" in
    backoffice) APP=backoffice PORT=4322 ;;
    marketing)  APP=marketing  PORT=4321 ;;
    *) echo "unknown app: $1 (use backoffice or marketing)" >&2; exit 1 ;;
  esac
  APP_DIR="$REPO_ROOT/apps/$APP"
  LOG="$APP_DIR/.astro/dev.log"
  STATE="$APP_DIR/.astro/dev.json"
}

# Log lines are JSON, and the SSR runtime's own lines are double-wrapped as
# {"message":"stdout: {...inner json...}"}. Unwrap both layers for reading.
unwrap() {
  node -e '
    const rl = require("node:readline").createInterface({ input: process.stdin });
    rl.on("line", (line) => {
      let msg = line;
      let level = "";
      try {
        const outer = JSON.parse(line);
        msg = outer.message ?? line;
        level = outer.level ?? "";
        const inner = /^std(?:out|err): (\{.*\})$/.exec(msg);
        if (inner) {
          const o = JSON.parse(inner[1]);
          msg = o.message ?? msg;
          level = o.level ?? level;
        }
      } catch {}
      console.log(level && level !== "info" ? `[${level}] ${msg}` : msg);
    });
  '
}

cmd="${1:-tail}"
case "$cmd" in
  start)
    resolve_app "${2:-backoffice}"
    cd "$APP_DIR"
    if [ -f "$STATE" ]; then
      pid=$(node -p 'require("./.astro/dev.json").pid' 2>/dev/null || echo "")
      bg=$(node -p 'require("./.astro/dev.json").background' 2>/dev/null || echo "")
      if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        if [ "$bg" = "true" ]; then
          echo "already running in background (pid $pid) — logs readable"
          exit 0
        fi
        echo "foreground dev server (pid $pid) found — restarting in background so logs are capturable"
        pnpm exec astro dev stop
        sleep 1
      fi
    fi
    if [ "$APP" = backoffice ]; then
      pnpm exec wrangler d1 migrations apply DB --local
    fi
    if ! pnpm exec astro dev --port "$PORT" --background; then
      # astro only says "exited before becoming ready"; the reason is in the log.
      echo "--- last errors from $LOG ---" >&2
      grep -i -E 'error|failed|cannot' "$LOG" 2>/dev/null | tail -8 | cut -c1-240 >&2
      echo "--- if it says 'Failed to resolve entry for package @stottemedlem/...' the workspace packages are unbuilt (fresh worktree): run from the repo root" >&2
      echo "    pnpm exec turbo run build --filter='./packages/*'" >&2
      exit 1
    fi
    ;;
  tail)
    n="${2:-50}"; resolve_app "${3:-backoffice}"
    [ -f "$LOG" ] || { echo "no log at $LOG — run: devlog.sh start $APP" >&2; exit 1; }
    tail -n "$n" "$LOG" | unwrap
    ;;
  grep)
    pattern="${2:?usage: devlog.sh grep <pattern> [app]}"; resolve_app "${3:-backoffice}"
    [ -f "$LOG" ] || { echo "no log at $LOG — run: devlog.sh start $APP" >&2; exit 1; }
    grep -i -- "$pattern" "$LOG" | unwrap || { echo "(no matches)"; exit 0; }
    ;;
  status)
    resolve_app "${2:-backoffice}"
    cd "$APP_DIR" && pnpm exec astro dev status
    ;;
  stop)
    resolve_app "${2:-backoffice}"
    cd "$APP_DIR" && pnpm exec astro dev stop
    ;;
  path)
    resolve_app "${2:-backoffice}"
    echo "$LOG"
    ;;
  *)
    echo "usage: devlog.sh start|tail|grep|status|stop|path — see header comment" >&2
    exit 1
    ;;
esac
