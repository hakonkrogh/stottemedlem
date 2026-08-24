#!/usr/bin/env bash
# A public HTTPS origin for the local Vipps test rig.
#
# Vipps must reach this machine three ways — the redirect after approval, the
# mandatory management page (merchantAgreementUrl), and webhook deliveries —
# and all three must be HTTPS. A cloudflared quick tunnel needs no account.
#
# The origin is written to .vipps-tunnel at the repo root, where the CLI
# harness picks it up; it is removed on exit, because the URL dies with the
# tunnel and a stale one silently sends Vipps nowhere.
#
# Run: pnpm --filter @stottemedlem/vipps run tunnel [port]
set -euo pipefail

PORT="${1:-8788}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TUNNEL_FILE="$REPO_ROOT/.vipps-tunnel"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found. Install it with: brew install cloudflared" >&2
  exit 1
fi

LOG="$(mktemp -t vipps-tunnel)"
cloudflared tunnel --url "http://localhost:$PORT" --no-autoupdate >"$LOG" 2>&1 &
TUNNEL_PID=$!

cleanup() {
  rm -f "$TUNNEL_FILE"
  kill "$TUNNEL_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

URL=""
for _ in $(seq 1 60); do
  URL="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1 || true)"
  [ -n "$URL" ] && break
  # A dead cloudflared means the URL will never appear — surface its output.
  kill -0 "$TUNNEL_PID" 2>/dev/null || { cat "$LOG" >&2; exit 1; }
  sleep 1
done

if [ -z "$URL" ]; then
  echo "cloudflared did not print a tunnel URL within 60s:" >&2
  cat "$LOG" >&2
  exit 1
fi

printf '%s\n' "$URL" >"$TUNNEL_FILE"
echo "Public origin: $URL  → http://localhost:$PORT"
echo "Written to $TUNNEL_FILE (removed when this tunnel stops)."
echo
echo "The URL is new on every start, so re-register the webhook each time:"
echo "  pnpm --filter @stottemedlem/vipps run recurring-test webhooks register"
echo
echo "Ctrl-C to stop."
wait "$TUNNEL_PID"
