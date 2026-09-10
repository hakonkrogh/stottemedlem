# Go-live readiness: can we run real money in production?

The single answer to "how is testing standing, are we ready for live testing?".
Before this doc existed (2026-09-08) that question cost a full session of
re-assembly from four places: the go-live paragraph in `SKILL.md`, the rig's
limitation section in `vipps-test-rig`, `git log`, and live probes against the
deployed envs. One of those sources was a month stale.

**Every line below carries the command that re-checks it. Re-run, do not trust
the date.** Assessed 2026-09-08.

## 1. The automated checks (green)

```
pnpm install        # a fresh worktree has NO node_modules; do this first
pnpm test           # 189 tests, 12 tasks, all pass
pnpm typecheck      # 0 errors, but FIRST: cp apps/backoffice/.dev.vars.example \
                    #   apps/backoffice/.dev.vars, or the backoffice drowns in
                    #   bogus "does not exist on type 'Env'" (CI does the same)
pnpm lint           # 0 errors, ~520 warnings (the known .astro false positives;
                    #   the count only drifts up, and `pnpm lint` still exits 0)
```

Run all three from the REPO ROOT, never piped into `head`/`tail` (you read the
pager's exit code, not the check's). See the Run/build/test section of
`SKILL.md`.

## 2. What the unit tests do NOT prove

All 189 tests live in `packages/`: core 62, db 47, qr 26, email 25, vipps 16,
log 13. **`apps/backoffice` has zero tests**, and that is where the Worker,
middleware, routes, webhook handler, cron and queue consumer live. Nothing
automated covers a route, an auth gate, a webhook delivery or a cron run.

```
find apps packages -name "*.test.ts" -not -path "*/node_modules/*"
```

That gap is covered by hand instead, through `vipps-test-rig`,
`verify-public-routes`, `drive-page` and `cloud-logs`. They have proven a lot,
but nothing re-runs them on a change. Treat a green `pnpm test` as proof about
the packages only.

CI (`.github/workflows/ci.yml`) runs test + typecheck + build + lint on every PR
and on main, but **`main` is not branch-protected**, so CI is advisory: a red PR
still merges.

```
gh api repos/hakonkrogh/stottemedlem/branches/main/protection   # 404 = unprotected
```

## 3. Production is provisioned

Both backoffice envs are deployed and every secret is set. Corrects the
long-standing "Still unset on prod: WorkOS client id var + secrets" note, which
was true 2026-08-12 and false by 2026-09-08.

```
cd apps/backoffice && npx wrangler secret list                 # production
cd apps/backoffice && npx wrangler secret list --env staging
```

Production holds `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD`, `RESEND_API_KEY`,
`SENTRY_DSN`, `SENTRY_AUTH_TOKEN`; staging the same minus `SENTRY_AUTH_TOKEN`.
Both `WORKOS_CLIENT_ID` vars are filled in `wrangler.jsonc`. Vipps keys are
per-org in WorkOS Vault since 2026-08-18, never Worker secrets, so they never
appear in either list.

## 4. Production data state

One real organization is onboarded (name and ids withheld from committed docs on
purpose), DPA accepted 2026-08-31, one 300 kr tier, and **0 members, 0
agreements, 0 charges: no real money has ever moved through production.**

```
.claude/skills/verify-public-routes/d1.sh \
  "SELECT (SELECT count(*) FROM supporting_members) AS members,
          (SELECT count(*) FROM membership_agreements) AS agreements,
          (SELECT count(*) FROM membership_charges) AS charges,
          (SELECT count(*) FROM membership_tiers) AS tiers" production
```

The public join page is live and serves a working Vipps button:

```
curl -s -L https://app.xn--stttemedlem-hgb.no/bli-medlem/<slug> \
  | grep -o "Bli støttemedlem med Vipps"
```

## 5. The ledger

**Rehearsed end to end** on apitest/staging: join, approve, capture, member
created; mid-period stop; renewal and lapse under a real failing payment;
reconcile; webhook signature, tamper and unknown-org contracts; refund; erasure.
Details and agreement ids in `vipps-test-rig`.

**Still open** (assessed 2026-08-28, revised 2026-09-02, re-checked 2026-09-08):

| # | Gap | Closable where |
|---|-----|----------------|
| 1 | ~~Card shows lapsed for a member mid-retry~~ CLOSED 2026-09-08 (§6) | done |
| 2 | Real Vault key reads (local always falls back to `.dev.vars`) | production only |
| 3 | Deployed cron actually firing | production only |
| 4 | One scheduled run auto-registering the org webhook + a genuine delivery | production only |
| 5 | One real-money join + stop | production only |
| 6 | In-window renewal arrangement, double-arrange guard, turn-of-year flip | December, or staging's iso-week clock |
| 7 | Rejoin-after-stop; live lapse flip in the member list | apitest |
| 8 | Nobody has read a real receipt in a real inbox (see §7) | needs a real address |

Group 2 to 5 **cannot be closed before going live**, which is the argument for a
controlled live test (one org, a handful of real supporters) rather than more
rehearsal.

## 6. The card grace bug: CLOSED 2026-09-08

Was: `findMemberCardByToken` derived status from bare `membershipStatus`, so a
member mid-retry in January got a **lapsed card** while the member list had them
active. One membership, two answers.

Now: the card reports `membershipStanding` like every other surface, and names
the period the renewal is being taken for (`coveredPeriod`, exposed on
`MemberCard` as `coveredPeriodYear`) rather than the year that just ended, so it
cannot say "Gyldig 2026" in January 2027. `listMembersForPeriod` keeps the bare
`membershipStatus` on purpose: it answers "is this named period current", not
"how does this member stand today", and nothing calls it.

Rehearsed locally against real HTTP rather than only unit-tested, and
`verify-public-routes`'s `renew.sh` now loads each state for you, so re-checking
it is three commands (dev server on 4322, `dev-logs/devlog.sh start`):

```
R=.claude/skills/verify-public-routes/renew.sh
bash .claude/skills/verify-public-routes/seed.sh
for s in retrying failed done undo; do bash $R $s >/dev/null
  curl -s localhost:4322/medlemsbevis/kort-seed-1/kort.svg \
    | grep -oE "STØTTET T.O.M.|GYLDIG|>20[0-9][0-9]<" | tr '\n' ' '; echo " <- $s"
done
```

Expected: `retrying` GYLDIG 2026, `failed` STØTTET T.O.M. 2025, `done` GYLDIG
2027, `undo` back to the seed. `retrying` is the state the bug lived in.

## 7. The member-facing half is structurally untested

Vipps portal test users carry `test.generated@vippsmobilepay.com`, so every
receipt and notice sends successfully (Resend accepts it, `member_notices`
records the row) and reaches nobody. **The rig cannot validate the member-facing
half of any flow**: receipt, fee-change notice, card image. To see one, point a
member row's email at a real address first. Full reasoning in `vipps-test-rig`,
"What the MEMBER actually receives".

## 8. Recommended order before flipping the switch

1. ~~Fix gap 1 (the card grace).~~ Done 2026-09-08.
2. Point one member row at a real inbox and read the receipt (gap 8).
3. Turn on branch protection so CI stops being advisory.
4. Then run the controlled live test, which closes gaps 2 to 5 by definition.
