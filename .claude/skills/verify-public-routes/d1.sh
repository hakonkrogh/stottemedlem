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
# Useful over the member registry (migration 0005):
#   supporting_members · membership_agreements · memberships · membership_charges
set -euo pipefail

SQL="${1:?usage: d1.sh \"<SQL>\"}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT/apps/backoffice"

CI=1 pnpm exec wrangler d1 execute DB --local --json --command "$SQL" 2>/dev/null |
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
