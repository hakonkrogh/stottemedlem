# Auth boundaries and the SQL layer (verified 2026-09-11)

The map a security review of `apps/backoffice` needs, so the next one starts
from here instead of re-deriving it from middleware, worker and db package.
Every line was read in code on 2026-09-11; re-verify the file:line pointers
before trusting them, they move.

## Three kinds of caller

| caller | how it is authenticated | where |
|--------|-------------------------|-------|
| back-office administrator | WorkOS sealed session in the `wos-session` cookie (httpOnly, SameSite=Lax, secure off only on plain-http localhost) | `src/middleware.ts`, `src/lib/workos.ts` |
| member on their own pages | a capability URL: `manage_token` (min-side, kvittering) or `card_token` (medlemsbevis, `/v/<code>`) | `packages/db/src/index.ts` `findAgreementByManageToken`, `findMemberCardByToken` |
| Vipps webhook delivery | HMAC-SHA256 signature over date + host + body hash, per-org secret | `packages/vipps/src/webhook-verification.ts`, `src/pages/api/vipps/[slug].ts` |

## The public allowlist (everything else redirects to /login)

`src/middleware.ts` `isPublic`: exact `/login /callback /logout /healthz
/favicon.ico /api/card-without-words /databehandleravtale`, and prefixes
`/api/qr/`, `/api/vipps/`, `/bli-medlem/`, `/medlemsbevis/`, `/v/`, `/org/`.
Adding a public route means adding it there AND, for the apex domain, a zone
route in `wrangler.jsonc` (otherwise it falls through to the marketing 404).

`src/worker.ts` runs BEFORE Astro: it 301s `/org/*`, lower-cases `/V/<code>`
to `/v/`, and caches GET `/bli-medlem/<slug>[/vilkar|/personvern]` (no query
string) in the Workers Cache API. The cache stores only status 200 responses
WITHOUT a `set-cookie` header, keyed on origin + path + today's date, and the
copy is served to every visitor. So a public join page must never render
anything that depends on the visitor (session, cookies, headers), or it leaks
into everyone's copy.

## Organization authorization (back office)

`src/lib/orgAccess.ts` `requireOrgAccess(session, slug)`: loads the org row by
slug from D1, then asks WorkOS `listOrganizationMemberships(userId, active)`
and returns the org only if one membership's `organizationId` equals
`org.workosOrgId`. Null for "no such org" and "not yours" alike (deliberately
indistinguishable). WorkOS is the authority on who may act for an org; the D1
row is the authority on everything else. `locals.session.organizationId` is
only the session's SCOPE, never used as authorization on its own.

Every `/o/[slug]/**` page must call `requireOrgAccess` before any read or
write, on GET and on POST alike. `/orgs/select.ts` re-checks membership
server-side before scoping the session.

## CSRF

Nothing in the app checks a token. Protection is Astro 7's
`security.checkOrigin`, which defaults to `true` in `output: "server"` (not
set explicitly in `astro.config.mjs`): a POST/PUT/PATCH/DELETE with a form
content type is rejected unless the `Origin` header matches the request
origin. Consequence for tests and scripts: a curl POST to a form handler
needs an `Origin:` header or it gets 403 (the verify-public-routes skill's
erasure recipe already does this). Never turn `checkOrigin` off. GET
handlers must never change state, because Lax cookies ride along on
top-level GETs.

## Tokens

- `manage_token`, `card_token`, every row id: `crypto.randomUUID()` (122
  random bits). Looked up with plain `eq`, no constant-time compare, which is
  fine at this entropy.
- A scan code (`/v/<code>`) is the card token's 128 bits in Crockford-ish
  base32 (`packages/core` `memberScanCode` / `cardTokensFromScanCode`). Same
  secret, different spelling, so it grants exactly what the card URL grants.
- Erasure (`anonymizeMember`) nulls `manage_token`, `card_token`, `vipps_sub`
  so the personal URLs stop resolving, not merely stop being linked.

## SQL layer

`packages/db/src/index.ts` is the ONLY place SQL lives, and it is Drizzle
throughout (`eq`, `and`, `like`, `inArray`, tagged `sql\`\`` with
parameter interpolation). No `sql.raw`, no `prepare()`, no string-built
SQL anywhere in `apps/` or `packages/` (checked 2026-09-11 with
`grep -rn 'sql.raw\|prepare(\|\.exec(' apps packages`). SQL injection is
therefore a non-issue as long as new queries go through Drizzle; a review
should grep for `sql.raw` and `prepare(` and stop there.

The two `like(..., \`${base}%\`)` calls take a slugified base (only
`[a-z0-9-]`), and a stray `%`/`_` would only widen a "taken" set anyway.

**Tenant scoping convention:** helpers that take `orgId` scope by it
(`getMembershipTier`, `updateMembershipTier`, `getOrganizationMember`,
`updateMemberContactDetails`, `findMemberIdByCardToken`). Helpers that take
only an id do NOT (`anonymizeMember`, `getSupportingMember`,
`getMembershipAgreement`, `listMembershipHistory`, `listChargesForMember`,
`ensureMemberCardToken`). Their callers must have obtained the id through an
org-scoped or token-scoped read first; an audit is "for each id-only helper,
trace where the id came from" (all callers checked clean 2026-09-11).

## Known open items from the 2026-09-11 review

- `/login` sends no OAuth `state` and `/callback` verifies none: login CSRF
  (an attacker can log a victim's browser into the attacker's account). Low
  impact on its own; fix is a random `state` in a short-lived cookie.
- `kvittering.astro`: `?agreementId=` substitutes for the manage token `?n=`
  (documented as an operator/legacy convenience). A Vipps agreement id
  (`agr_…`, 7 base62 chars, visible in the portal and the member's app) is
  not a secret, so whoever knows one reads that member's name, email,
  receipt and card link, and triggers Vipps syncs under the org's keys.
  Medium. Fix: require `?n=`, or bind `agreementId` to the token.
- `medlemsbevis/[token]/kort.png.ts` + `lib/cardImage.ts`: every distinct
  `?bredde=` from 600 to 2400 is a fresh resvg rasterization and a new R2
  object that is never deleted, with no rate limit. Medium (cost/abuse).
  Fix: snap width to a few fixed sizes.
- No rate limiting anywhere: join `start.ts` drafts a real Vipps agreement
  per POST; `/api/vipps/[slug]` reads the body and a Vault secret before the
  401; `/api/card-without-words` is one Sentry error per POST. Low.
- Webhook signature has no clock check on `x-ms-date`: replays re-sync from
  Vipps (idempotent) and enqueue a receipt sweep. Low.
- The manage token rides in `?n=` (the constant
  `MEMBER_SELF_SERVICE_TOKEN_PARAM` in core) with no `Referrer-Policy` on the
  page and ends up in Workers Logs and same-origin referrers. Sentry no
  longer sees it (below).

## What reaches Sentry (settled 2026-09-11, from the SDK source)

`@sentry/cloudflare` 10.x captures POST bodies BY DEFAULT: its
`httpServerIntegration` reads any `application/x-www-form-urlencoded`,
JSON or text body up to 10 KB (`maxRequestBodySize: "medium"`) and the
`requestDataIntegration` always attaches it as `request.data`, together
with the full URL and query string, regardless of `sendDefaultPii`. So an
unhandled throw on POST `/o/[slug]/vipps` would have shipped the four Vipps
keys to Sentry. `src/worker.ts` now passes
`httpServerIntegration({ maxRequestBodySize: "none" })` and a `beforeSend`
that runs `redactAlert` from `@stottemedlem/log` (drops body, cookies,
credential headers; blanks the manage token in url/query_string) and tags
the event `redacted=<what>`. An event with a `redacted` tag in Sentry means
the SDK started attaching something again (an upgrade changed a default):
that is the runtime signal, and the fix is in `packages/log/src/redact.ts`.

**500 bodies never carry a stack.** Astro 7's production error handler
(`astro/dist/core/errors/build-handler.js`) rethrows a 500's error instead
of rendering it, the Cloudflare adapter's `handle` has no catch, and
`withSentry` captures and rethrows, so the visitor gets Cloudflare's
generic 1101 error page. Verified from source; no deployment needed.
- No security headers anywhere (no nosniff on inline SVG responses, no CSP,
  no frame-ancestors). Defence in depth only: every SVG string is escaped via
  `escapeXml` in `packages/qr/src/brand.ts`, org image uploads are magic-byte
  sniffed to PNG/JPEG/WebP.
- `packages/core` `csvDocument` quotes only `; " \r \n` and never neutralises
  a leading `= + - @`, and `medlemmer/eksport.csv.ts` writes member name,
  email and phone (supporter-controlled via the Vipps profile) into it:
  spreadsheet formula injection when the treasurer opens the export in Excel.
  Medium. Fix: prefix such cells with `'` in `csvDocument`.
- Session-gated HTML (`/o/**`, `/orgs/**`) sets no `Cache-Control`; only the
  CSV route sends `no-store`. Back button after logout on a shared machine
  shows the member list from the browser cache. Low.
- `/orgs/new` has no cap: any AuthKit sign-in can create unlimited WorkOS
  orgs, D1 rows and slugs (squatting the real org's slug, which then gets
  `-2`). Low.
- `vipps.astro` re-renders the typed client secret and subscription key as
  `value=` attributes when validation fails. Info.

Back office verified clean on 2026-09-11: every `/o/[slug]/**` page calls
`requireOrgView`/`requireOrgAccess` first on GET and POST; member, tier,
charge and administrator ids are all re-checked against the org; WorkOS
invitations take no role from the form and the last-admin guard applies to
self; uploads are magic-byte sniffed (SVG rejected) with server-built R2
keys; Vipps keys live in WorkOS Vault and pages show only MSN, client id and
the last four characters; no `set:html` reaches user data; emails escape
every interpolation; slugs are never user-chosen.

## Reviewing again

- The built-in `/security-review` skill diffs against `origin/HEAD`. A fresh
  worktree clone has no `origin/HEAD`; fix with `git remote set-head origin -a`
  (done 2026-09-11 in this clone, shared by all worktrees of it).
- Endpoint inventory: `find apps/backoffice/src/pages -type f`. Anything not
  in the allowlist above is behind the session.
