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

CI=1 pnpm exec wrangler d1 execute DB "${TARGET[@]}" --json --command "$SQL" 2>/dev/null |
  node -e '
    let raw = "";
    process.stdin.on("data", (c) => { raw += c; });
    process.stdin.on("end", () => {
      // wrangler may print a stray line before the JSON payload
      const start = raw.indexOf("[");
      if (start === -1) { console.error(raw.trim() || "no output from wrangler"); process.exit(1); }
      const [result] = JSON.parse(raw.slice(start));
      console.log(JSON.stringify(result.results, null, 2));
    });
  '
