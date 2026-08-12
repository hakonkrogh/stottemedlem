# Architecture overview

Status: proposal (2026-07-02). Derived from
[`docs/research/vipps-recurring-payments.md`](../research/vipps-recurring-payments.md)
and the product intent in [`specs/INDEX.md`](../../specs/INDEX.md).

## Goals and constraints

- **Cloudflare-only.** Every deployable runs on Cloudflare (Workers + platform
  services). No second cloud, no VPS.
- **Lightweight and static where possible.** The marketing site is a static
  Astro build; only the product app has a server.
- **One backend.** A single full-stack app serves the back office (admin
  dashboards for organizations), the HTTP API, **and** the Vipps webhook
  receiver — plus the scheduled jobs the Vipps integration requires. No
  separate webhook microservice.
- **WorkOS organizations gate the back office.** Launch with one WorkOS
  organization (ours, fully controlled) and add customer organizations later
  without re-architecting.
- **The local database is the system of record** (research finding 12): Vipps
  offers no all-statuses listing and no documented retention, and userinfo
  profile data is fetchable for only 168 hours after signup.

## System overview

```
                        ┌────────────────────────────────────────────────┐
   stottemedlem.no      │  apps/marketing — Astro, fully static          │
   (landing page)  ───► │  Cloudflare Worker: static assets only         │
                        └────────────────────────────────────────────────┘

                        ┌────────────────────────────────────────────────┐
   app.stottemedlem.no  │  apps/backoffice — Astro SSR, ONE Worker       │
                        │                                                │
   org admins ───────►  │  /…            back-office UI (WorkOS AuthKit, │
   (WorkOS AuthKit)     │                org-gated)                      │
   members ──────────►  │  /m/…          member self-service "Min side"  │
   (Vipps Login)        │                (merchantAgreementUrl target)   │
   Vipps ────────────►  │  /webhooks/vipps  HMAC verify → store → queue  │
                        │                                                │
                        │  scheduled()   renewal charges, reconciliation,│
                        │                retention                       │
                        │  queue()       webhook consumer (idempotent)   │
                        └──────┬─────────────┬───────────────┬───────────┘
                               │             │               │
                            D1 (SQL,      Queues          KV (Vipps
                            system of     (webhook        access-token
                            record)       processing)     cache)
                               │
                        Secrets Store / worker secrets
                        (WorkOS key, Vipps keys, cookie password)
```

Two deployables. Everything server-side lives in one Worker, which is exactly
what Cloudflare's model is good at: the same Worker exports `fetch`
(Astro-rendered UI + API + webhooks), `scheduled` (cron), and `queue`
(consumer).

## Deployables

### 1. `apps/marketing` — landing page

- **Astro, fully static** (`output: 'static'`, no adapter). Deployed as a
  Worker with [static assets](https://developers.cloudflare.com/workers/static-assets/)
  only — no server code, effectively free and unbreakable.
- Completely independent from the product app: own look, own deploy cadence,
  own domain (`stottemedlem.no`). The signup CTA links into
  `app.stottemedlem.no`.
- Static-first also keeps the door open for per-org public join pages later —
  but those need data, so they belong to the backoffice app, not here.

### 2. `apps/backoffice` — back office + backend + webhooks (one Worker)

- **Astro SSR** with the `@astrojs/cloudflare` adapter (v14, Astro 7). One framework
  across both apps, server-rendered dashboards with React islands only where
  interactivity is needed (tables, tier editor).
- **Custom worker entry** is the load-bearing trick. With adapter v13+/v14,
  `wrangler.jsonc#main` points at our own `src/worker.ts`, which re-exports
  Astro's request handler and adds the non-HTTP handlers:

  ```ts
  // apps/backoffice/src/worker.ts
  import { handle } from '@astrojs/cloudflare/handler';

  export default {
    fetch: (req, env, ctx) => handle(req, env, ctx),
    scheduled: (controller, env, ctx) => runCronJobs(controller, env, ctx),
    queue: (batch, env) => consumeVippsEvents(batch, env),
  } satisfies ExportedHandler<Env>;
  ```

  So webhooks, cron, and queue consumption ship in the same deploy as the UI —
  the "one single backend and back office application" shape, literally one
  Worker.
- **Route groups / auth surfaces** (two different populations, two different
  identity providers):
  - `/**` (admin): WorkOS **AuthKit** with the **Organizations** feature. A
    stottemedlem organization maps 1:1 to a WorkOS organization; session
    middleware requires an authenticated user with membership in the org whose
    dashboard is requested. Day 1: a single WorkOS org (ours). Later: customer
    orgs onboard without code changes. The WorkOS Node SDK is
    fetch/Web-Crypto-based and supports the Workers runtime.
  - `/m/**` (members): **Vipps MobilePay Login** (OIDC), as the Vipps docs
    recommend for the mandatory `merchantAgreementUrl` page (finding 4). This
    page must offer *actual* management (at minimum: stop; ideally: change
    tier) — it is a hard requirement for Norwegian merchants, so it is part of
    the v1 backoffice app, not a later add-on.
  - `/join/…` (public): the signup flow — pick tier → create agreement with
    initial charge → redirect to Vipps → land on a confirmation page that
    polls/waits for activation (never trust the redirect alone, finding 7).
  - `/webhooks/vipps` (Vipps only): HMAC-SHA256 signature verification,
    persist the raw event, enqueue, respond 2xx fast (Vipps retries on >10 s
    or non-2xx, finding 10).

### What about `apps/web` (Next.js)?

**Retired 2026-07-07** (was an empty scaffold). Next.js on Cloudflare requires
the OpenNext adapter — heavier build, more moving parts, and it bought us
nothing the Astro app doesn't already do. The member-facing surfaces (`/join`,
`/m`) live in `apps/backoffice`. If the
member/join surface ever deserves its own app (branding, scale), split it into
a third Astro app then — it talks to the same D1 database or to the backoffice
Worker over a service binding; the monorepo and Workers make that split cheap
later. Deciding it now would be premature.

## Cloudflare building blocks

| Need | Service | Notes |
|------|---------|-------|
| System-of-record DB | **D1** | SQLite; right-sized for small-org membership volumes. Drizzle ORM + migrations. One DB per environment. |
| Webhook processing | **Queues** | Receiver verifies + stores raw + acks; consumer updates domain tables. Gives retries, batching, and decouples Vipps' 10 s deadline from our processing. |
| Renewals & reconciliation | **Cron Triggers** | Daily renewal-charge job, nightly reconciliation poll, periodic retention job (all on the backoffice Worker's `scheduled` handler). |
| Vipps access-token cache | **KV** | Token per sales unit, TTL from `expires_in`. |
| Secrets | **Worker secrets / Secrets Store** | WorkOS API key + client ID, session cookie password, our Vipps API keys. Per-org Vipps credentials and per-registration webhook secrets are *data*, not config → encrypted columns in D1. |
| Static hosting | **Workers static assets** | Both apps; marketing is assets-only. |
| Durable multi-step jobs | **Workflows** (later) | If renewal orchestration outgrows idempotent cron + queue, per-membership Workflows give durable retries per step. Not needed for v1. |

Explicitly **not** used: Pages (Workers static assets is the current
recommendation), Durable Objects (no per-entity coordination need yet),
Hyperdrive (no external DB — Cloudflare-only).

## Vipps integration — how the research maps onto the Worker

All Vipps API access goes through a shared typed client (`packages/vipps`).
Key flows, each tied to the findings that dictate its shape:

1. **Signup** (`/join`): create agreement `{interval: YEAR/1, pricing: LEGACY}`
   with tier price + initial charge for year 1; request profile scopes and
   persist name/email/phone immediately (168 h window); activate the
   membership only on `recurring.agreement-activated.v1` or polling to a final
   state (findings 1, 7, 12).
2. **Webhooks** (`/webhooks/vipps` → Queue): register per MSN for all 4
   agreement + 6 charge events; verify HMAC per delivery; consumers are
   idempotent (at-least-once delivery) and update
   `agreements`/`charges`/membership periods transactionally (findings 6, 10).
3. **Renewals** (cron, daily): find membership periods with an anniversary
   ~35 days out and no renewal charge; create `DIRECT_CAPTURE` charge with
   `retryDays ≥ 2` (we'll start at 7), `Idempotency-Key` + `externalId` = local
   period id (findings 2, 3, 8).
4. **Tier change** (admin UI / member Min side): PATCH the agreement's
   `pricing.amount` + `productName` effective next renewal; notify the member
   ourselves; never stop-and-recreate (finding 9).
5. **Cancellation**: `recurring.agreement-stopped.v1` (check `actor`) → member
   lapses at period end; the Min side page exposes stop as well (findings 4, 5).
6. **Reconciliation** (cron, nightly): poll non-final agreements/charges and
   diff against D1 — webhooks primary, polling fallback (finding 6).
7. **Retention** (cron): keep charge/payment records 5 years (bokføringsloven);
   anonymize other personal data of lapsed members per the split in finding 12.

## Data model sketch (D1)

Multi-tenant from day one — every row hangs off an organization:

- `organizations` — 1:1 with a WorkOS organization id; Vipps sales-unit config
  (MSN, encrypted API keys, webhook registration id + encrypted secret).
- `tiers` — per-org membership tiers (name, yearly amount).
- `members` — person + consented profile data captured at signup.
- `memberships` / `membership_periods` — the year-by-year historical record
  (the admin "backtracking" view survives anonymization of profile data).
- `agreements`, `charges` — local mirror of Vipps state, updated by the queue
  consumer; `external_id` links back to our rows.
- `webhook_events` — raw event log, unique on a dedupe key; processing is
  idempotent replay from here.

## Environments

| | Vipps | Cloudflare | WorkOS |
|---|---|---|---|
| **staging** | `apitest.vipps.no`, test sales unit, MT app | wrangler env `staging`: own D1/KV/Queue, `staging.app.…` | WorkOS staging environment |
| **production** | `api.vipps.no`, production keys from portal | default env, `app.stottemedlem.no` | WorkOS production |

Local dev: `wrangler dev` / `astro dev` with the CF platform proxy (local D1,
KV, Queues via Miniflare); Vipps test environment reached from local via a
tunnel when webhook delivery is needed (`cloudflared tunnel` or test-only
polling).

CI/CD: GitHub Actions running `pnpm turbo build` + `wrangler deploy` per app
(or Cloudflare Workers Builds git integration — decide when wiring CI).

## Monorepo layout (target)

```
apps/
  marketing/        # Astro static → CF Worker (assets only)
  backoffice/       # Astro SSR → one CF Worker (UI + API + webhooks + cron + queue)
packages/
  core/             # existing — pure domain logic (membership periods, tier rules)
  db/               # Drizzle schema, migrations, query helpers (D1)
  vipps/            # typed Vipps client: Recurring v3, Webhooks (register + HMAC
                    # verify), Login/userinfo, access-token handling
```

`packages/db` and `packages/vipps` are consumed only by `apps/backoffice`
today, but keeping them as packages keeps `core` pure, makes the Vipps client
independently testable against recorded fixtures, and pre-pays for any later
app split.

## Scaffolding plan

Ordered so each step lands green and deployable:

1. **`apps/marketing`** — ✅ done — `pnpm create cloudflare@latest` (Astro template,
   static). Wire into turbo/biome/tsconfig conventions; deploy a placeholder
   landing page. Smallest possible end-to-end Cloudflare deploy.
2. **`apps/backoffice` shell** — Astro + `@astrojs/cloudflare` (v14), ✅ done —
   `wrangler.jsonc` with `main: src/worker.ts` exporting `fetch`/`scheduled`/
   `queue` stubs; D1 + KV + Queue bindings declared; staging + prod envs.
3. **WorkOS AuthKit** — AuthKit redirect flow with the Node SDK in Astro
   middleware; session cookie; org-membership check; seed our own WorkOS
   organization. Admin shell now gated.
4. **`packages/db`** — Drizzle + D1 migrations for the data model above;
   local dev via platform proxy/Miniflare.
5. **`packages/vipps`** — ✅ done (2026-08-10) — access token handling (KV
   cache), Recurring v3 agreements/charges, webhook registration + HMAC
   verification, pointed at the Vipps **test** environment everywhere except
   production (`VIPPS_API_BASE_URL`). Vitest against recorded fixtures incl.
   the official docs' HMAC example. Live-key validation is a read-only smoke:
   `pnpm --filter @stottemedlem/vipps run smoke` — blocked until test keys
   appear in the portal (Faste betalinger order not yet submitted).
6. **Webhook path end-to-end** — `/webhooks/vipps` → `webhook_events` → Queue
   → consumer updates `agreements`/`charges`. Verified with Vipps test events.
7. **Signup flow** — `/join`: tier pick → agreement + initial charge →
   redirect → activation via webhook/poll → member + period rows. First real
   product behaviour: reconcile with `specs/` (use cases
   *join-as-supporting-member*, *set-up-supporting-membership*).
8. **Cron jobs** — renewal charge creation, nightly reconciliation (spec:
   *renew-annual-membership*).
9. **Back-office dashboards** — member list, period history, tier management
   (spec: *curate-member-list*).
10. **Min side** — Vipps Login + stop/change on `/m`, set as
    `merchantAgreementUrl`. Required before production onboarding.
11. **Retire `apps/web`** — ✅ done (2026-07-07, retired early: it was an empty
    scaffold with nothing to migrate).

Steps 1–6 are pure infrastructure (spec-neutral, noted as such for the spec
harness); product behaviour starts at step 7, where spec sync kicks in.

## Open decisions

- **Domains**: actual domain names/zone; assumed `stottemedlem.no` +
  `app.stottemedlem.no` above.
- **Per-org Vipps credentials**: v1 stores each org's own sales-unit keys
  (encrypted, D1). If stottemedlem becomes a true multi-tenant platform, the
  Vipps **partner-key** model (one credential set + `Merchant-Serial-Number`
  header per org) is the scalable path — revisit at customer #2.
- **Workflows vs cron+queue** for renewals: start simple; adopt Workflows if
  renewal orchestration accumulates multi-step failure handling.
- **CI**: GitHub Actions vs Cloudflare Workers Builds.
