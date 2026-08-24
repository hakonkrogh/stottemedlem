# Testing a real Vipps recurring subscription locally

A rehearsal of the whole yearly-membership lifecycle against Vipps' **test
environment** (`apitest.vipps.no`), driven from the command line, with a real
phone approving a real agreement in the Merchant Test app:

```
agreement → approve in MT app → ACTIVE → userinfo → charges
          → next year's charge → stop
```

Nothing here touches the product database or the back office. It is a rig for
exercising **Vipps itself** — proving the credentials, the yearly agreement
shape, the initial charge, the profile-data consent, the renewal charge, the
webhook signature, and the mandatory management page all behave as
[the research](research/vipps-recurring-payments.md) says, before the join
flow is built on top of them.

Everything runs against the test environment; the scripts **refuse** to run
against `api.vipps.no`.

## Prerequisites

| What | Where to get it |
|------|-----------------|
| **Test sales-unit keys** — client id, client secret, subscription key, MSN | portal.vippsmobilepay.com → **For utviklere**, on the *test* sales unit. A test sales unit is created automatically when the merchant submits an order for a product that includes an API. |
| **Merchant Test (MT) app** | iOS: [TestFlight](https://testflight.apple.com/join/hTAYrwea), no invitation code. Android: join the [Vipps MobilePay MT Google Group](https://groups.google.com/u/0/g/vipps-mobilepay-test-app), then install from Play Store with the same account. It coexists with the real Vipps app. |
| **A test user** | portal.vippsmobilepay.com → For utviklere → **Testbrukere**. Generates a random phone number and NIN — no personal data. In the MT app you log in with those, and the PIN is `1236`. |
| **cloudflared** | `brew install cloudflared` — a quick tunnel needs no Cloudflare account. |

Put the keys in `apps/backoffice/.dev.vars` (copy `.dev.vars.example`; the file
is gitignored):

```sh
VIPPS_API_BASE_URL="https://apitest.vipps.no"
VIPPS_CLIENT_ID="..."
VIPPS_CLIENT_SECRET="..."
VIPPS_SUBSCRIPTION_KEY="..."
VIPPS_MSN="..."
```

Sanity-check them before anything else — read-only, creates nothing:

```sh
pnpm --filter @stottemedlem/vipps run smoke
```

## Why a tunnel is needed

Vipps calls back into this machine three ways, and all three must be public
**HTTPS** — `localhost` is not an option:

| Callback | Served by the rig at |
|----------|----------------------|
| `merchantRedirectUrl` — where the member lands after approving | `/retur` |
| `merchantAgreementUrl` — the management page Norwegian merchants **must** provide, and it must offer actual management | `/min-side` (it can stop the agreement) |
| Webhook deliveries — the ten recurring events | `/webhook` (HMAC-verified) |

`scripts/tunnel.sh` starts a cloudflared quick tunnel to the local receiver and
writes its origin to `.vipps-tunnel` at the repo root, where the harness picks
it up. **The URL is new on every start**, and it is deleted when the tunnel
stops, so a stale URL can't silently send Vipps nowhere — re-register the
webhook after each restart.

## The run

Three terminals.

**1 — the receiver** (management page, redirect landing, webhook sink):

```sh
pnpm --filter @stottemedlem/vipps run recurring-test listen
```

**2 — the tunnel** (defaults to the receiver's port 8788):

```sh
pnpm --filter @stottemedlem/vipps run tunnel
```

**3 — the lifecycle.** All of these take `--agreement <id>`; without it they
use the last agreement drafted (ids are remembered in
`packages/vipps/.vipps-test-state.json`, gitignored).

```sh
alias vt="pnpm --filter @stottemedlem/vipps run recurring-test"

vt webhooks register      # all 10 recurring events → <tunnel>/webhook; saves the secret
vt agreement --amount 250 # draft a yearly agreement + first-year charge
```

`agreement` prints the confirmation URL **and a QR code** — scan it with the
phone running the MT app, log in as the test user, approve with PIN `1236`.
The phone lands on `/retur`, and the receiver logs the webhook deliveries as
they arrive.

```sh
vt status --watch    # polls until the agreement leaves PENDING → ACTIVE
vt userinfo          # the member's consented name / email / phone
vt charges           # the INITIAL charge for year one
vt charge --days 1   # next year's renewal charge, rehearsed one day out
vt charges           # it sits PENDING/DUE until its due date
vt stop              # merchant-side stop (irreversible)
```

### What to look for

- **`status` never becomes ACTIVE by redirect alone.** `PENDING` right after
  the redirect is normal — activation is confirmed by the webhook or by
  polling, which is exactly why the join flow must not trust the redirect.
- **`recurring.agreement-activated.v1` and `recurring.charge-captured.v1`**
  should appear in the receiver's log, each marked `✓ verified`. A
  `✗ SIGNATURE FAILED` line means the receiver answered 401 and Vipps will
  retry — see troubleshooting.
- **`userinfo` works for 168 hours only.** This is the window in which a
  member's name and contact details must be captured; after it, they are
  unreachable. Whatever the join flow needs, it must persist at signup.
- **A renewal charge is created, never automatic.** Vipps charges nothing on
  its own; `charge` is the manual rehearsal of the scheduled job the product
  will run ~30–35 days before each anniversary.
- **`/min-side` can stop the membership.** That is the requirement — a page
  that only explains how to contact support does not satisfy Vipps.

Vipps documents [special test amounts](https://developer.vippsmobilepay.com/docs/knowledge-base/test-environment/)
that force specific outcomes (e.g. insufficient funds), useful for rehearsing a
failed renewal with `vt charge --amount <n>`.

## Cleanup

```sh
vt stop                  # stop the agreement, if still active
vt webhooks list         # tunnel URLs pile up as registrations
vt webhooks delete <id>
vt reset                 # forget the saved ids
```

Stopping the tunnel removes `.vipps-tunnel`. The saved state file holds the
webhook secret — it is gitignored, delete it when done.

## Troubleshooting

| Symptom | Cause |
|---------|-------|
| `Vipps API … 401` on every call | Keys don't match the environment. Test keys only work against `apitest.vipps.no`, and the MSN must belong to the same sales unit. Re-run `pnpm --filter @stottemedlem/vipps run smoke`. |
| `✗ SIGNATURE FAILED` in the receiver | The registration secret in the state file isn't the one that signed the delivery — usually a registration from an earlier tunnel. `vt webhooks list`, delete the stale ones, register again. |
| No webhook deliveries at all | The tunnel restarted (new URL) after the registration, or the receiver isn't running. Re-register. |
| Agreement stuck `PENDING` | Not approved yet, or approved by a different test user. The confirmation URL expires — draft a new agreement. |
| `Refusing to run against https://api.vipps.no` | Intentional. This rig only ever talks to the test environment. |
| Renewal charge stays `PENDING` | Correct: charges are processed on their due date (minimum one day out), not when created. |

## What this does *not* cover

The rig deliberately stops at Vipps' edge. It creates no
[membership](../specs/concepts/membership.md), no
[supporting member](../specs/concepts/supporting-member.md), and no member
list — those land when the join flow is wired into the back office
(`specs/use-cases/join-as-supporting-member.md`), at which point the local
back office can reuse the same test sales unit through the `.dev.vars` keys
(see `apps/backoffice/src/lib/vipps.ts`) instead of the per-org keys in WorkOS
Vault.
