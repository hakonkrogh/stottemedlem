# Stop hooks: composition and local testing

Two `Stop` hooks are registered in `.claude/settings.json` (both run on every
stop, in order): `spec-sync-stop.sh` then `close-gaps-stop.sh`.

## How they compose
- Both guard on `stop_hook_active`: on the **first** stop attempt either may
  `decision:block` (with its reason); the model then continues and addresses
  both reasons in one continuation. On the **next** stop, `stop_hook_active` is
  `true`, so both hooks `exit 0` and the stop is allowed. The shared guard is
  why they don't loop or fight each other.
- `spec-sync-stop.sh` blocks only when the session edited `apps/` or `packages/`
  but touched nothing under `specs/` — enforcing the spec harness.
- `close-gaps-stop.sh` blocks when the session used work/research tools, to run
  the close-gaps review once.

## The spec hook only sees Edit/Write/MultiEdit/NotebookEdit
It scans the transcript for those tool calls and their `file_path`s — so specs
written another way are **invisible to it**. Writing `specs/*.md` with a bash
heredoc (`cat > specs/... <<'EOF'`) or `python3` reconciles the spec layer for
real, and the hook still blocks the stop, every turn, claiming you touched
nothing under `specs/`. In bypass-permissions mode — where the standing
instruction is to prefer Bash for file edits — that is the default outcome.

**Use the Write/Edit tool for `specs/**` files** (Bash stays fine for code), or
expect to spend a turn explaining that the specs *are* reconciled. Verify with
`git status --porcelain specs/` and `node .claude/skills/spec-lint/check.mjs`,
which look at the working tree rather than the transcript. Same blind spot
applies to any future hook written this way; a working-tree check would not
have it.

## How to test a Stop hook locally
The hook reads a JSON event on stdin (`stop_hook_active`, `transcript_path`) and
parses the transcript (JSONL, one event per line) with `jq`. Simulate it:

```bash
tmp=$(mktemp -d)
# a transcript line is one JSON object; tool calls live in message.content[]
printf '%s\n' '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Edit","input":{"file_path":"/repo/apps/web/src/app/page.tsx"}}]}}' > "$tmp/t.jsonl"
echo "{\"stop_hook_active\":false,\"transcript_path\":\"$tmp/t.jsonl\"}" | bash .claude/hooks/spec-sync-stop.sh
# -> prints {"decision":"block",...}; with a specs/ edit added, or active=true, prints nothing (exit 0)
```

Gotchas:
- `jq -rs` slurps all JSONL lines into one array; iterate `.[] | .message.content`.
- `set -euo pipefail` + `grep -q` in a `cmd && echo yes || echo no` capture
  avoids aborting when grep finds no match.
- Make the script executable (`chmod +x`) and syntax-check with `bash -n`.
