# QR codes — @stottemedlem/qr + endpoint + demo page

Spec: `specs/use-cases/promote-with-qr-card.md` + `specs/concepts/join-page.md`.
Distinct from the *member's personal referral* QR (`specs/use-cases/earn-stars-and-recruit.md`).

## Package split (`packages/qr`) — respect it
- `@stottemedlem/qr` (index) — **isomorphic**, safe to bundle for the browser:
  `qrCardSvg({joinUrl, organizationName, ...})` (sync; self-contained 400×520 SVG,
  XML-escaped name, auto-shrinking font) and `qrSvg(url)` (async).
- `@stottemedlem/qr` also carries `memberCardSvg({...})` (`src/memberCard.ts`) —
  the MEMBER's card (specs/concepts/member-card.md), a different owner from
  `qrCardSvg`'s organization card. **ONE shape, 760×1040 UPRIGHT**
  (`memberCardSize()`, no argument). It had two for a few hours on 2026-08-31
  — a wide 1200×628 for link previews — and the user removed the wide one the
  same day; an image cannot reflow and the surface that matters is a phone, so
  the card is drawn for a phone and every surface embeds that. The layout is
  STACKED, not hand-placed at fixed `y`s, so a
  long name plus four rows of hearts still fits (a unit test asserts every
  placed x/y stays inside the canvas). Text width is estimated at 0.57 em per
  character DELIBERATELY wide (calibrated against Fraunces' Black cut and kept
  after the embedded face became the narrower brand 650 cut — see below). It **contains
  no emoji at all**: hearts, including the
  brand mark in the attribution, are `<path>` shapes, because the card is
  rasterized server-side with one embedded text font and no colour-emoji font.
  The logo travels as a data URI inside the SVG — a rasterizer cannot follow a
  link out to R2.
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

- **Member card** (added 2026-08-31, branch member-validity-card):
  `GET /medlemsbevis/<cardToken>` (page, noindex, og:image + twitter card),
  `…/kort.svg`, `…/kort.png` (`?bredde=` up to 2400, `?last=1` to download;
  `memberCardImagePath(token, format)` in core takes NO shape since
  2026-08-31, and the old `?form=staaende` is simply ignored).
  `MemberCardFigure.astro` is a bare `<img>` — full-bleed by default,
  `max-width: 24rem` above 34rem — plus an optional `shareUrl` share pill.
  Public in `src/middleware.ts` and routed on the APEX in `wrangler.jsonc`
  (`xn--stttemedlem-hgb.no/medlemsbevis/*`) — a share link has to be short and
  on the canonical domain. Token = `supporting_members.card_token`, NOT the
  agreement's manage token (that one can stop the membership). QR payload is
  `referredJoinPath(slug, cardToken)` on `shareableOrigin()`, so a scan credits
  the referral (`?verva=`). Assembly lives in
  `apps/backoffice/src/lib/memberCard.ts`; the same card is embedded on
  min-side and kvittering via `components/MemberCardFigure.astro`.
- **PNG rasterization** — `apps/backoffice/src/lib/cardImage.ts`, the only place
  SVG→PNG happens. Two Workers constraints, both non-obvious:
  (1) a Worker CANNOT compile WebAssembly at runtime, so
  `@resvg/resvg-wasm/index_bg.wasm` is a static import (the Cloudflare Vite
  plugin the Astro adapter uses emits it; declared in `src/assets.d.ts`, which
  `tsconfig.worker.json` must include or the worker typecheck fails while
  `astro check` stays green);
  (2) a Worker has NO system fonts, and text in a font resvg does not hold
  renders as NOTHING — so `src/assets/fonts/Fraunces.ttf` (OFL, committed with
  its licence) is inlined by Vite (`?inline` → base64 data URI) and passed as
  `fontBuffers`. Since 2026-09-01 that file is a STATIC instance of Fraunces
  at the website's brand cut (wght 650, SOFT 50, opsz 36, WONK 1 — matching
  packages/ui tokens; 73 KB instead of the 360 KB variable file), produced with
  `fonttools varLib.instancer`. resvg applies no variable axes or OpenType
  features regardless, so weight hierarchy on the card comes from size and
  colour — every `font-weight` in the SVG is 650 so BROWSERS drawing the same
  SVG (whose stack falls through to "Fraunces Variable", the website's family)
  land on the same weight, and the `Backoffice/Medlemsbevis` stories now match
  the shipped PNG closely instead of looking lighter.
  Surfaces embed the card as `<img src=…/kort.svg>`, and an SVG-as-image
  cannot load webfonts — so the SERVED SVG carries the font itself:
  `withEmbeddedCardFont` (cardImage.ts) injects the same 73 KB face as a
  data-URI @font-face into the kort.svg response (~110 KB total, cacheable).
  Only the served SVG gets it — the rasterizer holds the font as bytes, and
  the stored-PNG cache keys digest the SVG, so injecting earlier would churn
  cached pictures. Proof mechanism: load the SVG via `<img>` in a local HTML
  (webfont CSS never applies there) and compare glyphs with/without.

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
