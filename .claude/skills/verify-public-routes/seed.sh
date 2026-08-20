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

echo "seeded /bli-medlem/${SLUG} (2 tiers)"
