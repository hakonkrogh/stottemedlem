#!/usr/bin/env bash
# Drive this worktree's Storybook now that its port is not fixed.
#
#   story.sh start        start it headless (pre-builds core+db+qr), print the port
#   story.sh port         print the running one's port (exit 1 if none)
#   story.sh ids [match]  list story ids, optionally filtered
#   story.sh url <id>     print the iframe url for a story id
#   story.sh log          path of the startup log
#   story.sh stop         kill it
#
# The package script is a bare `storybook dev`: no -p, so Storybook takes a free
# port of its own (a random high one) and never collides with another worktree.
# Never assume 6006/6007 and never pass your own -p (passing one brings back the
# interactive "port not available" prompt, which hangs a background start).
# `pnpm story` also OPENS a browser tab, which is for the user, not for you:
# this script starts the same server with --no-open. State is per worktree.
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
KEY=$(printf '%s' "$ROOT" | shasum | cut -c1-12)
LOG="${TMPDIR:-/tmp}/sb-$KEY.log"
PORTFILE="${TMPDIR:-/tmp}/sb-$KEY.port"

alive() { [ -n "${1:-}" ] && curl -sf -m 2 "http://localhost:$1/index.json" >/dev/null 2>&1; }

current_port() {
  local p
  p=$(cat "$PORTFILE" 2>/dev/null || true)
  alive "$p" && { printf '%s\n' "$p"; return 0; }
  return 1
}

need_port() {
  current_port || { echo "no storybook running for $ROOT; run: story.sh start" >&2; exit 1; }
}

usage() { sed -n '2,16p' "${BASH_SOURCE[0]}" | sed 's/^#\{1,\} \{0,1\}//'; }

case "${1:-}" in
start)
  if p=$(current_port); then printf '%s\n' "$p"; exit 0; fi
  ( cd "$ROOT" && pnpm turbo run build --filter=@stottemedlem/core --filter=@stottemedlem/db --filter=@stottemedlem/qr ) >"$LOG" 2>&1
  ( cd "$ROOT/packages/ui" && nohup npx storybook dev --no-open >>"$LOG" 2>&1 & disown ) >/dev/null 2>&1
  for _ in $(seq 1 120); do
    p=$(grep -oE 'localhost:[0-9]+' "$LOG" | tail -1 | cut -d: -f2 || true)
    if alive "$p"; then printf '%s\n' "$p" >"$PORTFILE"; printf '%s\n' "$p"; exit 0; fi
    sleep 2
  done
  echo "storybook did not come up; see $LOG" >&2
  exit 1
  ;;
port) need_port ;;
ids)
  p=$(need_port)
  curl -s "http://localhost:$p/index.json" |
    python3 -c "import json,sys;print('\n'.join(sorted(json.load(sys.stdin)['entries'])))" |
    { if [ -n "${2:-}" ]; then grep -i -- "$2"; else cat; fi; }
  ;;
url)
  [ -n "${2:-}" ] || { echo "usage: story.sh url <story-id>" >&2; exit 1; }
  p=$(need_port)
  printf 'http://localhost:%s/iframe.html?id=%s&viewMode=story\n' "$p" "$2"
  ;;
log) printf '%s\n' "$LOG" ;;
stop)
  p=$(cat "$PORTFILE" 2>/dev/null || true)
  if [ -n "$p" ]; then lsof -ti:"$p" 2>/dev/null | xargs kill 2>/dev/null || true; fi
  rm -f "$PORTFILE"
  ;;
*) usage; exit 1 ;;
esac
