#!/usr/bin/env bash
# Put the seeded member's RENEWAL into a chosen state, locally, without Vipps.
#
# Three states worth loading a page in, and the difference between them is the
# whole retry grace (specs/concepts/membership.md):
#
#   done      one more paid period: the card gains a heart, its year moves on
#   retrying  the current period is NOT paid and a renewal charge is still open:
#             the member stays ACTIVE on every surface, and the card says
#             "Gyldig <current>", not "Støttet t.o.m. <last>"
#   failed    that same charge has definitively failed: now the card lapses
#
#   bash .claude/skills/verify-public-routes/renew.sh done       # (default)
#   bash .claude/skills/verify-public-routes/renew.sh retrying
#   bash .claude/skills/verify-public-routes/renew.sh failed
#   bash .claude/skills/verify-public-routes/renew.sh undo       # back to the seed
#
# Every state is idempotent and reachable from any other. `add` still works as
# an alias for `done`.
#
# What to assert, with the dev server up (dev-logs/devlog.sh start):
#
#   curl -s localhost:4322/medlemsbevis/kort-seed-1/kort.svg \
#     | grep -oE "STØTTET T.O.M.|GYLDIG|>20[0-9][0-9]<"
#   curl -s localhost:4322/medlemsbevis/kort-seed-1 | grep -oE 'kort\.svg\?v=[a-z0-9]+'
#
# The ?v= tag must MOVE on every transition: it is what stops a browser serving
# its kept copy of the old card (specs/concepts/member-card.md).
#
# Local only, and only for the seeded member (Kari, mem-seed-1). It is a
# fixture, not a test of the renewal job: that is the vipps-test-rig skill.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
D1="$ROOT/.claude/skills/verify-public-routes/d1.sh"
cd "$ROOT/apps/backoffice"

MEMBER='mem-seed-1'
RENEWAL_ID='msh-seed-renewal'
CHARGE_ID='chg-seed-retry'

run() { CI=1 pnpm exec wrangler d1 execute DB --local --command "$1" >/dev/null; }

# The current calendar period. Local D1 runs the calendar scheme; the ISO-week
# scheme is a staging-only thing (specs/concepts/annual-period.md).
now_year() { date +%Y; }

max_period() {
  bash "$D1" "SELECT COALESCE(MAX(period_year), 0) AS y FROM memberships WHERE member_id='$MEMBER'" \
    | grep -oE '[0-9]+' | head -1
}

# Shift the member's whole history by one period.
#
# NOT `period_year - 1`: memberships is UNIQUE on (member_id, period_year), and
# a one-step shift walks each row onto the row below it, so SQLite rejects it
# with SQLITE_CONSTRAINT_UNIQUE. Park the history ten periods away first, where
# nothing of the member's own can collide, then come back nine. (The skill's
# older advice, "shift by -7", only worked because seven clears a four-year
# history; one does not, and one is the shift you actually want here.)
age_back()    { run "UPDATE memberships SET period_year = period_year - 10 WHERE member_id='$MEMBER';
                     UPDATE memberships SET period_year = period_year + 9  WHERE member_id='$MEMBER';"; }
age_forward() { run "UPDATE memberships SET period_year = period_year + 10 WHERE member_id='$MEMBER';
                     UPDATE memberships SET period_year = period_year - 9  WHERE member_id='$MEMBER';"; }

# Leave the member paid up to LAST period, so the current one is owed.
unpay_current_period() {
  [ "$(max_period)" -ge "$(now_year)" ] && age_back
  return 0
}
repay_current_period() {
  [ "$(max_period)" -lt "$(now_year)" ] && age_forward
  return 0
}

# The renewal charge Vipps has not settled either way. Only an open RECURRING
# charge grants the grace, which is why type matters as much as status.
open_charge() {
  run "DELETE FROM membership_charges WHERE id='$CHARGE_ID';
       INSERT INTO membership_charges (id, org_id, agreement_id, vipps_charge_id,
         period_year, type, status, amount_nok, due)
       VALUES ('$CHARGE_ID','org-seed-1','agr-seed-1','chr-SEEDRETRY',
         $(now_year),'RECURRING','$1',300,'$(now_year)-01-01');"
}

case "${1:-done}" in
  done|add)
    repay_current_period
    run "DELETE FROM membership_charges WHERE id='$CHARGE_ID';"
    run "INSERT OR IGNORE INTO memberships (id, org_id, member_id, agreement_id, tier_id, tier_name,
           period_year, period_start, period_end, annual_fee_nok, paid_nok)
         VALUES ('$RENEWAL_ID','org-seed-1','$MEMBER','agr-seed-1','tier-1','Støttemedlem',
           $(( $(now_year) + 1 )), $(( $(now_year) + 1 ))||'-01-01',
           $(( $(now_year) + 1 ))||'-12-31', 300, 300);"
    ;;
  retrying)
    run "DELETE FROM memberships WHERE id='$RENEWAL_ID';"
    unpay_current_period
    open_charge DUE
    ;;
  failed)
    run "DELETE FROM memberships WHERE id='$RENEWAL_ID';"
    unpay_current_period
    open_charge FAILED
    ;;
  undo)
    run "DELETE FROM memberships WHERE id='$RENEWAL_ID';
         DELETE FROM membership_charges WHERE id='$CHARGE_ID';"
    repay_current_period
    ;;
  *) echo "usage: renew.sh [done|retrying|failed|undo]" >&2; exit 1 ;;
esac

bash "$D1" "SELECT period_year, paid_nok FROM memberships WHERE member_id='$MEMBER' ORDER BY period_year DESC"
bash "$D1" "SELECT id, type, status, period_year FROM membership_charges
            WHERE agreement_id='agr-seed-1' ORDER BY period_year DESC"
