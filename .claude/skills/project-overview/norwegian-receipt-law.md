# Norwegian receipt/bookkeeping rules for membership fees

Verified 2026-08-28 against the primary sources (see "How to re-fetch" below).
This is the legal ground truth behind `specs/concepts/payment-receipt.md` and
`packages/email/src/membershipReceipt.ts` — read it before changing receipt
content or answering "what must a kvittering contain?".

## The one paragraph written for this product

**Bokføringsforskriften § 5-1-6b (Medlemskontingenter)**, verbatim:

> Ikke avgiftspliktig medlemskontingent i ideelle organisasjoner som
> regnskapsmessig anses opptjent på betalingstidspunktet, kan dokumenteres med
> betalingsdokumentasjon. Betalingsdokumentasjon skal i slike tilfeller
> inneholde opplysninger som nevnt i § 5-1-1 nr. 2 til 5.

So a membership fee in an ideal org needs only *betalingsdokumentasjon*
(payment documentation) carrying § 5-1-1 nr. 2–5 — NOT a full salgsdokument.

## § 5-1-1 — what nr. 2–5 are

1. Nummer og dokumentasjonsdato — **NOT required** for membership fees (only
   nr. 2–5 apply via § 5-1-6b). No sequential receipt numbering needed; don't
   invent one.
2. **Angivelse av partene.** Per § 5-1-2: seller = name + organisasjonsnummer
   (followed by "MVA" only if VAT-registered — our orgs are not, for the
   kontingent). Buyer = name, plus address OR orgnr. *Known product gap:* we
   only hold the member's name from Vipps userinfo, no address — accepted and
   noted in the spec; matters only if a business member expenses the fee.
3. **Ytelsens art og omfang** — "Medlemskontingent — «tier name»".
4. **Tidspunkt og sted for levering** — the annual period, first to last day.
5. **Vederlag og betalingsforfall** — amount actually paid + payment date.

Nr. 6 (VAT specification) is not required either, but the receipt states the
exemption anyway (see below) because it answers the obvious question.

## VAT

**Merverdiavgiftsloven § 3-13 first ledd**: sales from ideal organizations are
exempt when the consideration is a medlemskontingent and part of the ideal
activity. "Ideelle" includes veldedige/allmennyttige orgs — marching bands,
choirs, community groups are the textbook case. So: MVA 0 kr, and the receipt
says why.

## Rules that do NOT apply (checked, so nobody re-litigates them)

- **Kassasystem/kontantsalg (§ 5-3-\*)**: "Salg over internett … anses ikke
  som kontantsalg" (§ 5-3-1 a). Vipps recurring on the web is internet sale —
  no cash-register requirements.
- **§ 5-2-9 non-editable file format** (the "must be PDF" rule): applies to
  *salgsdokumenter* issued electronically. § 5-1-6b documentation is
  *betalingsdokumentasjon*, not a salgsdokument — an HTML page + email is
  sound. Don't build PDF generation for this reason alone.
- **Tax deductibility**: a kontingent is not a "gave" under skatteloven § 6-50
  and is generally not deductible for private members — the receipt must NOT
  claim deductibility.
- Retention: bokføringsloven § 13 — 5 years for primary accounting
  documentation (already noted in `docs/research/vipps-recurring-payments.md`
  and migration 0005's header).

## How to re-fetch the sources

WebFetch summarizes with a small model and DROPS legal text (same failure mode
as the Vipps-docs gotcha). Curl + strip tags instead:

```sh
curl -sL 'https://lovdata.no/forskrift/2004-12-01-1558/%C2%A75-1-1' \
  -A 'Mozilla/5.0' -o bokf.html   # full forskrift page, ~385 KB, no auth
# then strip tags and find the SECOND occurrence of "§ 5-1-1." — the first is
# the table of contents, the body follows it.
```

- Bokføringsforskriften: https://lovdata.no/forskrift/2004-12-01-1558
- Mval § 3-13 with Skatteetaten's commentary (medlemskontingent chapter):
  https://www.skatteetaten.no/en/rettskilder/type/handboker/merverdiavgiftshandboken/gjeldende/M-3/M-3-13/
