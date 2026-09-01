# Vipps MobilePay recurring payments for a yearly supporting membership

Research report — verified against the current (post-merger, 2025/2026) Vipps MobilePay
developer documentation for the **Recurring API v3**. Findings 1–8 survived a 3-vote
adversarial verification pass against primary sources on `developer.vippsmobilepay.com`;
findings 9–12 come from a targeted follow-up pass against the same official docs (single
verification, quotes checked against page content). Deprecated Vipps eCom / legacy
Recurring (v2) rules are explicitly excluded; one relevant recent change is called out
(charge lead time reduced from 2 days to 1 day in October 2025).

Research question: best practices for implementing recurring payments with Vipps
MobilePay for a **yearly** supporting-membership product ("støttemedlem") with multiple
tiers, for a Norwegian organization, with subscription management on the Vipps side as
much as possible and a webhook-synced merchant database (live subscriber view +
historical record).

---

## Executive summary

The Vipps MobilePay Recurring API v3 natively supports yearly billing: an agreement is
created with interval `{unit: "YEAR", count: 1}`, and the merchant then creates each
renewal charge explicitly — Vipps does not auto-charge. A renewal charge must be created
at least 1 day before its due date and can be created up to 2 years in advance; users see
the upcoming charge in the app up to 35 days before it is due, so creating the renewal
charge ~30+ days ahead is the practical best practice. Failed charges are retried
automatically by Vipps once per day for `retryDays` (0–14) after the due date, with an
official recommendation of at least 2 retry days. Subscription management is split: users
can stop agreements directly in the Vipps/MobilePay app (merchants **must** listen for
the `recurring.agreement-stopped.v1` webhook), but Norwegian merchants are additionally
**required** to provide a real HTTPS self-service management page at
`merchantAgreementUrl` — a link to a contact page is not enough. The recommended sync
architecture is webhooks as primary with polling as fallback; a completed charge
immediately triggers the Webhooks API and Report API, with settlement at T+2.

Tiers are modelled as `LEGACY` fixed-price agreements; a tier change at next renewal is
a `PATCH` of the agreement's `pricing.amount` (no user re-approval is triggered — the
merchant owns the notification). Ten recurring webhook event types (4 agreement + 6
charge) cover the full lifecycle. The merchant-side database must be the system of
record: Vipps offers no all-statuses agreement listing, documents no retention window,
and profile data from the userinfo consent is fetchable for only 168 hours after signup.
Vipps has no purpose-built product for yearly tiered memberships ("Faste donasjoner" is
monthly-only donations), so the raw Recurring API is the right foundation.

---

## Findings

### 1. Yearly billing is natively supported (interval unit `YEAR`) — HIGH confidence

- The Recurring API v3 agreement interval accepts `YEAR, MONTH, WEEK, DAY` with a count
  of 1–31; the OpenAPI schema (`Interval`) has `enum: [YEAR, MONTH, WEEK, DAY]`. The docs
  give an explicit yearly-subscription example using `{"unit": "YEAR", "count": 1}`
  (equivalent to `{"unit": "MONTH", "count": 12}`).
- "Users can be charged the full amount once every year, regardless of the day in the
  year. (E.g. first charge can be due on 2022-06-02 and second charge on any day in
  2023.)" The interval defines the *permitted cadence*; the merchant must still create
  each yearly charge via the charges endpoint — **Vipps does not auto-charge**.

Sources:
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-guide/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/how-it-works/charges/recurring-charges-howitworks/
- https://developer.vippsmobilepay.com/api/recurring/ (OpenAPI: `redocusaurus/recurring-swagger-id.yaml`)

### 2. Charge scheduling window: minimum 1 day, maximum 2 years ahead; ~30+ days is best practice — HIGH confidence

- A charge's `due` date "has to be minimum 1 day in the future (and maximum two years in
  advance)". Merchants can "create a charge until midnight before the due date"; the
  charge is processed on the due date.
- This is the **current** rule: the Recurring API changelog (October 2025) states
  "Changed the default lead time for recurring charge creation from 2 days to 1 day."
  Older docs describing a 2-day default with a 1-day allowlist are obsolete.
- Users see upcoming charges up to **35 days** before `due` in the app's Payments tab (a
  charge remains PENDING until `due` is less than 30 days away, then becomes DUE). For a
  yearly renewal, 1 day is the hard minimum, not the recommendation — creating the
  renewal charge ~30+ days ahead maximizes the user-visibility window.
- Practical implication: the next yearly renewal charge can be created at any point
  during the membership year (365 days ahead is well inside the 1-day-to-2-year window).

Sources:
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-guide/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/how-it-works/charges/recurring-charges-howitworks/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-faq/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-checklist/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-quick-start/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/CHANGELOG/
- https://developer.vippsmobilepay.com/api/recurring/

### 3. Failed renewals: Vipps retries daily per `retryDays` (0–14), recommend ≥ 2 — HIGH confidence

- "If a charge fails on due date the charge will be retried for the number of days
  specified in the `retryDays` field, with a maximum limit of 14 days." Retries run
  server-side on Vipps' side, once per day (attempts around 07:00 and 15:00 UTC); the
  charge stays in **DUE** during retries and moves to **FAILED** if the window passes
  without success.
- API reference: `retryDays` is `integer [0..14]`; "We recommend at least two days
  retry." The checklist adds: "The success rate of charges increases significantly when
  retryDays is set to two or more." The guide "strongly recommend[s] at least two days
  retry: `retryDays: 2`". Default is 14 for RECURRING charges when omitted.
- Merchants that want to own the failure/dunning flow can set `retryDays: 0` with
  `processingMode: "SINGLE_ATTEMPT"` and handle retries themselves.
- Vendor-stated (not independently verified) figures: automatic retries give "up to 12%
  better conversion" and "charge success rates can be as high as 96% or more". Treat as
  Vipps' own promotional statistics.
- For a yearly product, a reasonable grace policy: set `retryDays` high (e.g. 7–14),
  and only treat the membership as lapsed after the charge reaches FAILED.

Sources:
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-guide/
- https://developer.vippsmobilepay.com/api/recurring/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/how-it-works/charges/recurring-charges-howitworks/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-faq/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-checklist/

### 4. `merchantAgreementUrl` is a hard requirement for Norwegian merchants and must offer *actual* management — HIGH confidence

- OpenAPI field description (verbatim): "URL where we can send the customer to
  view/manage their subscription. Typically a 'My page' where the user can change, pause,
  cancel, etc. The page must offer actual management, not just information about how to
  contact customer service … Only HTTPS scheme is allowed. This URL is required for
  Norwegian Merchants." (Mandatory for Norwegian merchants; optional for FI/DK.)
- The checklist: "The merchant must have a way for the user to manage and stop their
  subscription in merchantAgreementUrl in their agreement." It must not point to the
  site's front page.
- Vipps MobilePay Login is recommended (over username/password) for authenticating users
  on this page.
- So even with maximal "manage it in Vipps" delegation, the merchant must still build a
  minimal authenticated self-service page that can at least stop (and ideally change) the
  membership.

Sources:
- https://developer.vippsmobilepay.com/api/recurring/ (OpenAPI `merchantAgreementUrl` description)
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-guide/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-checklist/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/how-it-works/payment-agreement/manage-payment-agreement-howitworks/

### 5. Users stop agreements in the app; merchants must handle `recurring.agreement-stopped.v1` — HIGH confidence

- Users can stop payment agreements directly in the Vipps/MobilePay app. "Merchants must
  listen to the `recurring.agreement-stopped.v1` webhook event." The webhook payload's
  `actor` field distinguishes MERCHANT / USER / ADMIN stops.
- When a **user** stops an agreement in the app: all DUE/PENDING charges are cancelled;
  existing RESERVED charges are *not* cancelled — the merchant chooses to capture or
  cancel the reservation. (For a **merchant-initiated** stop via
  `PATCH /recurring/v3/agreements/{id}`, DUE/PENDING/RESERVED are all cancelled — do not
  generalize the RESERVED-survives behavior to merchant-side stops.)
- Merchants with a Key Account Manager (KAM) can opt out of the in-app stop feature
  (the app then links users to the merchant's page instead); not available to self-serve
  merchants.

Sources:
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-guide/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-faq/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/how-it-works/payment-agreement/manage-payment-agreement-howitworks/
- https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/events/

### 6. Sync architecture: webhooks primary, polling fallback; charge completion triggers Webhooks + Report API, settlement at T+2 — HIGH confidence

- Checklist (verbatim): "Webhooks provide real-time updates. Use polling as a fallback
  mechanism to verify agreement and payment statuses if webhook delivery fails."
  Merchants should listen for agreement cancellations, agreement activations, and
  charge-related updates (successful or failed charges).
- FAQ: when a charge succeeds it is marked "Done" (FAQ shorthand for the formal charge
  state **CHARGED**) — "Done immediately triggers the Webhooks API and the Report API,
  and the settlement payout happens at T+2." "When a charge is completed the merchant is
  immediately notified using the Webhooks API, the charge details can be retrieved, and
  the settlement data is also available in the Report API."
- One step where the docs treat webhook and polling as equal alternatives: confirming an
  agreement after the user redirect (see finding 7) — "rely on either webhook or poll
  `GET /recurring/v3/agreements/{agreementId}`". Do not assume webhooks alone suffice
  there.
- This supports the desired design: a webhook-driven merchant DB as the live admin view
  (current subscribers) and historical record (lapsed members), with periodic
  reconciliation polling and the Report API for settlement/bookkeeping.

Sources:
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-checklist/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-faq/

### 7. Agreement lifecycle (v3): PENDING is non-final after redirect; with an initial charge, active only on successful payment — HIGH confidence

- The current API is **v3** (spec 3.2.3): agreements are drafted via
  `POST /recurring/v3/agreements`; the merchant stops one with
  `PATCH /recurring/v3/agreements/{agreementId}` and `"status": "STOPPED"` (irreversible).
- "Activation of the agreement is not guaranteed to be finished by the time the user is
  redirected back to the merchantRedirectUrl. The agreement could still have the status
  PENDING, so it is important to continue to poll the status of the agreement until a
  final status is returned by the API or use webhooks." Never activate a membership on
  redirect alone.
- With an upfront initial charge (natural for a yearly membership — first year paid at
  signup): "only on a successful payment of the initial charge, the agreement is deemed
  signed and active." (For RESERVE_CAPTURE initial charges, "successful payment" means
  the reservation succeeding; capture happens later.)

- **An agreement may be drafted with NO `initialCharge` at all — VERIFIED against
  apitest 2026-09-01.** `initialCharge` is optional in the v3 spec, but the docs only
  ever describe activation *with* one, so this was an assumption the product depended on
  and had never tested. `vt agreement --no-charge` drafted `agr_Xu7FEz2`: accepted, no
  charge id returned, and a valid approval deeplink issued. This is what lets a member
  resume inside a period they have already paid for without money moving and coming back
  (`specs/concepts/member-self-service.md`). Note what is still untested: that such an
  agreement goes ACTIVE on approval. Drafting is where a rejection would have happened,
  but the approval half needs the MT app.

Sources:
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-quick-start/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/how-it-works/payment-agreement/
- https://developer.vippsmobilepay.com/api/recurring/

### 8. Renewal charge creation parameters (v3): DIRECT_CAPTURE, retryDays; `orderId` is optional, Idempotency-Key required — HIGH confidence

- `POST /recurring/v3/agreements/{agreementId}/charges` takes `amount`, `description`,
  `due`, `retryDays`, and `transactionType` (enum `DIRECT_CAPTURE | RESERVE_CAPTURE`).
  The charge status is **PENDING** until processed.
- In v3, `orderId` is **optional** ("If provided, this will be the chargeId for this
  charge"); request idempotency is enforced via the required `Idempotency-Key` header
  (1–40 chars). `externalId` is available for mapping charges to the merchant's own
  subscription/member records — use it to link charges to member rows in the local DB.
- For a membership (a service delivered over the coming year, no shipment), plain
  `DIRECT_CAPTURE` renewal charges are the natural fit; RESERVE_CAPTURE's
  reserve-then-capture semantics matter mainly for goods.

Sources:
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-quick-start/
- https://developer.vippsmobilepay.com/api/recurring/

### 9. Tiers and price changes: LEGACY pricing + PATCH; no user re-approval; charge may deviate up to 5× — HIGH confidence

- `PATCH /recurring/v3/agreements/{agreementId}` can update `productName`,
  `productDescription`, `merchantAgreementUrl`, `externalId`, `pricing`, `interval`, and
  `status` (only to `STOPPED`; when stopping, no other changes are allowed in the same
  request).
- Pricing types: `LEGACY` (default) means "`pricing.amount` should represent the price
  that the user will pay every period" — the right model for fixed-price tiers.
  `VARIABLE` replaces the fixed price with a `suggestedMaxAmount` and lets the user set
  their own cap — meant for usage-based billing, not tiers. "Updating `amount` is only
  possible for agreements with `pricing.type:LEGACY`"; the pricing *type* of an existing
  agreement cannot be changed.
- **No user re-approval is triggered by a price update.** For LEGACY updates the docs
  only urge transparency: "Although there is *technically* no limit to what you can
  update the price to, we **strongly** recommend that you are as user-friendly as
  possible. Make sure the user understands any changes and is provided with updated
  information." (For `suggestedMaxAmount` updates: "The user will not be alerted by this
  change.") No Norwegian-law consent requirement for price changes appears anywhere in
  the official docs.
- A charge's `amount` "is flexible and does not have to match the `price` of the
  agreement", capped at **5× the agreement price** (error 70001 beyond that). So a tier
  change at next renewal can be done either by charging the new tier amount directly
  (if within 5×) or — cleaner — by PATCHing `pricing.amount` (and `productName`/
  `productDescription` to reflect the new tier) before creating the renewal charge.
- Stop-and-recreate is nowhere recommended in the docs and forces the member through a
  full new in-app approval; reserve it for cases where the agreement's pricing *type*
  must change.
- **All four tier fields change together in ONE PATCH on a LIVE agreement, and it stays
  ACTIVE — VERIFIED against apitest 2026-09-01.** The docs permit each field separately,
  which is not the same as accepting all of them in one request on a running agreement,
  and being wrong would leave a member mid-change. Driven with `vt retier` on an ACTIVE
  agreement: `productName`, `productDescription`, `externalId` and `pricing.amount` sent
  together, all four read back changed, `status` still `ACTIVE`, and the same agreement
  id throughout — the member keeps the arrangement they approved, its manage token and
  their own page. Restored to its original values afterwards. This is what
  `specs/use-cases/change-membership-tier.md` rests on.

Sources:
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-guide/ (sections "Update an agreement", "Legacy pricing")
- https://developer.vippsmobilepay.com/api/recurring/ (`UpdateAgreementPricingRequest`)
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/how-it-works/recurring-api-variable-howitworks/

### 10. Complete recurring webhook catalogue, registration, and delivery guarantees — HIGH confidence

- **Agreement events:** `recurring.agreement-activated.v1`,
  `recurring.agreement-rejected.v1`, `recurring.agreement-stopped.v1`,
  `recurring.agreement-expired.v1`. Payload fields: `agreementId`, `agreementUUID`,
  `agreementExternalId`, `eventType`, `occurred`, `actor` (MERCHANT/USER/ADMIN), `msn`.
- **Charge events (six):** `recurring.charge-reserved.v1`,
  `recurring.charge-captured.v1`, `recurring.charge-canceled.v1`,
  `recurring.charge-refunded.v1`, `recurring.charge-failed.v1`,
  `recurring.charge-creation-failed.v1`. Payload fields include `agreementId`,
  `chargeId`, `chargeExternalId`, `transactionId`, `amount`, `chargeType`
  (RECURRING/INITIAL/UNSCHEDULED), `amountCaptured`, `amountCanceled`, `amountRefunded`,
  `failureCode`, `failureReason`, `msn`.
- **Registration:** `POST /v1/webhooks` (prod `https://api.vipps.no/webhooks`, test
  `https://apitest.vipps.no/webhooks`) with an HTTPS, world-reachable `url` and an
  `events` array; scoped per sales unit via the `Merchant-Serial-Number` header; up to
  25 registrations per event type per MSN. The 201 response returns an `id` and a
  `secret` used for validation.
- **Signature validation:** HMAC-SHA256 keyed with the registration secret, over
  `POST\n<pathAndQuery>\n<x-ms-date>;<host>;<x-ms-content-sha256>`, delivered via the
  `Authorization: HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=…`
  header — verify on every delivery.
- **Delivery/retry:** Vipps retries when the receiver responds 4xx–5xx or does not
  respond within 10 seconds; exponential backoff for up to 7 days; a registration
  failing all deliveries for 2 weeks is automatically deleted. "The delivery order of
  failed webhook notifications is guaranteed per registered webhook." Retry-until-ack
  implies at-least-once delivery — consumers must be idempotent (the docs do not state
  "at-least-once" verbatim).
- **Polling guidance:** "Some APIs provide webhooks and callbacks, but you shouldn't
  rely on these alone if you need real-time data." For post-redirect confirmation the
  general guidance is start after 5 s, check every 2 s, back off on HTTP 429.

Sources:
- https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/events/
- https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/api-guide/
- https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/request-authentication/
- https://developer.vippsmobilepay.com/docs/knowledge-base/polling-guidelines/
- https://developer.vippsmobilepay.com/api/webhooks/

### 11. Onboarding for a Norwegian organization; no purpose-built Vipps product fits yearly tiered memberships — MEDIUM-HIGH confidence

- Onboarding: a Vipps MobilePay merchant agreement per country (Norwegian org.nr /
  Brønnøysund registration; KYC/KYB during order review), then a sales unit with an MSN.
  "Each sales unit has a unique set of API keys"; production keys live in
  portal.vippsmobilepay.com. "A test sales unit is automatically created when a merchant
  submits an order for a Vipps MobilePay product that includes an API" — test keys in
  the same portal, test server `https://apitest.vipps.no`, testing via the Merchant Test
  (MT) app with self-created test users.
- Recurring is a separate product on the sales unit (order via vippsmobilepay.com, or
  "Add" next to "Recurring Payments" on an existing online-payment sales unit) and
  **requires additional compliance checks** "beyond those required for the ePayment API,
  as mandated by financial regulatory authorities" — onboarding asks for estimated
  turnover, share of recurring, agreement lengths, and interval distribution.
- Listed pricing (2026, subject to change): Faste betalinger 2.99 % + 1 NOK per
  transaction; Donasjoner 1.99 % + 1 NOK. Reduced charity rates for organizations
  approved by Innsamlingskontrollen / members of Fundraising Norge are referenced by
  Vipps' own announcements but not confirmed on the current pricing page.
- **"Faste donasjoner" does not fit** — ruled out definitively in the dedicated deep
  dive below (Appendix A), which corrects some details of the first-pass finding: the
  product has more API surface than initially found, but is hard-blocked on yearly
  intervals and API-driven agreement/amount control.
- VAT: charitable/benevolent organisations are not required to register for VAT below
  NOK 140,000 turnover; membership fees covering the organization's ideal (non-profit)
  activity are generally outside VAT scope, but a støttemedlemskap that carries real
  countervalue can be assessed differently — case-specific, verify with an accountant.
  Gavefradrag (skatteloven § 6-50) applies only to gifts without countervalue to
  pre-approved organizations (min NOK 500/yr, max NOK 25,000/yr, third-party reporting
  via Altinn) — plain membership fees do not qualify.

Sources:
- https://developer.vippsmobilepay.com/docs/getting-started/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-guide/
- https://vippsmobilepay.com/nb-NO/pricing
- https://vippsmobilepay.com/nb-NO/donasjoner and https://vipps.no/news/2025/2/faste-donasjoner
- https://www.skatteetaten.no/bedrift-og-organisasjon/rapportering-og-bransjer/bransjer-med-egne-regler/frivillige-og-ideelle-organisasjoner/mva-for-veldedige-og-allmennyttige-organisasjoner/
- https://www.skatteetaten.no/en/person/taxes/get-the-taxes-right/gift-and-inheritance/gift-to-organisation/

### 12. Local persistence is mandatory: no all-statuses listing, no documented Vipps retention, 168-hour userinfo window; 5-year bookkeeping retention — HIGH confidence

- **Vipps cannot be used to rebuild historical member state.** The agreements listing
  endpoint defaults to active agreements only, takes one `status` filter per call, and
  the changelog states: "There is no way to list all agreements with all statuses, due
  to performance." No retention window for Recurring API agreement/charge data is
  documented anywhere; the Report API only guarantees data back to May 2020. The
  merchant-side database is the system of record for the live view *and* the lapsed-
  member history.
- **Profile data must be captured at signup:** with the profile-sharing scopes (`name`,
  `email`, `phoneNumber`, `address`, `birthDate`; `nin` restricted), "there is a
  168-hour (7-day) time limit to retrieve consented profile data" — after that the
  merchant cannot re-fetch. The merchant becomes independent data controller for the
  received profile data ("the merchant will be responsible for the processing of the
  profile information received"); no data-processing agreement with Vipps is needed, but
  the merchant needs its own GDPR basis (the membership agreement).
- **Norwegian retention rules:** bokføringsloven § 13 — primary accounting
  documentation kept 5 years after the end of the accounting year; secondary
  documentation (agreements, correspondence) 3.5 years. Datatilsynet on former members:
  "Opplysningene skal i utgangspunktet slettes når du som medlem melder deg ut", unless
  longer storage is agreed or necessary for the purpose. Practical reconciliation:
  keep charge/payment records for the statutory 5 years (GDPR art. 6(1)(c) legal
  obligation), and delete or anonymize non-bookkeeping profile data of lapsed members
  once no longer needed — the historical "backtracking" view should be designed around
  this split.

Sources:
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/CHANGELOG/
- https://developer.vippsmobilepay.com/docs/APIs/report-api/report-api-faq/
- https://developer.vippsmobilepay.com/docs/APIs/userinfo-api/userinfo-api-guide/ and .../userinfo-api-faq/
- https://developer.vippsmobilepay.com/docs/APIs/login-api/login-api-faq/
- https://lovdata.no/lov/2004-11-19-73/§13
- https://www.datatilsynet.no/regelverk-og-verktoy/sporsmal-svar/medlemsopplysninger/hva-skal-skje-med-opplysningene-nar-et-medlem-melder-seg-ut/

---

### 13. Refunding a charge (v3): one endpoint, org-side only, 365-day window, does NOT touch the agreement — HIGH confidence

Added 2026-08-27 for the refund/angrerett work (branch `refund-handling`). Verified
against the Recurring OpenAPI spec (`redocusaurus/recurring-swagger-id.yaml`, downloaded
and read directly) plus the API guide, FAQ, and checklist pages.

- **The endpoint:** `POST:/recurring/v3/agreements/{agreementId}/charges/{chargeId}/refund`.
  Body is `RefundRequest` — **both fields required**: `amount` (integer, **minor units**,
  i.e. øre) and `description` (string, 1–100 chars, a human explanation such as
  "Angrerett innen 14 dager"). `Idempotency-Key` is a **required header** (1–40 chars,
  must not contain `#`, `?`, `/`, `\`).
- **Returns `204 No Content`** — not the updated charge. To know the resulting status you
  must re-read the charge (`GET .../charges/{chargeId}`) or wait for the webhook. Error
  responses: `400`, `404`, `409`.
- **There is no "refund it all" shorthand.** Even a full refund states an amount, so a
  full refund means sending the captured amount — read it from `summary.captured` on the
  charge, not from what we think we billed. Partial refunds are supported by the API
  ("can also do a partial refund"); støttemedlem has **decided not to offer them**
  (2026-08-27), which is a product choice, not an API limit.
- **365-day deadline:** "REFUNDED — The charge has been refunded. **Refunds are allowed up
  to 365 days after the capture date.**" For a yearly membership this is uncomfortably
  tight at the anniversary: the previous period's charge falls out of the window at almost
  exactly the moment the next renewal is taken.
- **Refund ≠ cancel, and we only ever refund.** Cancel
  (`DELETE:/recurring/v3/agreements/{agreementId}/charges/{chargeId}`) applies *before* the
  user is charged (PENDING/DUE/RESERVED) and releases the reservation immediately; refund
  applies *after* capture and "takes a few days before the amount is available in the
  customer's account". We use `DIRECT_CAPTURE`, so our charges go straight to `CHARGED`
  and refund is the only operation that applies to money already taken. Cancel would only
  ever be relevant for a renewal charge created but not yet due.
- **A refund does NOT stop the agreement.** They are unrelated operations: refunding gives
  the money back, the standing arrangement stays `ACTIVE` and will renew. "Refund and let
  them go" is therefore always **two** calls — refund the charge *and*
  `PATCH:/recurring/v3/agreements/{agreementId}` to `STOPPED`. Doing only the first
  silently re-bills the person next January. (Conversely, stopping an agreement
  auto-cancels its DUE/PENDING charges — Vipps says "if you cancel an agreement, there is
  no need to cancel the charges that belong to the agreement".)
- **Vipps wants the refund button in *our* back office, not in their portal.** The guide:
  "Refunds must always be done using the API, through the merchant's administration
  solution." The API checklist reinforces it: customer support should have what they need
  in the merchant's own system and "should not need to visit portal.vippsmobilepay.com for
  normal work."
- **…but a portal refund still reaches us.** "Merchants can also refund recurring charges
  directly on the business portal. This will update the information provided through the
  API and send a webhook event." So an org that refunds by hand in the portal produces a
  real `recurring.charge-refunded.v1` for us, and the nightly reconcile would see it
  regardless. **Following a refund we did not initiate is required either way**; building
  our own refund action is an addition to that, never a replacement.
- **The webhook payload is enough to classify the refund without a re-read:**
  `recurring.charge-refunded.v1` ("Charge was fully or partially refunded") carries
  `amount`, `amountCaptured`, `amountCanceled`, `amountRefunded`, `chargeType`, `currency`,
  `occurred`, `msn`. Our dispatcher re-reads the charge anyway (`syncCharge`), which is the
  more robust path and also covers the portal case.
- **Resulting state on the charge:** status becomes `REFUNDED` (full) or
  `PARTIALLY_REFUNDED` (part), `summary.refunded` accumulates, and a `REFUND` event with
  its own `idempotencyKey` is appended to `history[]`. Note `PARTIALLY_REFUNDED` can arrive
  even though we never ask for one — a portal-side partial refund by the org produces it,
  so the product must still have an answer for that status.
- **Rate limit:** refund is **5 per minute per `agreementId` + `chargeId`** (same as cancel
  and capture). Not a constraint for a human-driven action, but retry loops must respect it.
- **Known failure mode — "Refund is not possible":** per the FAQ, this error means the
  charge was made to a sales unit using the special **"single settlement"** setup. Since
  every org brings its own sales unit/MSN, an org can be configured such that refunds
  simply fail, and the back office has to say something truthful when that happens.
- **Not documented anywhere:** whether the merchant needs a positive settlement balance for
  a refund to go through, and what a `409` on refund actually means (double refund? amount
  over captured?). Both are worth proving on apitest with the `vipps-test-rig` skill before
  relying on them.

Sources:
- https://developer.vippsmobilepay.com/redocusaurus/recurring-swagger-id.yaml (`RefundChargeV3`, `RefundRequest`, `ChargeStatus`, `ChargeSummary`, `ChargeEvent`)
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-guide/ (Cancel a charge, Refund a charge, Charge states, Charge webhooks, Rate limiting)
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-faq/ ("Why do I get the error 'Refund is not possible'?")
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-checklist/

---

## Implementation sketch for the yearly støttemedlem product

Derived from the verified findings above (design guidance, not itself a verified claim):

1. **Signup:** create agreement (`interval: YEAR/1`, `pricing.type: LEGACY` with the
   tier price, tier name in `productName`/`productDescription`, `merchantAgreementUrl`
   to an authenticated "Min side") with an initial charge for year 1. Request the
   profile-sharing scopes and persist name/email/phone immediately — the userinfo
   window is only 168 hours (findings 1, 4, 7, 9, 12). Confirm activation via
   `recurring.agreement-activated.v1` or polling — never the redirect alone.
2. **Renewal:** a scheduled merchant job creates next year's charge ~30–35 days before
   the anniversary (`DIRECT_CAPTURE`, `retryDays` ≥ 2, `externalId` = local member/period
   id), so the user gets the full in-app visibility window (findings 2, 3, 8).
3. **Tier change:** takes effect at next renewal — PATCH the agreement's
   `pricing.amount` + `productName` when the member picks a new tier, then create the
   renewal charge at the new amount; no user re-approval is triggered, but notify the
   member yourself (finding 9). Never stop+recreate for a tier change.
4. **Failure/grace:** rely on Vipps' daily retries; mark membership lapsed only when
   `recurring.charge-failed.v1` arrives / the charge reaches FAILED after the retry
   window (findings 3, 10).
5. **Cancellation:** handle `recurring.agreement-stopped.v1` (check `actor`), mark member
   lapsed at period end; also expose stop on the mandatory management page (findings 4, 5).
6. **Sync:** register webhooks per MSN for all four agreement events and six charge
   events, verify the HMAC signature, process idempotently; webhook consumers update a
   local `members`/`agreements`/`charges` store — this local store is the system of
   record, since Vipps offers no all-statuses listing and no documented retention
   (findings 6, 10, 12). Nightly reconciliation polling of non-final agreements/charges
   as fallback; Report API for settlement records.
7. **Retention:** keep charge/payment records 5 years (bokføringsloven); delete or
   anonymize other personal data of lapsed members when no longer needed, while keeping
   an anonymizable membership-period history for the admin backtracking view
   (finding 12).

---

## Caveats

- **Verification depth differs:** findings 1–8 passed the 3-vote adversarial pass;
  findings 9–12 are from a single-pass targeted follow-up (quotes checked against the
  official pages, but not independently re-verified).
- **Vendor-stated statistics:** the "up to 12% better conversion" and "96%+ success rate"
  retry figures are Vipps' own promotional numbers with no published methodology.
- **Terminology:** the FAQ's "Done" state is flow-diagram shorthand; the formal charge
  state is CHARGED (charge states: PENDING, DUE, CHARGED, RESERVED, FAILED, …).
- **Behavior asymmetry:** RESERVED charges surviving an agreement stop applies to
  *user-initiated* stops only; merchant-initiated stops cancel RESERVED charges too.
- **Time sensitivity:** the 1-day charge lead time dates from October 2025 (previously
  2 days); older third-party writeups and the legacy `vippsas.github.io` docs mirror are
  outdated. Docs were verified as of 2026-07-02; re-check the changelog before build.
- **`orderId`:** older examples show it as required; in v3 it is optional, with
  `Idempotency-Key` as the required uniqueness mechanism.

## Appendix A — Deep dive: why Vipps Donasjoner is ruled out

Vipps Donasjoner ("Donasjoner" / "Faste donasjoner", relaunched Feb 2025) looks
attractive from the outside: no-code setup via VippsPortalen, the lowest transaction
rate (1.99 % + 1 NOK vs 2.99 % + 1 NOK for Faste betalinger), donor name/phone shared
with consent, and — contrary to the first research pass — a real **Donations API** with
partner-key support. This deep dive adversarially tried to make it work for
stottemedlem and establishes precisely where it breaks.

### What it actually offers (better than it first looked)

- A **Donations API** exists: `GET /donations/v1/reports/payments` (per-payment entries
  with payer name/number and agreementId, ~10 min latency, poll at most once/minute),
  `GET /donations/v1/agreements/{id}` (agreement details incl. payer info), and
  `POST /donations/v1/agreements/{id}/stop`.
- Webhooks: `donations.agreement.started.v1`, `.stopped.v1`,
  `.withdrawal-day-changed.v1`, `.amount-changed.v1`.
- Partner keys work with the Donations API and `donations.*` webhooks, and the
  Management API lets a partner **prefill** a `DONATIONS` product order for a merchant
  (the merchant must still review and submit it in the portal).
- Donor data is non-anonymous: name + phone (optionally address/email) via portal, API,
  and CRM integrations; Skatteetaten-approved orgs get fødselsnummer in a tax-deduction
  report. So a live registry of active fixed givers *would* be technically achievable.

### The hard blockers

1. **Monthly only, at the schema level.** The Donations OpenAPI spec defines
   `Schedule.interval` as `enum: [MONTHLY]` with a `withdrawalDay` (day of month). The
   "next withdrawal date" the donor picks is a day-of-month, not an interval. A yearly
   cadence is impossible — this is the API contract, not marketing copy.
   (https://developer.vippsmobilepay.com/api/donations/, spec
   `donations-swagger-id.yaml`; product page: "faste, månedlige givere".)
2. **No API-driven agreement creation or amount control.** The donor free-enters the
   amount and creates/changes the agreement in the Vipps app; the org/platform can only
   *read* and *stop* agreements. Tiers cannot be enforced — at best mimicked with
   per-tier QR/links (campaign `?e=` reference) and hoping the donor types the right
   amount. (Donations API guide; "Med Vipps Donasjoner er det giveren som har kontroll
   over avtalen.")
3. **Countervalue restriction.** Eligibility: organizations collecting money "uten å
   tilby varer eller tjenester i retur". "Sosiale og medlemsbaserte organisasjoner" are
   eligible as *org types*, but a membership that confers rights or tiered benefits is a
   countervalue outside the product's stated purpose — and the product's built-in
   gavefradrag (§ 6-50) framing confirms it is legally a *gift* product (kontingent with
   motytelse is explicitly not a § 6-50 gift).
   (https://help.vippsmobilepay.com/nb-NO/articles/who-can-use-donations)
4. **Per-org human-in-the-loop provisioning.** A partner can prefill the product order,
   but every customer org must submit it in VippsPortalen and pass Vipps' review
   (income declarations, use-of-funds) — no fully programmatic onboarding for a
   multi-tenant SaaS.
5. **No embeddable checkout.** Only shareable links/QR codes; no widget, no redirect/
   confirmation flow back into the SaaS, and per-payment data arrives via report
   polling with up to ~10 min latency and no SLA.

### Verdict

Blockers 1 and 2 are absolute: stottemedlem's core model (yearly billing, org-defined
tiers) cannot be expressed in Donasjoner at the API-contract level. Blocker 3 makes even
a monthly workaround a compliance risk the moment tiers carry any member benefit. Vipps'
own help center draws the same line: Faste donasjoner is for gift collection; for
"medlemsmodeller" they point to **Faste betalinger** — the Recurring API
(https://help.vippsmobilepay.com/nb-NO/articles/difference-between-recurringdonations-and-recurringpayments).
The 1 percentage-point fee difference does not buy back a viable product.

One transferable design note: the Donations flow where the *payer* picks the amount
maps to the Recurring API's `VARIABLE` pricing type — if a "pay what you want" support
tier is ever wanted, that is the sanctioned mechanism (finding 9), not Donasjoner.

Sources (deep dive):
- https://developer.vippsmobilepay.com/api/donations/ (OpenAPI: `Schedule.interval` enum `[MONTHLY]`, `PayerDetails`)
- https://developer.vippsmobilepay.com/docs/APIs/donations-api/api-guide/ and .../faq/
- https://developer.vippsmobilepay.com/docs/partner/partner-keys/ and https://developer.vippsmobilepay.com/api/management/
- https://vippsmobilepay.com/nb-NO/donasjoner and https://vipps.no/news/2025/2/faste-donasjoner
- https://help.vippsmobilepay.com/nb-NO/articles/who-can-use-donations
- https://help.vippsmobilepay.com/nb-NO/articles/difference-between-recurringdonations-and-recurringpayments
- https://help.vippsmobilepay.com/nb-NO/articles/which-donations-are-eligible-for-tax-deductions
- https://vippsmobilepay.com/nb-NO/pricing

## Open questions

The four originally open questions (tier-change mechanics, onboarding/NGO products,
data retention, charge webhook events) were closed by findings 9–12. What remains:

1. Exact Vipps-side retention window for old Recurring agreements/charges — the docs are
   silent; confirm with Vipps support if it ever matters (the design assumes it doesn't,
   since the local DB is the system of record).
2. Current charity/NGO transaction rates (Innsamlingskontrollen / Fundraising Norge
   discounts) — referenced in Vipps announcements but not on the current pricing page;
   confirm during merchant onboarding.
3. VAT treatment of *this specific* støttemedlemskap (depends on whether tiers carry
   real countervalue) — needs an accountant's assessment, not more API research.
4. Whether exact webhook payload example values match production (field names are
   confirmed; example bodies were not re-quoted verbatim).
