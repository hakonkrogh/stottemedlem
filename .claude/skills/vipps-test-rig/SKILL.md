---
name: vipps-test-rig
description: Drive a REAL Vipps recurring subscription against apitest from the CLI — draft agreement, approve in the Merchant Test app, poll, userinfo, charges, renewal, refunds, webhooks, stop — plus a local receiver for the three URLs Vipps calls back into. The only real proof payment code works; unit tests and typecheck prove nothing about Vipps. Use for any Recurring/webhook/agreement work.
---

# Vipps recurring test rig

The tool ships with the project (`packages/vipps/scripts/`), so this skill is
how to drive it. Full runbook, prerequisites and troubleshooting:
**`docs/vipps-local-recurring-test.md`** (canonical — read it before a first run).

Test environment only: both scripts refuse `api.vipps.no`.

## Drive it

```sh
alias vt="pnpm --filter @stottemedlem/vipps run recurring-test"

vt help                    # every command + flag
vt webhooks register       # all 10 recurring events → <tunnel>/webhook, saves the secret
vt agreement --amount 250  # yearly LEGACY agreement + first-year charge; prints URL + QR
vt confirm                 # reprint the approval URL + QR (drafting again orphans the old one)
vt status --watch          # polls until it leaves PENDING (approve in the MT app first)
vt userinfo                # consented name/email/phone — 168-hour window
vt charges                 # INITIAL charge, then any renewal
vt charge --days 1         # next year's charge, rehearsed one day out
vt agreements              # list agreements by --status (default ACTIVE) — finds an old
                           #   approved agreement without a new phone approval
vt idempotency             # Idempotency-Key retention probe: first run creates a charge
                           #   and saves body+key; each later run replays the identical
                           #   request — same chargeId back = key still honoured. Replays
                           #   accumulate in state; a duplicate is cancelled on the spot.
                           #   --fresh new probe · --cleanup cancel probe charge + clear
vt refund                  # give a CHARGED charge's money back — the real proof of
                           #   specs/use-cases/refund-a-payment.md. Whole captured amount
                           #   by default (all the product ever offers); --amount <NOK>
                           #   rehearses the PARTIAL refund only Vipps' portal can make,
                           #   which must NOT revoke the membership. Prints the charge's
                           #   status + summary read back AFTER (the refund answers 204
                           #   with no body). Does NOT stop the agreement — run `stop` too,
                           #   as the product's own action does.
vt stop                    # merchant-side stop (irreversible)
vt state | vt reset        # saved ids (packages/vipps/.vipps-test-state.json, gitignored)
```

## Test the product's own webhook route without waiting for a payment

```sh
vt deliver --to http://localhost:4322/api/vipps/<org-slug> \
           --agreement <id> --charge <id> [--event recurring.charge-captured.v1]
vt deliver --to ... --tamper      # one byte off the signature — MUST be refused
```

Signs the event exactly as Vipps does (same code path the receiver verifies
with) and posts it. The secret comes from the last `webhooks register`, or
`--secret`, or `VIPPS_WEBHOOK_SECRET`. Expected: **200** genuine, **401**
tampered, **404** unknown organization. Point `--to` at `localhost:4322`
rather than the tunnel when you only want to exercise the route — it avoids
the DNS artifact below entirely.

```sh
```

Every command takes `--agreement <id>`; without it the last drafted one is used.
Credentials come from `apps/backoffice/.dev.vars` (`VIPPS_CLIENT_ID`,
`VIPPS_CLIENT_SECRET`, `VIPPS_SUBSCRIPTION_KEY`, `VIPPS_MSN`). **The file is
gitignored and worktrees don't inherit it** — a fresh worktree has no
credentials anywhere (verified 2026-08-25: absent from every checkout on this
machine); ask the user to drop the file in before planning any live run. The
state file (`.vipps-test-state.json`) is per-worktree too, so saved
agreement/webhook ids from other sessions are gone — `vt agreements` finds a
still-ACTIVE agreement without a new phone approval. Credentials-only
check, creates nothing: `pnpm --filter @stottemedlem/vipps run smoke`.

## The two background processes

```sh
pnpm --filter @stottemedlem/vipps run recurring-test listen   # terminal 1, port 8788
pnpm --filter @stottemedlem/vipps run tunnel                  # terminal 2
```

`listen` serves the three URLs Vipps needs, and logs each delivery with
`✓ verified` / `✗ SIGNATURE FAILED`:

| path | is |
|------|----|
| `/webhook` | HMAC-verified receiver (401 on a bad signature → Vipps retries) |
| `/min-side` | `merchantAgreementUrl` — mandatory for Norwegian merchants, and it must really stop the agreement |
| `/retur` | `merchantRedirectUrl` landing page |

`tunnel` runs a cloudflared quick tunnel (no account) and writes its origin to
`.vipps-tunnel` at the repo root, where the harness reads it; it is deleted on
exit. **The URL is new on every restart — re-register the webhook after each**
(`vt webhooks list` to find stale registrations, `vt webhooks delete <id>`).

## Fire a nightly job (reconcile, reprice, renewal charges)

```sh
bash .claude/skills/vipps-test-rig/cron.sh "0 2 * * *"    # reconcile + reprice
bash .claude/skills/vipps-test-rig/cron.sh "0 4 * * *"    # reprice + renew
```

Builds, runs the real Worker under `wrangler dev --test-scheduled`, triggers
the cron, prints the job's own log lines, tears down. **`astro dev` cannot
reach `scheduled` at all** — Vite serves only the fetch handler, so the jobs
look fine while being completely untested.

Same local D1 as the dev server: seed first (`verify-public-routes/seed.sh`),
inspect after with `d1.sh`. The jobs call the REAL Vipps test environment, so a
reprice really does change the price in the test user's app.

To see a job do something, create drift first — set an agreement's
`annual_fee_nok` away from its tier's, then fire `0 2 * * *`; expect
`repriced 1, failed 0`. A seeded agreement whose id is not real at Vipps
(`agr_seed_1`) is a useful failure case: expect `repriced 0, failed 1` and the
run continuing, since one member's failure must never stop the rest.

### Prove reconciliation, without waiting for a webhook to get lost

The whole point of the 02:00 job is recovering a payment nobody told us about,
so test it by *never telling it*: point a local row at a REAL agreement and let
the job discover everything itself.

```sh
# a tier priced at what the real agreement actually costs, so the reprice step
# that runs right after finds no drift and leaves the live agreement alone
# from apps/backoffice; bare `wrangler` is not on PATH — use pnpm exec
pnpm exec wrangler d1 execute DB --local --command "
  INSERT OR REPLACE INTO membership_tiers VALUES ('tier-live','org-seed-1','live-test','Livetest',NULL,250,NULL,datetime('now'));
  INSERT OR REPLACE INTO membership_agreements
    (id,org_id,member_id,tier_id,vipps_agreement_id,external_id,status,annual_fee_nok,vipps_sub,manage_token,created_at,last_reconciled_at)
  VALUES ('agr-live-1','org-seed-1',NULL,'tier-live','<REAL agreement id>','<its externalId>','PENDING',250,NULL,'tok-live-1',datetime('now'),NULL);"
bash .claude/skills/vipps-test-rig/cron.sh "0 2 * * *"
```

Verified 2026-08-21 against a real agreement with two captured charges whose
webhooks were never received: `reconciled 1 — 1 agreement(s), 0 charge(s)
corrected, 2 unknown, 1 failed`, and D1 then held the member (from userinfo),
both charges CHARGED, and the 2026 membership. A second run reported all
zeroes — idempotent. Set a charge back to `PENDING` and re-run to see
`1 charge(s) corrected`; that path is picked by the *due-and-unheard* priority,
not the rotation, so it fires even with `last_reconciled_at` set far in the
future.

**Set the agreement's `annual_fee_nok` equal to its tier's fee, or the reprice
step two lines later really will change the price in the test user's app.**
Clean up the seeded rows afterwards.

## Gotchas found the hard way

- **`curl` inside the agent sandbox cannot resolve `*.trycloudflare.com`**
  ("Could not resolve host"), even though `dig` answers and the tunnel is live.
  To prove the tunnel really serves: `dig +short <host>` then
  `curl --resolve <host>:443:<ip> https://<host>/min-side`. WebFetch fails the
  same way — this is a sandbox DNS artifact, not a broken tunnel.
- **`400 … "The URL and/or hostname you provided is not allowed"` on
  `webhooks register` is usually TRANSIENT, not an allowlist.** Vipps checks
  that the receiver URL resolves, and a just-created quick-tunnel hostname
  isn't in public DNS yet. Verified 2026-08-20 by probing after a few seconds:
  `*.trycloudflare.com`, `*.ngrok-free.app` and our own
  `staging.app.xn--stttemedlem-hgb.no` were all accepted, with all ten events.
  Wait a moment after the tunnel prints its URL, then register again — don't go
  build a named tunnel over this.
- **The approval URL expires in ~10 minutes** (the deeplink JWT carries
  `exp = iat + 600`). Draft the agreement when the phone is already in hand;
  `vt confirm` reprints the QR while it lasts, and after that only a fresh
  `vt agreement` helps. The stale PENDING agreement is harmless.
- **The cron trigger path is `/cdn-cgi/handler/scheduled`, not `/__scheduled`.**
  The latter falls through our custom fetch handler into a `/login` redirect
  (302) — indistinguishable from a cron that ran and found nothing to do.
- **The redirect never proves activation.** `PENDING` right after the redirect
  is normal; only the webhook or polling confirms ACTIVE. Product code must
  behave the same.
- **Vipps auto-charges nothing.** Every renewal charge is created by us; a
  created charge stays PENDING/DUE until its due date (min 1 day out).
- **Cancel every charge you create, before ending the session.** The test
  agreement is shared across sessions/worktrees, and a leftover DUE charge
  WILL capture on its due date — and trips the duplicate-renewal alarm for
  whoever reconciles next (found live 2026-08-27: a stray 1.51 NOK charge
  from an unknown earlier run). `vt charges` to list, `vt cancel-charge
  --charge <id>`. This is also how to PROVE the duplicate alarm: create a
  second money-taking RECURRING charge for a period, fire the 02:00 cron,
  expect `DUPLICATE RENEWAL on <agreement>` + `duplicateRenewals: 1`; cancel
  it, re-fire, expect 0.
- **Refunds: two things the docs do NOT answer — settle them on the next live
  run.** (1) Whether a refund needs a positive settlement balance on the sales
  unit, and (2) what a `409` on `/refund` actually means (a second refund? an
  amount over what was captured?). Both are cheap to probe: `vt refund` twice
  on the same charge, and once with `--amount` above the captured sum. Write
  what you find into §13 of `docs/research/vipps-recurring-payments.md`.
  Known already: a `400` saying *"Refund is not possible"* means the sales unit
  uses the **single settlement** setup — refunds are impossible there at all.
- MT app approval needs a test user from portal → *For utviklere* → *Testbrukere*;
  the PIN in the MT app is **`1236`**.

## Grow it, don't one-off it

New surface (e.g. agreement listing) → add a command to
`packages/vipps/scripts/recurring-test.mjs` and a row here, so the next check is
an invocation rather than a throwaway script.

## Related
`stack-docs` (Vipps API mechanics, test-env facts) · `docs/research/vipps-recurring-payments.md`
(behaviour ground truth) · `verify-public-routes` (the public join pages Vipps' website
verification sees).
