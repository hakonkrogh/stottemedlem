# Research: search terms in admin URLs & phone-number masking — precedents

Researched 2026-08-28 (four parallel research passes: Nordic membership tools,
global SaaS dashboards, standards/enforcement, masking patterns). Context: the
back office's member search is a GET form (`?sok=`), so a typed phone number or
email lands in the URL → browser history + Cloudflare Workers request logs.
This is recorded as an **accepted** open question in
`specs/use-cases/curate-member-list.md`; this document is the precedent
research commissioned to inform any revisit. Legal baseline (no masking
mandate, GDPR art. 5(1)(c)/25 analysis) lives in the `project-overview` skill's
`phone-number-privacy.md`.

## Verdict in one paragraph

Search-terms-in-the-URL is the **documented industry norm** for authenticated
admin tools, not a compliance violation: Stripe and Zendesk advertise
shareable/bookmarkable search URLs containing customer PII as a *feature*, no
EU/EEA DPA enforcement was found where PII in a query string or server log was
itself the sanctioned violation, and the strongest formal texts against it
(RFC 9110 § 17.9, OWASP ASVS 14.2.1) aim primarily at secrets and explicitly
acknowledge the GET-search trade-off. Phone masking for org admins has **no
precedent among direct competitors** — every verifiable Nordic membership tool
shows admins full numbers — and Vipps' own masking is a strangers-in-a-payment
pattern that hands the full number over exactly when a user consents to a
relationship, which our members have done. The accepted stance is defensible;
the cheap hardenings, if ever wanted, are listed at the end.

## 1. Similar tools (Nordic membership/forening systems)

No verifiable competitor masks phone numbers from org admins, and none
documents URL hygiene for search:

- **Spond**: contact info visible to admins (member-facing hiding is from
  *other members*); full-list Excel export for admins. Privacy mechanism is
  per-field visibility settings, not masking.
  https://help.spond.com/en/articles/25957
- **Holdsport (DK)**: "Kun trænere og klubadministratorer har adgang til
  følsomme oplysninger … Trænere har fuld adgang til kontaktoplysninger";
  members can hide their number from *other players* only.
  https://www.holdsport.dk/da/hold-app/holdsport-app-nem-medlemsstyring-for-traenere-og-klubber
- **ForeningLet (DK)**: search works on phone/email/"alle informationer";
  per-member-type column configuration is their scoping tool.
  https://docs.foreninglet.dk/documentation/danish/members.html
- **Cardskipper (SE)**: admins search by mobile number and the view "visas
  även medlemmens mobilnummer".
  https://www.cardskipper.com/sv/support/admin-user-documentation/
- **StyreWeb / MyClub / Deltager.no**: full registers/exports with phone;
  privacy approach is paperwork (confidentiality declarations, 2FA), not UI
  masking. Unknown: HyperSys, Zubarus, NIF KlubbAdmin, Checkin, SportMember,
  NMF Tutti (behind login, nothing public).
- **The market's privacy pattern is role/field-level visibility**, not digit
  masking — Spond per-field rights, ForeningLet per-type columns, Holdsport
  member-controlled peer hiding.

## 2. Global SaaS admin dashboards

- **Stripe**: search terms (including `email:`, `name:`, `postal:`) go in the
  URL, documented verbatim: "As search terms are included in the URL, you can
  bookmark the search or share it with other team members."
  https://docs.stripe.com/dashboard/search — while cards are last4-only
  everywhere (PCI). Customer phone shown in full.
- **Zendesk**: search results page offers "Copy link" for sharing query
  strings (`/agent/search/1?q=…`).
  https://support.zendesk.com/hc/en-us/articles/4408894221594
- **Intercom**: help docs themselves construct profile links with
  `?email=THE_USER_EMAIL`.
  https://www.intercom.com/help/en/articles/320-tracking-user-data-in-intercom
- **Salesforce Lightning**: term in a base64 `#` fragment (never reaches
  server logs — architectural accident, not policy); Classic used plain
  `?str=`.
- **Counter-pattern**: Cmd+K palette search (Linear, Notion, Shopify global
  search) keeps terms out of URLs as a side effect of SPA design, not as a
  stated privacy measure.
- **No vendor documents scrubbing admin-search query strings from logs.**
  Public "no PII in URLs" rules exist only for data sent to third parties
  (Google Analytics: "Both the URL path and parameters must be free of PII",
  https://support.google.com/analytics/answer/6366371) and as opt-in log
  scrubbing (Sentry server-side scrubbing, Datadog Sensitive Data Scanner).
- **Masking**: Stripe and Shopify show full phone; Zendesk masks phone/email
  from agents only via the paid ADPP add-on (off by default),
  https://support.zendesk.com/hc/en-us/articles/7713908123674. The only
  universally masked field anywhere is the card PAN.

## 3. Standards & enforcement

- **OWASP ASVS 5.0 14.2.1** (L1): sensitive data only in body/headers, "the
  URL and query string do not contain sensitive information, **such as an API
  key or session token**" — the canonical examples are secrets. ASVS 4.0
  8.3.1/13.1.3 same. Logging: 16.2.5 (L2) log sensitive data hashed/masked
  per protection level.
- **OWASP Logging Cheat Sheet** puts "non sensitive personal data (e.g.
  personal names, telephone numbers, email addresses)" in the softer
  "may need special treatment" tier, not the "do not log" tier.
- **RFC 9110 § 17.9** is the strongest text against the pattern: "unwise to
  include information within a URI that is sensitive, personally
  identifiable" — and in the same breath notes POST-instead-of-GET "hinders
  caching and uses an unsafe method for what would otherwise be a safe
  request". W3C's own guidance calls database search "ideal" for GET
  (bookmarkable, linkable): https://www.w3.org/2001/tag/doc/whenToUseGet.html
- **GDPR enforcement: none found on this exact pattern.** EDPB Art. 25
  guidelines say minimize/pseudonymize logs; Datatilsynet's design guidance
  says "hide and protect" but never mentions URLs/GET. Fines in the
  neighbourhood are different failures: SERGIC (CNIL €400k) was IDOR via URL
  editing; NAV/St. Olavs were fined for *missing* log control. Datatilsynet's
  own website privacy statement admits its server logs record "what you
  searched for".
- **Actual exposure here**: Referer is a non-issue under the default
  `strict-origin-when-cross-origin` policy (query never leaves our origin);
  what remains is admin browser history + Cloudflare Workers Logs (7-day
  retention, full URL, no query scrubbing documented; Tail Worker redaction
  heuristics target long hex/ID tokens and would NOT catch a phone number).

## 4. Why Vipps masks — and why it doesn't transfer

- In Vipps the phone number is the **account key**: it looks up a payment
  identity (even Folkeregisteret-hidden numbers resolve to names, which drew
  press criticism). Masking protects strangers from each other in a payment
  flow.
- Merchants get `maskedPhoneNo: "xxxx 5678"` in reports — behind an explicit
  `includeGDPRSensitiveData=true` flag — and the FULL number the moment the
  user passes a consent screen (Userinfo `phone_number: "4748571123"`,
  Profile Sharing). https://developer.vippsmobilepay.com/api/report/,
  https://developer.vippsmobilepay.com/docs/APIs/userinfo-api/userinfo-api-guide/
- So Vipps' own architecture is: **recognize → masked; contact (consented
  relationship) → full number.** Our admins are on the consented-relationship
  side of that line — members shared the number for the membership.
- Reveal-gates elsewhere protect pure identifiers (ADP masks SSNs behind a
  verification code), or work only because a proxy contact channel exists
  (Uber's number anonymization + in-app calls). Masking a number an admin
  must dial, with no proxy channel, is the documented failure mode
  ("agents respond from personal numbers").
- Only card PANs have a mandated display-masking rule (PCI DSS v4 req 3.4.1);
  no standard — NIST SP 800-122 included — mandates masking phone numbers in
  a back office.

## 5. Options if the acceptance is ever revisited

Cheapest first; none is currently planned:

1. **Trim log exposure, keep the UX**: `observability.logs.invocation_logs =
   false` in wrangler.jsonc kills the URL-carrying invocation lines (but the
   cloud-logs skill's request debugging with them — real cost); or a Tail
   Worker with custom query-param redaction.
2. **POST-redirect-GET**: RFC 9110's sanctioned middle path — term travels in
   the body, redirect lands on a clean URL. Loses bookmarkable searches.
3. **Browser-side filtering**: prototyped, verified, and reverted 2026-08-28
   (user preferred the plain GET search — see phone-number-privacy.md).
4. **Vipps-style masking in list rows only** (recognize) with the full number
   on the member detail page (contact) — the one masking variant precedent
   supports, would differentiate from every competitor rather than follow one.
