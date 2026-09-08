#!/usr/bin/env bash
# Pretend the seeded member's membership just RENEWED, locally, without Vipps.
#
# A renewal is one more paid period on the member's history: the card gains a
# heart and its "valid" year moves on. This writes exactly that row for the
# seeded member (Kari, mem-seed-1) into local D1, so the pages that show her
# card can be loaded before and after and compared. Prove the card is fresh
# by the ?v= tag on the embedded picture changing (specs/concepts/member-card.md;
# added 2026-09-08 when a renewed card kept showing the browser's old copy).
#
#   bash .claude/skills/verify-public-routes/renew.sh        # add next year's period
#   bash .claude/skills/verify-public-routes/renew.sh undo   # remove it again
#
# Idempotent both ways. Local only, and only for the seeded member: it is a
# fixture, not a test of the renewal job (that is the vipps-test-rig skill).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT/apps/backoffice"

ID='msh-seed-renewal'
case "${1:-add}" in
  add)
    SQL="INSERT OR IGNORE INTO memberships (id, org_id, member_id, agreement_id, tier_id, tier_name,
           period_year, period_start, period_end, annual_fee_nok, paid_nok)
         VALUES ('$ID','org-seed-1','mem-seed-1','agr-seed-1','tier-1','Støttemedlem',
           CAST(strftime('%Y','now') AS INTEGER)+1,
           (CAST(strftime('%Y','now') AS INTEGER)+1)||'-01-01',
           (CAST(strftime('%Y','now') AS INTEGER)+1)||'-12-31', 300, 300);"
    ;;
  undo)
    SQL="DELETE FROM memberships WHERE id='$ID';"
    ;;
  *) echo "usage: renew.sh [add|undo]" >&2; exit 1 ;;
esac

CI=1 pnpm exec wrangler d1 execute DB --local --command "$SQL" >/dev/null
bash "$ROOT/.claude/skills/verify-public-routes/d1.sh" \
  "SELECT period_year, paid_nok FROM memberships WHERE member_id='mem-seed-1' ORDER BY period_year DESC"
