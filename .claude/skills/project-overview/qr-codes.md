# QR codes — @stottemedlem/qr + endpoint + demo page

Spec: `specs/use-cases/promote-with-qr-card.md` + `specs/concepts/join-page.md`.
Distinct from the *member's personal referral* QR (`specs/use-cases/earn-stars-and-recruit.md`).

## Package split (`packages/qr`) — respect it
- `@stottemedlem/qr` (index) — **isomorphic**, safe to bundle for the browser:
  `qrCardSvg({joinUrl, organizationName, ...})` (sync; self-contained 400×520 SVG,
  XML-escaped name, auto-shrinking font) and `qrSvg(url)` (async).
- `@stottemedlem/qr` also carries `memberCardSvg({...})` (`src/memberCard.ts`) —
  the MEMBER's card (specs/concepts/member-card.md), a different owner from
  `qrCardSvg`'s organization card. **ONE shape, 760×860 UPRIGHT**
  (`memberCardSize()`, no argument; read the constants, they have moved twice:
  1040, then 960, then 860 when the QR left the middle on 2026-09-09).
  It had two shapes for a few hours on 2026-08-31
  (a wide 1200×628 for link previews) and the user removed the wide one the
  same day; an image cannot reflow and the surface that matters is a phone, so
  the card is drawn for a phone and every surface embeds that. The layout is
  STACKED, not hand-placed at fixed `y`s: the band and the footer are pinned to
  the card's edges and the member's block is centred in what is left, so a name
  that steps down a size does not move anything else (a unit test asserts every
  placed x/y stays inside the canvas). Years are ONE big heart carrying the
  count, never a heart per year, so the block's height barely varies with the
  member. Text width is estimated at 0.57 em per
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
- **Backoffice** `GET /bli-medlem/[slug]/qr`
  (`apps/backoffice/src/pages/bli-medlem/[slug]/qr.ts`). **It moved there from
  `/api/qr/[slug]` on 2026-09-10** (the user's call: the address is one an
  administrator reads and pastes into their own website, so it belongs beside
  the page it points at, not under an API path). Two things fall out of the
  move: the card is covered by the join page's existing apex zone route, so it
  needs none of its own, and `/org/<slug>/qr` redirects to it for free via
  worker.ts. The old address is now a 301 that carries the query string, and it
  must stay (`src/pages/api/qr/[slug].ts`).
  It is handed out on the CANONICAL APEX (`shareableQrCardUrl`), which the
  marketing worker owns, so it needs its own zone route in
  `apps/backoffice/wrangler.jsonc` (added 2026-09-10, after the address 404ed in
  production while every local check passed). Verify with `apex-routes.mjs` in
  `verify-public-routes`. Details:
  card SVG by default; `?variant=qr&format=png|svg`; `?download=1`. QR payload is
  `joinPageUrl(slug)`, never the request origin — printed codes must survive
  worker moves. **The name on the card is read from the org row**
  (`getOrganizationBySlug`), and a slug with no org row 404s (2026-09-10, when
  the card became a picture the back office SHOWS). Before that the name came
  from the URL (`?name=`, falling back to a Title-Cased slug), which predates
  persisted orgs: it printed "Og" mid-name and let a stranger put any name on a
  card. `?name=` is now ignored, and the URL shape is otherwise unchanged
  because embeds depend on it.
- **Backoffice front page** (`OrgQrCard.astro`, inside `OrgOverviewScreen`):
  the card is SHOWN, as `<img src="/bli-medlem/<slug>/qr">`, with both downloads and
  the embed address beside it (`specs/use-cases/promote-with-qr-card.md`,
  `specs/concepts/back-office.md`). Two things make it reviewable and correct:
  the component takes a `previewSrc` so a story can inline the card (Storybook
  serves no app routes), and the card's `FONT` is `system-ui`, so unlike the
  MEMBER card it needs no embedded webfont to render inside an `<img>`. The
  same `system-ui` plus the ❤️ emoji in its footer is why the card has no PNG
  variant: resvg holds one embedded text font and no colour-emoji font, so
  rasterizing it would silently change the typeface and drop the heart. The
  printable pair on offer is therefore the card as SVG (vector, scales) and the
  plain code as a 1024px PNG.
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
  the short SCAN address (`memberScanUrl`, its own section below), which hands
  over to `referredJoinPath(slug, cardToken)` so a scan still credits the
  referral (`?verva=`). It carried that join address directly until
  2026-09-09. Assembly lives in
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

## Domain routing — wired (2026-09-10)
The embed snippet + QR payloads use `https://xn--stttemedlem-hgb.no` paths, and
the apex serves the static marketing Worker except for the zone routes declared
on the backoffice. `/bli-medlem/*` covers the join page, its
`/bli-medlem/<slug>/vilkar` (both MUST resolve on the canonical domain before
any org pastes them into the Vipps portal) and now the QR card at
`/bli-medlem/<slug>/qr`. The card's former `/api/qr/*` kept its own route for
the 301 alone. Prove it with `apex-routes.mjs` in `verify-public-routes`.

## What the code SAYS (superseded 2026-08-20)
The QR payload no longer hands off straight to Vipps. Since membership tiers
landed, a supporter must SEE and PICK a tier first, so `/bli-medlem/<slug>` is
a real page that shows the offer and carries the picked tier onward
(`?medlemskap=<key>`) into Vipps — one address, one page (the earlier
2026-07-08 "scanning opens Vipps directly, no landing page" decision is dead).
A static `vipps://` link still can't work: each payment is its own transaction
and the fee can change.

## How BIG a QR gets is decided by what it SAYS (settled 2026-09-09)

The lever on a QR's size is its payload, not its drawn width. Two facts, both
measured with `node -e` against the `qrcode` lib in `packages/qr`, and worth
re-measuring the same way rather than guessing:

- **Length.** Member card payloads at error-correction M:
  `…/bli-medlem/<slug>?verva=<uuid>` = 104 chars → **41 modules**, and 122
  chars with a long slug → **45** (so the code's density used to depend on the
  organization's NAME). The short scan address = 59 chars → **29 modules**.
- **Mode.** A QR encodes `[0-9 A-Z space $%*+-./:]` in *alphanumeric* mode at
  11 bits per PAIR, everything else in *byte* mode at 8 bits each, and the
  mode is chosen per segment over the WHOLE string, so ONE lowercase letter
  anywhere costs the whole saving. Measured: the same 59-char address is 33
  modules in lower case and **29 in capitals**. That is why
  `memberScanUrl` upper-cases from the scheme onwards, and why the path is
  routed twice (below). A URL's scheme and host are case-insensitive by RFC
  3986; the path is ours to read either way.
- Don't trust a remembered capacity table: version 3-M holds **67** alphanumeric
  characters, not 47 (47 is the Q column). Ask the library
  (`create(url,{errorCorrectionLevel}).version`) instead of reasoning about it.
- Prove the size claim with `verify-qr --shrink`, which reports the narrowest
  the drawing may be and still decode (328 px → 239 px on this change).

## The member card's scan address (added 2026-09-09)

`GET /v/<code>` (`apps/backoffice/src/pages/v/[code].ts`) is what the member
card's QR encodes. It is a pure handover: decode → find the member → 302 to
`referredJoinPath(slug, cardToken)`, i.e. the SAME join page with `?verva=` as
before, so referral crediting is untouched and printed cards carrying the old
long address keep working. Unknown or malformed code → 404, revealing nothing.

- `memberScanCode` / `cardTokensFromScanCode` / `memberScanUrl` /
  `MEMBER_SCAN_PATH_SEGMENT` live in `@stottemedlem/core`; the lookup is
  `findScannedCardReferral` in `@stottemedlem/db`.
- The code is the existing `supporting_members.card_token`, 128 bits rewritten
  as 26 Crockford base32 capitals. **No new column, no migration**, and
  decoding returns TWO candidate tokens (dashed UUID and bare hex) because
  migration 0011 backfilled bare `hex(randomblob(16))` while
  `crypto.randomUUID()` writes dashes; both are looked up on the unique index.
- **A card token that is not 32 hex characters cannot be encoded**, and
  `cardScanUrl` (apps/backoffice/src/lib/memberCard.ts) then falls back to the
  long join address. Silent by design, but it means a fixture or seed with a
  readable token like `kort-seed-1` renders a card the product never makes,
  which is why `verify-public-routes/seed.sh` now seeds real UUIDs.
- **Case-sensitivity is the deployment gotcha.** A camera opens exactly what
  the code says, in capitals; Cloudflare route patterns match case-sensitively
  and so does Astro's file routing. So `wrangler.jsonc` declares BOTH
  `xn--stttemedlem-hgb.no/v/*` and `/V/*`, and `src/worker.ts` lower-cases the
  prefix before handing to Astro. Verified locally through `astro dev` (which
  runs worker.ts); the ROUTE half needs a staging deploy to confirm.
- `/v/` is public in `src/middleware.ts` alongside `/medlemsbevis/`.

## `qrcode` library gotchas (v1.5.x)
- Named CJS imports work, **but** Biome rejects importing `toString` (restricted
  global) — alias it (`toString as toStringQr`).
- `create()` is sync and exposes `modules` (BitMatrix: `.size`, `.get(row, col)`) —
  the card builds its own `<path>` from it instead of nesting the lib's SVG output.

## Verifying
`verify-qr` skill decodes a generated PNG and asserts the payload (scan-level proof).
Card is SVG: rasterize with `svgToPngBlob` in-app, or on macOS
`qlmanage -t -s 800 -o <outdir> card.svg` for a quick visual Read.
