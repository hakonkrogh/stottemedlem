#!/usr/bin/env bash
# One member's whole money-and-told-them history, as one timeline.
#
# "Did this member renew, and were they told?" is the question every payment
# support thread turns into, and answering it by hand costs four hand-written
# joins, one of which fails, because `membership_charges` has NO `member_id`
# (it hangs off `agreement_id`) and `member_notices` has no `updated_at`.
# This does the joins once and merges agreements, charges and notices into a
# single chronological list, so the gap ("charge captured, no receipt row")
# is visible instead of being reconstructed.
#
#   bash .claude/skills/verify-public-routes/trace-member.sh <selector> [local|staging|production]
#
# The selector is whatever you happen to be holding:
#   b9583912-dd28-4c61-8c2b-3bc71553636c        a supporting_members.id
#   cccb4d1ba76bee4a6f07faa823aaa54c            a card token (32 hex)
#   d8ac214c-03c8-48e2-b74a-10c32816af62        an agreement manage token
#   .../o/<slug>/medlemmer/<id>                 a backoffice member URL
#   .../bli-medlem/<slug>/min-side?n=<token>    a min-side URL
#   agr_zZgKa6c / chr-39Pr3JA                   a Vipps agreement or charge id
#   +4791424204 / 4791424204 / an email         a phone or email
#
# Read-only: it goes through d1.sh, which refuses anything but SELECT off local.
set -euo pipefail

RAW="${1:?usage: trace-member.sh <member id|card token|manage token|URL|vipps id|phone|email> [local|staging|production]}"
WHERE="${2:-local}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
d1() { bash "$HERE/d1.sh" "$1" "$WHERE"; }

# A URL is the common case (it is what a person pastes), so reduce it first:
# min-side carries the manage token in ?n=, every other page ends in the id.
SEL="$RAW"
case "$SEL" in
  *[?\&]n=*) SEL="${SEL##*[?\&]n=}"; SEL="${SEL%%&*}" ;;
  http*|/*) SEL="${SEL%%\?*}"; SEL="${SEL%/}"; SEL="${SEL##*/}" ;;
esac
# SQL is built by substitution, so allow only what these identifiers can hold.
case "$SEL" in
  *[!A-Za-z0-9_.@+-]*) echo "Refusing selector '$SEL': unexpected characters." >&2; exit 1 ;;
esac

# Every way in, resolved in one pass: whichever column matches wins. Phone is
# matched on the last 8 digits so +47-prefixed and bare forms both land.
DIGITS="$(printf '%s' "$SEL" | tr -cd '0-9')"
TAIL8="${DIGITS: -8}"
MEMBER_ID="$(d1 "SELECT DISTINCT m.id FROM supporting_members m
  LEFT JOIN membership_agreements a ON a.member_id = m.id
  LEFT JOIN membership_charges c ON c.agreement_id = a.id
  WHERE m.id = '$SEL' OR m.card_token = '$SEL' OR m.email = '$SEL'
     OR a.manage_token = '$SEL' OR a.vipps_agreement_id = '$SEL'
     OR a.external_id = '$SEL' OR c.vipps_charge_id = '$SEL' OR c.external_id = '$SEL'
     OR (length('$TAIL8') = 8 AND m.phone LIKE '%$TAIL8')" |
  node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{
    const rows=JSON.parse(s);
    if(rows.length!==1){console.error(rows.length?`Ambiguous: ${rows.length} members match.`:"No member matches that selector.");process.exit(1)}
    console.log(rows[0].id)})')"

echo "== member ($WHERE) =="
d1 "SELECT m.id, m.name, m.email, m.phone, m.vipps_sub, m.created_at, m.anonymized_at,
      o.slug AS org, o.name AS org_name
    FROM supporting_members m JOIN organizations o ON o.id = m.org_id
    WHERE m.id = '$MEMBER_ID'"

echo
echo "== memberships =="
# `valid_until` is DERIVED from period_year, never a column. Asking for it is
# how this script first failed (2026-09-08). period_end is the stored truth.
d1 "SELECT period_year, tier_name, period_start, period_end, annual_fee_nok, paid_nok
    FROM memberships WHERE member_id = '$MEMBER_ID' ORDER BY period_year"

echo
echo "== timeline =="
# Merged in node, not in SQL: D1 caps the number of arms in a compound SELECT
# ("too many terms in compound SELECT", hit at 7 UNION ALLs on 2026-09-08), so
# the three tables are read separately and interleaved here. Timestamps come in
# two shapes ('2026-08-27 08:55:26' from a D1 column default, and
# '2026-08-27T08:58:14.421Z' from application code) which sort against each
# other wrongly, so every one is normalised to 'YYYY-MM-DD HH:MM:SS' first.
# A charge's `due` is a bare date and sorts at its midnight.
AGREEMENTS="$(d1 "SELECT id, vipps_agreement_id, annual_fee_nok, status, created_at, activated_at, stopped_at
  FROM membership_agreements WHERE member_id = '$MEMBER_ID'")"
CHARGES="$(d1 "SELECT c.id, c.vipps_charge_id, c.type, c.status, c.amount_nok, c.period_year,
    c.due, c.created_at, c.captured_at, c.failure_reason
  FROM membership_charges c JOIN membership_agreements a ON a.id = c.agreement_id
  WHERE a.member_id = '$MEMBER_ID'")"
NOTICES="$(d1 "SELECT id, kind, fee_nok, previous_fee_nok, charge_id, sent_at
  FROM member_notices WHERE member_id = '$MEMBER_ID'")"

AGREEMENTS="$AGREEMENTS" CHARGES="$CHARGES" NOTICES="$NOTICES" node -e '
  const at = (v) => (v ? String(v).slice(0, 19).replace("T", " ") : null);
  const ev = [];
  const push = (when, what, detail) => { if (when) ev.push({ at: when, what, detail }); };

  for (const a of JSON.parse(process.env.AGREEMENTS)) {
    push(at(a.created_at), "agreement drafted", `${a.vipps_agreement_id}  ${a.annual_fee_nok} NOK  [${a.id}]`);
    push(at(a.activated_at), "agreement ACTIVE", a.vipps_agreement_id);
    push(at(a.stopped_at), "agreement STOPPED", a.vipps_agreement_id);
  }
  for (const c of JSON.parse(process.env.CHARGES)) {
    const money = `${c.vipps_charge_id}  ${c.amount_nok} NOK`;
    push(at(c.created_at), `charge created (${c.type})`, `${money}  due ${c.due}  period ${c.period_year}`);
    push(`${c.due} 00:00:00`, "charge DUE", money);
    push(at(c.captured_at), `charge ${c.status}`, money + (c.failure_reason ? `  ${c.failure_reason}` : ""));
  }
  for (const n of JSON.parse(process.env.NOTICES)) {
    const fee = n.previous_fee_nok ? `${n.previous_fee_nok} -> ${n.fee_nok} NOK` : `${n.fee_nok ?? "?"} NOK`;
    push(at(n.sent_at), `NOTICE SENT (${n.kind})`, fee + (n.charge_id ? `  for charge ${n.charge_id}` : ""));
  }

  ev.sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : x.what < y.what ? -1 : 1));
  for (const e of ev) console.log(`${e.at}  ${e.what.padEnd(26)} ${e.detail ?? ""}`);

  // The whole point of merging notices INTO the payment timeline: a capture
  // with no receipt after it is the failure this script exists to surface.
  const told = new Set(JSON.parse(process.env.NOTICES).map((n) => n.charge_id).filter(Boolean));
  const silent = JSON.parse(process.env.CHARGES)
    .filter((c) => c.captured_at && !told.has(c.id))
    .map((c) => c.vipps_charge_id);
  console.log("");
  console.log(silent.length
    ? `!! captured with NO receipt notice: ${silent.join(", ")}`
    : "ok: every captured charge has a receipt notice.");
'
