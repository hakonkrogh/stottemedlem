#!/usr/bin/env bash
# Seed local D1 with a FICTITIOUS org that has real membership tiers, so the
# public join page renders its full offer instead of the zero-tier degraded
# state. Idempotent: re-running replaces the seed rows.
#
# Local D1 state lives in apps/backoffice/.wrangler and is shared live with a
# running `astro dev` — no restart needed after seeding.
set -euo pipefail

SLUG="${1:-eksempel-musikkorps}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT/apps/backoffice"

# Preflight: an unmigrated local D1 makes the INSERTs die with "no such table:
# organizations". Apply pending migrations first. CI=1 is REQUIRED — without it
# wrangler stops on an interactive "About to apply N migration(s)" prompt.
CI=1 pnpm exec wrangler d1 migrations apply DB --local >/dev/null 2>&1 || {
  echo "migrations failed; run: CI=1 pnpm exec wrangler d1 migrations apply DB --local" >&2
  exit 1
}

# Seed only fictitious names/orgnr — screenshots and docs must never carry real
# org data. 923609016 is a valid MOD11 number chosen for the example org.
pnpm exec wrangler d1 execute DB --local --command "
DELETE FROM membership_tiers WHERE org_id = 'org-seed-1';
DELETE FROM organizations WHERE id = 'org-seed-1';
INSERT INTO organizations (id, workos_org_id, name, slug, orgnr, contact_email)
VALUES ('org-seed-1', 'wos-seed-1', 'Eksempel Musikkorps', '${SLUG}',
        '923609016', 'post@eksempelkorps.example');
INSERT INTO membership_tiers (id, org_id, key, name, description, annual_fee_nok)
VALUES ('tier-1','org-seed-1','stottemedlem','Støttemedlem','Vanlig støttemedlemskap.',300),
       ('tier-2','org-seed-1','gullmedlem','Gullmedlem','For deg som vil gi litt ekstra.',1000);
SELECT o.slug, count(t.id) AS tiers FROM organizations o
  LEFT JOIN membership_tiers t ON t.org_id = o.id
  WHERE o.id = 'org-seed-1' GROUP BY o.slug;
" 2>&1 | grep -Ev '^(⛅|🌀|─|$)' | tail -12

# One supporting member who joined mid-year, so member-list screens have a
# realistic baseline: an ACTIVE agreement, a captured pro-rated charge, and the
# membership it bought. Fictitious identity — never a real supporter's, and
# never a real Vipps agreement id (`agr_seed…` matches nothing at Vipps).
pnpm exec wrangler d1 execute DB --local --command "
DELETE FROM membership_charges WHERE org_id = 'org-seed-1';
DELETE FROM memberships WHERE org_id = 'org-seed-1';
DELETE FROM membership_agreements WHERE org_id = 'org-seed-1';
DELETE FROM supporting_members WHERE org_id = 'org-seed-1';
INSERT INTO supporting_members (id, org_id, name, email, phone, vipps_sub)
VALUES ('mem-seed-1','org-seed-1','Kari Eksempel','kari@eksempel.example','4700000000','sub-seed-1');
INSERT INTO membership_agreements (id, org_id, member_id, tier_id, vipps_agreement_id, external_id,
                                   status, annual_fee_nok, vipps_sub, manage_token, activated_at)
VALUES ('agr-seed-1','org-seed-1','mem-seed-1','tier-1','agr_seed_1','stottemedlem:seed-1',
        'ACTIVE',300,'sub-seed-1','tok-seed-1', datetime('now'));
INSERT INTO memberships (id, org_id, member_id, agreement_id, tier_id, tier_name, period_year,
                         period_start, period_end, annual_fee_nok, paid_nok)
VALUES ('msh-seed-1','org-seed-1','mem-seed-1','agr-seed-1','tier-1','Støttemedlem',
        CAST(strftime('%Y','now') AS INTEGER), date('now'), strftime('%Y','now') || '-12-31', 300, 110);
INSERT INTO membership_charges (id, org_id, agreement_id, membership_id, vipps_charge_id, period_year,
                                type, status, amount_nok, due, captured_at)
VALUES ('chg-seed-1','org-seed-1','agr-seed-1','msh-seed-1','chr_seed_1',
        CAST(strftime('%Y','now') AS INTEGER),'INITIAL','CHARGED',110, date('now'), datetime('now'));
" >/dev/null 2>&1

echo "seeded 1 supporting member (Kari Eksempel, active this year)"

echo "seeded /bli-medlem/${SLUG} (2 tiers)"
