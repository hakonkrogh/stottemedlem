---
name: render-card
description: Draw the member card and the org QR card from real `@stottemedlem/qr` code with NO dev server, D1 or auth — and rasterize them through the same resvg + embedded-Fraunces path the Worker ships, which is the only way to see what a shared PNG, og:image or receipt attachment actually looks like. Use for any change to card artwork, layout or text fitting.
---

# Render the cards

    node .claude/skills/render-card/render.mjs --raster
    # then: bash .claude/skills/preview-screenshot/shot.sh \
    #         "file://$(pwd)/.card-preview/index.html" <out.png> 900 4000

Rebuilds `@stottemedlem/qr` (turbo-cached, ~40ms warm), draws every fixture,
and writes `card-<case>.svg`, `raster-*.png` and an `index.html`
contact sheet showing browser-rendered and rasterized side by side. Screenshot
that one file and you have reviewed every case at once.

    --case A,B               fixture(s) to draw (default all)
    --time N                 with --raster: ms per render (the CPU budget)
    --set key=value          override one field, repeatable
    --org-card               the ORGANISATION's qrCardSvg instead
    --raster                 also rasterize via the shipped resvg path
    --out DIR                default <repo>/.card-preview
    --no-build / --list / --help

Examples:

    render.mjs --list
    render.mjs --case LongNames --raster
    render.mjs --case WithLogo --set hearts=17 --set recruits=4 --raster

## Why `--raster` is the pass that counts

**resvg applies no variable font axes.** It draws every line at Fraunces'
DEFAULT (heavy) instance, so rasterized text is both bolder and *wider* than
what a browser — or Storybook — shows. A line that fits in Storybook can still
overrun the card in the PNG people actually receive. This is why
`memberCardSvg`'s width estimate is a deliberately wide 0.57 em per character;
if you retune it, retune it against `--raster` output, never the browser.

The rasterizer also has no system fonts and cannot fetch anything, so this pass
is what catches a missing embedded font (text renders as *nothing at all*) and
a logo referenced by URL instead of carried as a data URI.

## Where this fits among the other loops

| loop | proves |
|------|--------|
| `render-card --raster` | the artwork itself — layout, fitting, the shared PNG. No server. |
| Storybook (`pnpm story`, `MemberCard.stories.ts`) | the same artwork with real variable-weight text; the human review surface |
| `preview-screenshot` on `/medlemsbevis/<token>` | the artwork **in its page**, incl. the full-bleed / `max-width` sizing — needs `verify-public-routes/seed.sh` + a dev server |
| `verify-qr` | that the QR in the card decodes to the right payload |

Fixtures are fictitious on purpose (rendered cards end up in screenshots and
docs). Keep them in step with `apps/backoffice/src/components/MemberCard.stories.ts`
— same cases, different renderer.

`.card-preview/` is scratch output; write it to the session scratchpad with
`--out` if you would rather not leave it in the tree.

## What a render costs — check before putting one on a request path

    node .claude/skills/render-card/render.mjs --case WithLogo --raster --time 3

Measured 2026-08-31: **~310 ms per card** at the card's own width (~570 ms at
1024 px) on an M-series Mac — resvg parses the whole 360 KB Fraunces for every
call, so the cost is per render and does not amortize. A Cloudflare Worker is
slower still, while the rest of this app's requests sit at **10–80 ms CPU**
(`cloud-logs` → `cost`).

So one rasterization is roughly an order of magnitude more CPU than a whole
normal request, and a loop that renders per row scales straight into
Cloudflare's CPU limit — the browser shows **Error 1102, "Worker exceeded
resource limits"**, and the request is killed before it can log anything or
write down the work it finished. That is exactly what
`sendOwedReceipts` (a card PNG per owed receipt, called inline from the Vipps
webhook receiver AND the receipt page) did on staging on 2026-08-31: two owed
receipts ≈ 2 s CPU ≈ dead, and dying before recording the send kept them owed,
so every webhook retry repeated it.

Rule of thumb: rasterize at most once per request, and prefer a cron/queue or a
cached PNG for anything that could need several.
