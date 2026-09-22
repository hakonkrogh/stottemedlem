# Better Stack: the transfer basis, and what else touches the data

**Checked 2026-09-22.** Written because
`apps/backoffice/src/pages/databehandleravtale.astro` section 4 promises every
organization that each subprocessor works "innenfor EU/EØS eller på et gyldig
overføringsgrunnlag". Better Stack is the first subprocessor relying on the
second half of that sentence, so the basis has to be a thing we checked rather
than a thing we assumed. This records what was found, not the vendor's text.

## The short answer

The basis exists, and nothing needs signing.

- **The agreement is already in force.** Better Stack's terms of use state that
  data processing is governed by the agreement at `betterstack.com/dpa` and
  that it is part of the terms. So accepting the terms at signup accepted it,
  free plan included. There is no separate request, signature or enterprise
  gate.
- **It incorporates EU Standard Contractual Clauses** for restricted transfers,
  deeming them part of the agreement. Schedule D applies Module Two or Module
  Three, with adapted clauses for the UK and Switzerland.
- It also names certification under the EU-US, Swiss-US and UK-US Data Privacy
  Frameworks as a basis the parties may rely on. **That certification was NOT
  independently verified here**; the public Data Privacy Framework list was not
  successfully searched. It does not change the answer, because the Standard
  Contractual Clauses are incorporated regardless and stand on their own.
- Processor entity: Better Stack, Inc., a Delaware corporation.
- The agreement was last updated 25 February 2025. Schedules, including the
  subprocessor list, are published at `betterstack.com/dpa/schedules`.

## The thing worth knowing: their subprocessors include OpenAI

Schedule A lists nine subprocessors. Most are unremarkable infrastructure
(Amazon Web Services, Google Ireland, Cloudflare, Hetzner) and business tooling
(Front, ChartMogul, Linear, Slack). One is not:

**OpenAI, L.L.C. (United States), for AI services.**

Better Stack's error tracking advertises AI summaries of exceptions, so this is
very likely the path by which an exception we send is summarised. Whatever
reaches Better Stack's error channel should be assumed to be capable of
reaching OpenAI.

That does not breach anything we have promised. Our own agreement permits named
subprocessors with a valid transfer basis, and theirs is named and covered. But
it raises the price of the gap recorded in
`specs/concepts/operational-alerting.md`: alerts are **pseudonymous, not
anonymous**, and the redaction in `packages/log` covers the request (body,
cookies, secret headers, the member's login token) and NOT the exception
message or stack trace. Raw error text is whatever string the failing code
produced, and it is the realistic way a member's e-mail address would leave the
product. It would now leave it towards a model provider, not merely a log store.

## What is still open

- Guarding raw error text before it is sent. This is the live decision.
- If the subprocessor list matters to us over time, it is published, so it can
  be re-read rather than asked about. Nothing notifies us when it changes.

## Sources

- betterstack.com/terms (incorporation of the agreement into the terms)
- betterstack.com/dpa (Standard Contractual Clauses, Data Privacy Framework,
  last updated date)
- betterstack.com/dpa/schedules (Schedule A subprocessors, Schedule D transfers)
- betterstack.com/security (data residency, SOC 2 Type II)
