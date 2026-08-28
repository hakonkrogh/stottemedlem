# Phone numbers & member personal data — legal ground truth

Researched 2026-08-28 (branch mask-phone-numbers), prompted by Vipps masking
phone numbers (last 3–4 digits) throughout their app. Read before changing how
member contact details are displayed, exported, or before re-litigating
"should we mask like Vipps?".

## The short answer

**No law requires masking phone numbers.** Vipps' pattern comes from the
payment-card world: PCI DSS req. 3.3 *mandates* masking card PANs (show at most
first 6/last 4). Phone numbers have no equivalent mandate — not in GDPR, not in
Norwegian law. Masking phone numbers is a *voluntary* privacy-by-default
measure, sensible in Vipps' context (the number is the login identifier; the
viewer only needs to recognize it, never dial it).

## What the law actually says

- **GDPR art. 5(1)(c) (dataminimering) + art. 25(2) (privacy by default).**
  Datatilsynet's innebygd-personvern guidance phrases it "Minimér og skjul" —
  show/process no more than the purpose needs. This is the only legal hook a
  masking argument can hang on, and it cuts by *purpose*, not by field.
- **The org's purpose is contact.** A forening registering members' name,
  email, phone to collect the fee and reach members has a valid basis
  (art. 6(1)(b) contract / 6(1)(f) legitimate interest — standard DPA guidance
  for foreninger). Showing the FULL number to an org admin whose job is to
  contact that member is squarely within the purpose; masking it there would
  defeat the purpose without being required.
- **What IS restricted:** publishing a member list publicly. Nothing public in
  the product shows member contact data (verified 2026-08-28: emails, receipt
  page, min-side, public join pages all phone-free).
- **Receipts don't need phone.** § 5-1-1 nr. 2–5 (see norwegian-receipt-law.md)
  wants the buyer's *name*; the receipt email/page correctly never includes
  phone.
- **Logs are the real minimization frontier.** The product's own invariant
  (specs/concepts/operational-alerting.md, packages/log/src/types.ts): member
  name/email/phone never leave through vendor sinks. That is the spirit of
  art. 5(1)(c) applied where it matters.

## Where phone numbers actually appear (audit 2026-08-28)

One field: `supporting_members.phone` (captured once from Vipps userinfo,
scope `name email phoneNumber`). Full-number surfaces, ALL admin-gated:
member list rows + detail InfoList/edit form (`MemberRow.astro`,
`MemberDetailScreen.astro`), CSV export (`eksport.csv.ts`). Absent from:
all emails, kvittering, min-side, public pages, JSON APIs, log call sites.

Gaps the audit found (real minimization issues, unlike blanket masking):
1. **Search puts phone in the URL** — member search is `method="get"`
   (`?sok=…`), so a searched number lands in browser history, Referer, and
   Workers request logs — the one path phone reaches a vendor log sink.
   **Status: ACCEPTED as an open question** (user decision 2026-08-28, spec
   `use-cases/curate-member-list.md` § Open questions). A browser-side live
   filter was built, verified, and REVERTED the same day — the user preferred
   the plain GET search. Don't rebuild it without a new decision. Precedent
   research (docs/research/pii-in-admin-urls-and-phone-masking.md) backs the
   acceptance: search-in-URL is the documented norm (Stripe/Zendesk ship it
   as a feature), no DPA enforcement on the pattern exists, competitors don't
   mask admin-facing phone numbers, and Vipps' masking is a strangers-payment
   pattern that doesn't transfer to consented member relationships.
2. **Phone-only members get their number as the page `<title>`** and heading
   (`displayName` fallback name → email → phone in `[memberId].astro` +
   `MemberRow.astro`; the public kvittering deliberately stops at email).
3. No retention/anonymization of lapsed members exists (an old
   `docs/architecture/overview.md` intent, never specced or built).

## Sources

- Datatilsynet dataminimering: https://www.datatilsynet.no/rettigheter-og-plikter/personvernprinsippene/grunnleggende-personvernprinsipper/dataminimering/
- Datatilsynet personvern som standard ("Minimér og skjul"): https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/innebygd-personvern-og-personvern-som-standard/hva-er-personvern-som-standard/
- Danish DPA forening FAQ (same GDPR analysis, more explicit on member lists):
  https://www.datatilsynet.dk/regler-og-vejledning/gdpr-univers-for-smaa-foreninger/faq
- PCI DSS req. 3.3 (why card-adjacent apps mask): the PAN masking rule —
  contrast, not authority, for phone numbers.
