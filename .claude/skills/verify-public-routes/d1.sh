#!/usr/bin/env bash
# Read the local D1 the dev server is using, as data rather than as log noise.
#
# Wrangler prints banners, emoji and a table around every result, so ad-hoc
# `wrangler d1 execute` calls need grepping and re-quoting each time. This
# prints just the rows (JSON), which is what an assertion actually wants — and
# it carries the load-bearing CI=1 that stops wrangler blocking on prompts.
#
# Read-only by convention: use seed.sh to write. Migrations must already be
# applied (seed.sh does that).
#
#   bash .claude/skills/verify-public-routes/d1.sh "SELECT slug FROM organizations"
#   bash .claude/skills/verify-public-routes/d1.sh "SELECT count(*) AS n FROM memberships WHERE period_year = 2026"
#
# Second argument picks WHICH database — local (default), staging, production:
#
#   d1.sh "SELECT ..." staging      # the DEPLOYED staging D1, over the network
#   d1.sh "SELECT ..." production   # real members and real money. Read. Only.
#
# Local fixtures are what you imagined; the deployed rows are what the product
# actually produced. When a screen lists rows, ask staging what shapes it holds
# BEFORE trusting a story — that is how a member with two payments for one
# period is found by us rather than reported by the user (2026-08-27).
#
# Useful over the member registry (migration 0005):
#   supporting_members · membership_agreements · memberships · membership_charges
set -euo pipefail

SQL="${1:?usage: d1.sh \"<SQL>\" [local|staging|production]}"
WHERE="${2:-local}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT/apps/backoffice"

# A deployed database is only ever read here, so refuse anything that is not a
# plain SELECT before it can reach one.
case "$WHERE" in
  local) TARGET=(--local) ;;
  staging) TARGET=(--remote --env staging) ;;
  production) TARGET=(--remote) ;;
  *) echo "Unknown target '$WHERE' — use local, staging or production." >&2; exit 1 ;;
esac
if [ "$WHERE" != "local" ]; then
  case "$(printf '%s' "$SQL" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//')" in
    select*|with*) ;;
    *) echo "Refusing to run a non-SELECT against $WHERE. This reads; it never writes." >&2; exit 1 ;;
  esac
fi

# stderr is kept, not discarded: it is the only place "wrangler: command not
# found" (a worktree that was never `pnpm install`ed) ever appears, and
# swallowing it turns that into a silent empty result.
ERR="$(mktemp)"
trap 'rm -f "$ERR"' EXIT
CI=1 pnpm exec wrangler d1 execute DB "${TARGET[@]}" --json --command "$SQL" 2>"$ERR" |
  ERR_FILE="$ERR" node -e '
    const { readFileSync } = require("node:fs");
    let raw = "";
    process.stdin.on("data", (c) => { raw += c; });
    process.stdin.on("end", () => {
      const fail = (message) => {
        const stderr = readFileSync(process.env.ERR_FILE, "utf8").trim();
        console.error([message, stderr].filter(Boolean).join("\n"));
        process.exit(1);
      };

      // Wrangler prefixes the payload with banners, and the payload itself is
      // an ARRAY on success but an OBJECT on failure. Scanning every opening
      // bracket and keeping the first that parses handles both — and stops a
      // bracket INSIDE a banner or an error message from being mistaken for
      // the payload. (An error object nests `"notes": [...]`; slicing from
      // the first `[` used to crash with a JSON syntax error that named a
      // column offset instead of the SQL error, 2026-08-31.)
      let payload;
      for (let i = 0; i < raw.length; i++) {
        if (raw[i] !== "[" && raw[i] !== "{") continue;
        try {
          payload = JSON.parse(raw.slice(i));
          break;
        } catch {}
      }
      if (payload === undefined) fail(raw.trim() || "no output from wrangler");

      // D1 says what is actually wrong — an unknown column, a syntax error —
      // and saying it back is the whole point of running this.
      if (payload.error) {
        const notes = (payload.error.notes ?? []).map((note) => note.text).filter(Boolean);
        fail([payload.error.text, ...notes].filter(Boolean).join("\n"));
      }

      const results = (Array.isArray(payload) ? payload : [payload]).flatMap(
        (result) => result.results ?? [],
      );
      console.log(JSON.stringify(results, null, 2));
    });
  '
