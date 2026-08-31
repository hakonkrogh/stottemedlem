# What member data we may pull from Vipps — verified ground truth

**Verified 2026-08-31** against Lovdata (verbatim statute text) and the Vipps
MobilePay developer docs (`.md` mirrors, see *Sources*). Not legal advice —
this is the checklist to bring to a lawyer, plus the facts that are simply true.

Today the product asks for **`scope: "name email phoneNumber"`** on the Recurring
agreement (`apps/backoffice/src/lib/membership.ts`). Every extra scope moves the
question from "obviously necessary" to "you must justify it".

## The Vipps facts (these settle several arguments on their own)

**Two different scope lists — don't mix them up.** We create a *Recurring
agreement* with profile sharing, so we're on the **Userinfo API** list, not the
richer Login API list.

| Scope | Userinfo (our flow) | Login API only | Notes |
|---|---|---|---|
| `name` | ✅ | ✅ | verified against Folkeregisteret |
| `phoneNumber` | ✅ | ✅ | the number used with Vipps |
| `email` | ✅ | ✅ | always verified (`email_verified: true`) |
| `address` | ✅ | ✅ | up to 3: home/work/other → `address` + `other_addresses`; empty strings if the user has none |
| `birthDate` | ✅ | ✅ | verified against Folkeregisteret |
| `nin` | needs approval | needs approval | **"Not available in Norway"** per the Login scope table |
| `gender` | ❌ | ✅ | Login API only |
| `delegatedConsents` / `customFlow` | ❌ | ✅ | marketing-consent collection on the merchant's behalf |

There is **no `accountNumbers` scope** in either list — don't assume one exists.

**Consent is all-or-nothing.** Vipps' own wording: *"The user must either accept
or reject the full set of scopes... A user can therefore not choose to accept
name and deny address."* Two consequences:

1. GDPR-granular consent cannot be achieved inside the Vipps screen. The only
   way to give a supporter a real choice is **not to request the scope**, or to
   ask for it later in our own UI.
2. Vipps warns that more scopes ⇒ more denials — and in *our* flow a denial
   means **the agreement fails**, i.e. the member cannot join. Extra scopes are
   a conversion risk, not just a legal one.

**Scope availability depends on the org's Vipps product plan** (Login API docs):
basic = `name`, `phoneNumber`, `email`, `address`; `birthDate`/`gender`/`nin`
need a higher plan. Each org brings its own MSN + keys
(`docs/vipps-org-onboarding.md`), so a scope we add may silently be **omitted**
for some orgs — a requested scope outside the plan is dropped, the request does
**not** fail. Anything we add must degrade gracefully.

**168-hour window.** Profile data is fetchable for 168 h after consent, *even if
the user revokes it in that window*; after expiry Vipps will not hand it over,
manually or otherwise. Hence the existing rule in
`specs/concepts/supporting-member.md`: capture at join, never re-fetch.

## The Norwegian/GDPR points

### Roles: the org is the controller, we are the processor
The organization is *behandlingsansvarlig* for its member register; we are
*databehandler*. So:
- We need a **databehandleravtale** with each org listing the data categories.
- Widening the collected fields for *every* org is a controller decision. Extra
  fields should be **per-org opt-in with a stated reason**, not a global default.
- Subprocessors (Cloudflare/D1, WorkOS, Vipps, Sentry) and any non-EEA transfer
  must be covered — more fields flow to all of them and into the CSV export.

### Data minimisation (GDPR art. 5(1)(c))
The test is necessity for the purpose, not usefulness. The purpose is: list who
supports us, collect an annual fee.

| Field | Verdict |
|---|---|
| name, phone, email | easy to justify — identify and contact a member |
| address | only if the org actually posts something. Per-org opt-in. |
| birthDate | only for a real rule (junior/senior tier). Then derive and store **year or a flag**, discard the full date. |
| nin | no — and not available in Norway anyway |

### Fødselsnummer — `personopplysningsloven § 12` (verbatim)
> *Fødselsnummer og andre entydige identifikasjonsmidler kan bare behandles når
> det er saklig behov for sikker identifisering og metoden er nødvendig for å
> oppnå slik identifisering.*

A supporting-member list does not meet that bar. Vipps applies the same test
itself, citing Datatilsynet. Settled: never.

### Children — `personopplysningsloven § 5` (verbatim)
> *Aldersgrensen er 13 år for samtykke etter personvernforordningen artikkel 6
> nr. 1 bokstav a...*

13 is the Norwegian age of consent for information society services. Pulling
`birthDate` means we then *know* when a supporter is under 13 — and knowing
creates a duty to act. Don't request it without deciding what happens next.

### Membership can itself be special-category data (art. 9)
This already applies at today's scope. If the org is a political party, a
religious congregation, or a union, "X is a member" *is* art. 9 data. Art.
9(2)(d) covers such a body's processing of its **own** members — it does not
cover disclosure to a third party, and we are the third party in that chain.
Richer records make each one a fuller profile: higher art. 32 security bar, and
a **DPIA (art. 35)** becomes more likely to be required.

### Transparency (art. 13) and marketing
- The join page must state, before payment: which fields, why, who receives them
  (the org), how long they're kept. A policy link alone is not enough for a
  field the supporter wouldn't expect.
- Retention: adding fields forces an answer to "how long after a membership
  lapses do we keep this?"
- `markedsføringsloven § 15`: email/SMS marketing needs consent. The product
  deliberately only sends the member notice (`specs/concepts/member-notice.md`).

## If we ever add `address`: what an org-level opt-in really costs

Checked 2026-08-31. "Per-org opt-in with a stated reason" is still the right
shape, but it is not a small toggle:

- **The toggle removes the supporter's choice, it doesn't add one.** Because
  Vipps consent is all-or-nothing, an org turning address on makes address
  **mandatory to join that org** — a supporter who declines cannot become a
  member at all (the agreement fails). Weigh it as a conversion switch.
- **On ⇒ present is false.** Two ways to get nothing: a scope outside the org's
  Vipps plan is silently dropped (request still succeeds), and a user with no
  registered address returns `address` with **empty strings**. Any address
  feature must treat "asked and got nothing" as normal, not an error.
- **Vipps recommends letting the user pick** among `address` / `other_addresses`
  (home/work/other). With no such UI we'd silently take the default one.
- The stated reason has to appear on the join page *before* the redirect to
  Vipps (art. 13), so it needs a column on `organizations`, not just a flag.

## Audit of the CURRENT scope — RAISED 2026-08-31, CLOSED the same day

All five gaps below were found and fixed — four in one unit of work, the databehandleravtale right after. Kept as the
record of WHY each surface exists, so nobody re-opens the question or re-reports
them as open. The product behaviour now lives in
`specs/concepts/member-data.md` + `specs/use-cases/erase-member-data.md` — read
those first; this section is the audit trail, not the spec.

| was missing | now |
|---|---|
| No privacy notice anywhere (`grep -ri personvern apps/` was empty; the join page linked only `vilkar.astro`, which had no privacy section) | public per-org page `bli-medlem/[slug]/personvern.astro`, linked from the join page BEFORE the Vipps button, from the sales terms and from min-side; cached + purged like the other public pages (`worker.ts` `PUBLIC_ORG_PAGE`, `publicPageCache.ts`) |
| No retention rule; `supporting_members` rows never expired | `MEMBER_IDENTITY_RETENTION_YEARS = 5` in `packages/db` — **the privacy page prints the same constant the sweep uses**, so the promise cannot drift from the code. Swept nightly inside the reconcile cron (`lib/retention.ts`), placed BEFORE the Vipps check so a Vipps-less org is not where old members linger |
| No delete/anonymise path at all | `anonymizeMember()` clears name/email/phone, `vipps_sub`, `card_token` and the agreement's `manage_token`; keeps every payment row. Reachable by the member (min-side) and the admin (member detail); refused while an agreement is ACTIVE. Migration `0012_member_erasure.sql` adds `anonymized_at` |
| `supporting-member.md` said "e.g. name and email" while the code collected name+email+phone | the set is now named exactly in `specs/concepts/member-data.md`, and adding a field is a spec change first |
| No databehandleravtale surface | **CLOSED too.** Public `/databehandleravtale` (one standard text, `DPA_PATH`/`DPA_VERSION` in core, middleware-public so it reads without a session), accepted via a **required, never-pre-ticked checkbox on the create-org form** — enforced server-side in `orgs/new.astro`, not just by the browser. `dpa_accepted_at`/`dpa_version` on `organizations` (migration `0013`), `hasAcceptedDpa()` guarding, an `orgWarnings` prompt + settings-page accept button for a future version bump. Migration `0014` **backfilled the one pre-existing org** (the operator's own) stamped at MIGRATION time, never backdated to org creation. **The text is developer-written and accurate about what the code does; a lawyer should still read it before onboarding unknown orgs.** Spec: `specs/concepts/data-processing-agreement.md` |

Production held 1 organization and **0 supporting members** when this was
raised, so there was nobody to notify and no data to erase — everything landed
before the first real member. Re-check with
`bash .claude/skills/verify-public-routes/d1.sh "SELECT count(*) FROM supporting_members" production`.

**How to validate any of it:** `verify-public-routes` now carries the recipe
(erasure end-to-end + driving the retention sweep through the cron endpoint).

## Bottom line
Keep the default at `name email phoneNumber`. `address` only as a per-org
opt-in with a stated reason; `birthDate` only if a tier rule needs an age, and
then derive-and-discard. Never `nin`. Any addition is also a Vipps
plan/onboarding change, not just a code change.

## Sources
- `personopplysningsloven` (LOV-2018-06-15-38): https://lovdata.no/lov/2018-06-15-38
  — **the body text is not in the plain page HTML**; fetch a § anchor and take
  the *second* occurrence of the heading (the first is the TOC):
  `curl -sL 'https://lovdata.no/lov/2018-06-15-38/%C2%A712' -A 'Mozilla/5.0'`
  (same trick as `norwegian-receipt-law.md`).
- Vipps docs serve **`.md` mirrors** of every page — far better than scraping
  HTML. Index: https://developer.vippsmobilepay.com/llms.txt
  - Userinfo API guide (our flow's scope list, NIN rule, 168 h):
    https://developer.vippsmobilepay.com/docs/APIs/userinfo-api/userinfo-api-guide.md
  - Userinfo FAQ (revocation delay, no manual recovery after expiry):
    https://developer.vippsmobilepay.com/docs/APIs/userinfo-api/userinfo-api-faq.md
  - Login API user info (full scope table, product plans, `gender`, `nin` N/A in
    Norway): https://developer.vippsmobilepay.com/docs/APIs/login-api/api-guide/user-info.md
- Datatilsynet on fødselsnummer:
  https://www.datatilsynet.no/rettigheter-og-plikter/personopplysninger/fodselsnummer/
- Neighbours in this skill: `phone-number-privacy.md` (displaying/masking member
  phone numbers), `norwegian-receipt-law.md` (receipt/bookkeeping duties).
