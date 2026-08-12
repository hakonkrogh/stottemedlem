# @stottemedlem/vipps

Typed client for the Vipps MobilePay APIs the product uses: **Access Token**,
**Recurring v3** (yearly agreements + charges), and **Webhooks v1**
(registration + HMAC verification of deliveries). Web-standard APIs only
(`fetch`, Web Crypto) — runs unchanged on Cloudflare workerd and Node ≥ 20.

Behavioural ground truth: [`docs/research/vipps-recurring-payments.md`](../../docs/research/vipps-recurring-payments.md).
How it maps onto the Worker: [`docs/architecture/overview.md`](../../docs/architecture/overview.md).

## Environments

Everything is built and verified against the **test environment** first:

| | base URL | token lifetime |
|---|---|---|
| test | `https://apitest.vipps.no` (`VIPPS_TEST_BASE_URL`) | 1 hour |
| production | `https://api.vipps.no` (`VIPPS_PROD_BASE_URL`) | 24 hours |

Same API surface, separate keys, no real money, no settlements. Test keys and
test users live in [portal.vippsmobilepay.com](https://portal.vippsmobilepay.com)
→ **For utviklere** (they appear once a product order that includes an API —
our *Faste betalinger* order — is submitted). End-to-end approval of test
agreements happens in the **MT (Merchant Test) app** with a test user.

## Usage

```ts
import { createVippsClient, VIPPS_TEST_BASE_URL } from "@stottemedlem/vipps";

const vipps = createVippsClient({
  baseUrl: VIPPS_TEST_BASE_URL,
  clientId, clientSecret, subscriptionKey,
  merchantSerialNumber: msn,
  tokenCache, // KV-backed in the Worker (see apps/backoffice/src/lib/vipps.ts)
});

const draft = await vipps.draftAgreement({ … }, idempotencyKey);
// send user to draft.vippsConfirmationUrl, then poll/await webhook
```

Amounts are **minor units (øre)**. Mutating Recurring calls require an
`Idempotency-Key` — pass a stable key derived from the local row so retries
deduplicate. Webhook deliveries are validated with `verifyWebhookDelivery`
(HMAC-SHA256 keyed with the per-registration secret returned once at
registration); `signWebhookDelivery` produces fixtures for tests.

## Smoke test (read-only)

Validates real test-environment credentials without creating anything:

```sh
pnpm --filter @stottemedlem/vipps build
pnpm --filter @stottemedlem/vipps run smoke
```

Reads `VIPPS_CLIENT_ID`, `VIPPS_CLIENT_SECRET`, `VIPPS_SUBSCRIPTION_KEY`,
`VIPPS_MSN` from the environment or `apps/backoffice/.dev.vars`, and refuses
to run against anything but `apitest.vipps.no`.
