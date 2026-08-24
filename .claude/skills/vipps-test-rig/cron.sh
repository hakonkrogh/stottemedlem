#!/usr/bin/env bash
# Fire one of the backoffice's scheduled jobs and show what it did.
#
# The nightly jobs (repricing, renewal charges) are where memberships actually
# keep running, and `astro dev` cannot reach them at all: Vite serves only the
# fetch handler, so `scheduled` is unreachable and the jobs look fine while
# being completely untested. This builds and runs the real Worker under
# wrangler, triggers the cron, prints the job's own log lines, and tears down.
#
#   bash .claude/skills/vipps-test-rig/cron.sh "0 2 * * *"    # reprice
#   bash .claude/skills/vipps-test-rig/cron.sh "0 4 * * *"    # reprice + renew
#
# Uses the same local D1 as `astro dev`, so seed first (verify-public-routes'
# seed.sh) and inspect afterwards with d1.sh. Jobs talk to the REAL Vipps test
# environment through the org's keys — a reprice really does change the price
# in the test user's app.
set -euo pipefail

CRON="${1:-0 4 * * *}"
PORT="${2:-8790}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

cd "$ROOT"
# The Worker consumes packages from their built dist/, so go through turbo.
pnpm turbo run build --filter=@stottemedlem/backoffice >/dev/null

cd "$ROOT/apps/backoffice"
LOG="$(mktemp -t sm-cron)"
CI=1 pnpm exec wrangler dev --test-scheduled --port "$PORT" >"$LOG" 2>&1 &
WRANGLER_PID=$!
trap 'kill "$WRANGLER_PID" 2>/dev/null || true' EXIT INT TERM

for _ in $(seq 1 40); do
  curl -sf -o /dev/null "http://localhost:$PORT/healthz" && break
  kill -0 "$WRANGLER_PID" 2>/dev/null || { cat "$LOG" >&2; exit 1; }
  sleep 1
done

# The trigger path is /cdn-cgi/handler/scheduled. NOT /__scheduled — that one
# falls through our custom fetch handler into a /login redirect, which reads
# exactly like a cron that ran and did nothing.
BEFORE="$(wc -l <"$LOG")"
curl -s -o /dev/null -w "trigger → HTTP %{http_code}\n" \
  "http://localhost:$PORT/cdn-cgi/handler/scheduled?cron=$(printf '%s' "$CRON" | tr ' ' '+')"
sleep 4

echo "--- what the job logged ---"
tail -n "+$((BEFORE + 1))" "$LOG" | grep -vE "^\[wrangler:info\] (GET|POST)" | grep -vE "^\s*$" || true
