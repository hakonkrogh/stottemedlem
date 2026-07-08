# QR codes — @stottemedlem/qr + endpoint + demo page

Spec: `specs/use-cases/promote-with-qr-card.md` + `specs/concepts/join-entry-point.md`.
Distinct from the *member's personal referral* QR (`specs/use-cases/earn-stars-and-recruit.md`).

## Package split (`packages/qr`) — respect it
- `@stottemedlem/qr` (index) — **isomorphic**, safe to bundle for the browser:
  `qrCardSvg({joinUrl, organizationName, ...})` (sync; self-contained 400×520 SVG,
  XML-escaped name, auto-shrinking font) and `qrSvg(url)` (async).
- `@stottemedlem/qr/node` — `qrPngBuffer(url)`; pulls in pngjs/zlib, so it lives in
  its own entry. Works on Workers with `nodejs_compat` (backoffice has it).
- `@stottemedlem/qr/browser` — DOM-only: `svgToPngBlob(svg, {scale})`, `downloadBlob`.
- Do NOT re-merge these entries: `qrcode`'s package.json `browser` field swaps in a
  build without `toBuffer`, so an isomorphic entry importing it breaks browser bundles.
- Related helpers live in `@stottemedlem/core`: `slugifyOrganizationName`,
  `joinEntryPointUrl(slug)`, `CANONICAL_ORIGIN` (punycode!) — single source for what
  QR codes encode. QR payloads must always use the punycode origin, never raw ø.

## Surfaces
- **Backoffice** `GET /api/qr/[slug]` (`apps/backoffice/src/pages/api/qr/[slug].ts`):
  card SVG by default; `?variant=qr&format=png|svg`; `?download=1`; `?name=` display
  name (until organizations are persisted — then look it up; keep the URL shape
  stable, embeds depend on it). QR payload is `joinEntryPointUrl(slug)`, never the
  request origin — printed codes must survive worker moves.
- **Marketing** front page (`apps/marketing/src/pages/index.astro`): a static
  QR-card *preview* for prospective orgs — `qrCardSvg(...)` is called in the Astro
  frontmatter (build time) and inlined as SVG, so there is no client JS and no
  download/embed tooling. Its QR intentionally points at `CANONICAL_ORIGIN` (back
  to the site) since it's illustrative. The old interactive `/qr-kort` studio was
  removed 2026-07-08 — the front page is the only marketing QR surface now.

## Open item — domain routing (decided intent, not wired)
The embed snippet + QR payloads use `https://xn--stttemedlem-hgb.no` paths
(`/bli-med/<slug>`, `/api/qr/<slug>`), but that zone currently serves only the static
marketing Worker → these 404 in production today. Intended wiring: zone routes
(`.../bli-med/*`, `.../api/*`) → the backoffice Worker; routes coexist with the
marketing custom domain and win by specificity. `/bli-med/<slug>` itself lands with
the Vipps integration as a create-payment-and-redirect hand-off (**decided
2026-07-08: scanning must open Vipps directly** — identity via Vipps profile
sharing, no landing page; a static `vipps://` link can't work since each payment is
its own transaction and the fee can change).

## `qrcode` library gotchas (v1.5.x)
- Named CJS imports work, **but** Biome rejects importing `toString` (restricted
  global) — alias it (`toString as toStringQr`).
- `create()` is sync and exposes `modules` (BitMatrix: `.size`, `.get(row, col)`) —
  the card builds its own `<path>` from it instead of nesting the lib's SVG output.

## Verifying
`verify-qr` skill decodes a generated PNG and asserts the payload (scan-level proof).
Card is SVG: rasterize with `svgToPngBlob` in-app, or on macOS
`qlmanage -t -s 800 -o <outdir> card.svg` for a quick visual Read.
