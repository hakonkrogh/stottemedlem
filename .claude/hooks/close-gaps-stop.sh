#!/usr/bin/env bash
# Stop hook: at the end of a working session, force one close-gaps review pass.
#
# - Runs exactly ONCE per session end: if stop_hook_active is true, this stop was
#   caused by our own previous block (the review already ran) -> allow it.
# - Skips trivial sessions: if the transcript shows no work/research tools were
#   used, there's nothing to harvest -> allow the stop.
# - Otherwise blocks the stop and instructs the model to run the close-gaps review,
#   after which it stops again (now with stop_hook_active=true) and is allowed.
set -euo pipefail

input=$(cat)
active=$(jq -r '.stop_hook_active // false' <<<"$input")
[ "$active" = "true" ] && exit 0   # review already ran this session-end; let it stop

transcript=$(jq -r '.transcript_path // empty' <<<"$input")

# Relevance gate: only review if the session actually did work or research.
# (A pure Q&A / read-only session has no gaps or discoveries to capture.)
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  if ! grep -Eq '"name"[[:space:]]*:[[:space:]]*"(Edit|Write|MultiEdit|NotebookEdit|Bash|WebFetch|WebSearch)"' "$transcript"; then
    exit 0
  fi
fi

reason='[Automated end-of-session review] Before this session ends, invoke the `close-gaps` skill and run its review over THIS session. If there is genuinely nothing durable to capture, reply with one line saying so. Then stop.'

jq -n --arg r "$reason" '{decision: "block", reason: $r}'
