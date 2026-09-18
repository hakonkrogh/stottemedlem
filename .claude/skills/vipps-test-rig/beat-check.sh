#!/usr/bin/env bash
# Prove what a nightly run beats to its watchdog, through the REAL Worker.
#
# The watchdog (Better Stack heartbeats, specs/concepts/operational-alerting.md)
# is the one alert that fires when the product says NOTHING, so it cannot be
# validated by reading a log: the whole question is which HTTP request left the
# Worker, and when. This stands a receiver in the watchdog's place, runs the
# real scheduled handler against it, and prints exactly what arrived.
#
#   bash .claude/skills/vipps-test-rig/beat-check.sh "0 2 * * *"   # reconcile
#   bash .claude/skills/vipps-test-rig/beat-check.sh "0 4 * * *"   # renewals
#
# Expect on a good run:  GET  /api/v1/heartbeat/tok-<job>
# Expect when it throws: POST /api/v1/heartbeat/tok-<job>/fail  + a body of
# identifiers only. To see the failure path, inject a throw at the top of
# runScheduledJobs, run this, then take it out again.
#
# No Better Stack account or token is needed: the addresses are passed in as
# vars pointing at the local receiver.
set -euo pipefail

CRON="${1:-0 2 * * *}"
PORT="${2:-8791}"
RPORT="${3:-8799}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
WORK="$(mktemp -d -t sm-beat)"

cat >"$WORK/receiver.mjs" <<'JS'
import { createServer } from "node:http";
createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    console.log(JSON.stringify({
      method: req.method,
      path: req.url,
      body: Buffer.concat(chunks).toString("utf8"),
    }));
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
  });
}).listen(Number(process.argv[2]));
JS

node "$WORK/receiver.mjs" "$RPORT" >"$WORK/received.log" 2>&1 &
RPID=$!
trap 'kill "$RPID" 2>/dev/null || true; kill "${WPID:-0}" 2>/dev/null || true' EXIT INT TERM
sleep 1

# wrangler serves the BUILT dist, never src. Skip this and you are testing
# whatever was built last: on 2026-09-16 that was a day-old build of an
# abandoned implementation, and it "passed" while showing a request no code in
# the tree could produce. A stale dist does not fail, it lies.
cd "$ROOT"
pnpm turbo run build --filter=@stottemedlem/backoffice >"$WORK/build.log" 2>&1 \
  || { echo "--- build failed ---"; tail -20 "$WORK/build.log"; exit 1; }

cd "$ROOT/apps/backoffice"
CI=1 pnpm exec wrangler d1 migrations apply DB --local >/dev/null 2>&1 || true
CI=1 pnpm exec wrangler dev --test-scheduled --port "$PORT" \
  --var "HEARTBEAT_URL_RECONCILE:http://localhost:$RPORT/api/v1/heartbeat/tok-reconcile" \
  --var "HEARTBEAT_URL_RENEWALS:http://localhost:$RPORT/api/v1/heartbeat/tok-renewals" \
  >"$WORK/wrangler.log" 2>&1 &
WPID=$!

for _ in $(seq 1 60); do
  curl -sf -o /dev/null "http://localhost:$PORT/healthz" && break
  kill -0 "$WPID" 2>/dev/null || { echo "--- wrangler died ---"; tail -30 "$WORK/wrangler.log"; exit 1; }
  sleep 1
done

curl -s -o /dev/null -w "trigger → HTTP %{http_code}\n" \
  "http://localhost:$PORT/cdn-cgi/handler/scheduled?cron=$(printf '%s' "$CRON" | tr ' ' '+')"
sleep 6

echo "--- what the watchdog received ---"
grep '^{' "$WORK/received.log" || echo "(nothing: the run beat to no one)"
