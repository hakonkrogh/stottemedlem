# QR codes — @stottemedlem/qr + endpoint + demo page

Spec: `specs/use-cases/promote-with-qr-card.md` + `specs/concepts/join-page.md`.
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
  `joinPageUrl(slug)`, `CANONICAL_ORIGIN` (punycode!) — single source for what
  QR codes encode. QR payloads must always use the punycode origin, never raw ø.

## Surfaces
- **Backoffice** `GET /api/qr/[slug]` (`apps/backoffice/src/pages/api/qr/[slug].ts`):
  card SVG by default; `?variant=qr&format=png|svg`; `?download=1`; `?name=` display
  name (until organizations are persisted — then look it up; keep the URL shape
  stable, embeds depend on it). QR payload is `joinPageUrl(slug)`, never the
  request origin — printed codes must survive worker moves.
- **Marketing** front page (`apps/marketing/src/pages/index.astro`): a static
  QR-card *preview* for prospective orgs — `qrCardSvg(...)` is called in the Astro
  frontmatter (build time) and inlined as SVG, so there is no client JS and no
  download/embed tooling. Its QR intentionally points at `CANONICAL_ORIGIN` (back
  to the site) since it's illustrative. The old interactive `/qr-kort` studio was
  removed 2026-07-08 — the front page is the only marketing QR surface now.

## Open item — domain routing (decided intent, not wired)
The embed snippet + QR payloads use `https://xn--stttemedlem-hgb.no` paths
(`/bli-medlem/<slug>`, `/api/qr/<slug>` — the join page and its
`/bli-medlem/<slug>/vilkar` MUST resolve on the canonical domain before any org
pastes them into the Vipps portal), but that zone currently serves only the
static marketing Worker → `/api/qr/*` 404s in production today. Intended
wiring: zone routes (`.../api/*`) → the backoffice Worker alongside the
`/bli-medlem/*` + legacy `/org/*` routes already declared; routes coexist with
the marketing custom domain and win by specificity. **Superseded 2026-08-20:**
the QR payload no longer hands off straight to Vipps. Since membership tiers
landed, a supporter must SEE and PICK a tier first, so `/bli-medlem/<slug>` is
a real page that shows the offer and carries the picked tier onward
(`?medlemskap=<key>`) into Vipps — one address, one page (the earlier
2026-07-08 "scanning opens Vipps directly, no landing page" decision is dead).
A static `vipps://` link still can't work: each payment is its own transaction
and the fee can change.

## `qrcode` library gotchas (v1.5.x)
- Named CJS imports work, **but** Biome rejects importing `toString` (restricted
  global) — alias it (`toString as toStringQr`).
- `create()` is sync and exposes `modules` (BitMatrix: `.size`, `.get(row, col)`) —
  the card builds its own `<path>` from it instead of nesting the lib's SVG output.

## Verifying
`verify-qr` skill decodes a generated PNG and asserts the payload (scan-level proof).
Card is SVG: rasterize with `svgToPngBlob` in-app, or on macOS
`qlmanage -t -s 800 -o <outdir> card.svg` for a quick visual Read.
