#!/usr/bin/env bash
# Stop hook: enforce the spec harness (see specs/process.md).
#
# If this session edited product code under apps/ or packages/ but did NOT touch
# anything under specs/, the product's intent layer may have drifted. Block the
# stop ONCE and require the model to reconcile specs/ with the change (or to
# explicitly confirm the change had no product-behaviour impact).
#
# Mirrors close-gaps-stop.sh:
# - Runs once per session end (stop_hook_active guard).
# - No-ops when there's nothing to reconcile.
set -euo pipefail

input=$(cat)
active=$(jq -r '.stop_hook_active // false' <<<"$input")
[ "$active" = "true" ] && exit 0   # reconciliation already prompted this session-end

transcript=$(jq -r '.transcript_path // empty' <<<"$input")
[ -z "$transcript" ] || [ ! -f "$transcript" ] && exit 0

# Collect file_paths from edit-like tool calls across the whole session.
edits=$(jq -rs '
  [ .[]
    | (.message.content // empty)
    | (if type == "array" then .[] else empty end)
    | select(.type == "tool_use")
    | select(.name == "Edit" or .name == "Write" or .name == "MultiEdit" or .name == "NotebookEdit")
    | (.input.file_path // .input.notebook_path // empty)
  ] | .[]
' "$transcript" 2>/dev/null || true)

[ -z "$edits" ] && exit 0

# Did we change product code? (apps/ or packages/)
code_changed=$(printf '%s\n' "$edits" | grep -Eq '(^|/)(apps|packages)/' && echo yes || echo no)
# Did we touch the spec layer?
specs_touched=$(printf '%s\n' "$edits" | grep -Eq '(^|/)specs/' && echo yes || echo no)

# Only intervene when code changed but specs were not reconciled.
[ "$code_changed" = "yes" ] && [ "$specs_touched" = "no" ] || exit 0

reason='[Spec harness] This session changed product code under apps/ or packages/ but did not touch specs/. Per CLAUDE.md and specs/process.md this is mandatory: reconcile the spec layer now. Read specs/INDEX.md, then add or update the affected specs/problems, specs/use-cases, and/or specs/concepts files and the registry tables in specs/INDEX.md to reflect what the product now does and why (intent only, never implementation). If the change genuinely has NO product-behaviour impact (pure refactor, build/config, or dependency bump), reply with one line stating that instead. Then stop.'

jq -n --arg r "$reason" '{decision: "block", reason: $r}'
