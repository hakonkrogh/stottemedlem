---
name: verify-qr
description: Decode a generated QR code PNG (file or URL) and assert its payload — the real proof a QR feature works, the way a phone scanning it would — plus `--shrink`, which measures how SMALL the picture may be drawn and still decode. Use whenever QR generation/endpoints change, or whenever a code is resized or its payload shortened.
---

# Verify QR codes as a scanner would

Build/tests passing does not prove a QR is scannable or encodes the right URL.
This skill decodes the actual pixels.

## Setup (first use only)
`node_modules` is gitignored; install deps inside this folder:

    cd .claude/skills/verify-qr && npm i --no-audit --no-fund

## Usage
Run **from the repo root** — the path below is repo-root-relative, so running it
from inside the skill folder (where the `cd` in Setup leaves you) fails with
`Cannot find module .../.claude/skills/verify-qr/.claude/skills/...`:

    node .claude/skills/verify-qr/decode.mjs <png-path-or-url> [--expect <payload>]

Prints the decoded payload; exits non-zero if nothing decodes or `--expect` mismatches.

## `--shrink`: how small may it be drawn?

    node .claude/skills/verify-qr/decode.mjs <png> --shrink [--min <px>]

Box-filter downscales the picture in 10% steps and prints the narrowest width
that still decodes. **This, not a plain decode, is the measurement to take
whenever a code is made smaller or its payload is shortened**: a decode at
full size says nothing about the phone-sized copy the member actually holds up
to a camera, and "it looks fine" is not a number you can compare before and
after.

Two things it settles that nothing else does:

- **A shorter payload buys real room.** Measured on the member card
  (2026-09-09, same 760 px drawing): the old code carried the join address
  with the referral on it (41 modules) and stopped decoding below **328 px**;
  the short scan address (29 modules, see qr-codes.md) still decodes at
  **239 px**, with the code drawn a quarter narrower. Shortening what the code
  says is how a code gets smaller; drawing the same code smaller only breaks it.
- **The floor is for the whole picture**, so it accounts for the artwork
  around the code (quiet zone, captions crowding it, a card that shrank).
  Run it on the CARD, not on a cropped code.

Averaging rather than nearest-neighbour is deliberate: sampling drops whole
modules and reports a code as unscannable long before a real screen or printer
would.

## Typical flow against the running app
1. Start backoffice (`pnpm --filter @stottemedlem/backoffice dev`, port 4322 —
   remember `astro dev stop` afterwards, see stack-docs).
2. Decode straight from the endpoint. The payload origin is env-aware since
   2026-08-27: `JOIN_PAGE_ORIGIN` from `.dev.vars`/wrangler vars if set (staging
   sets its own origin), else the canonical punycode origin — never the
   request's origin:

       node .claude/skills/verify-qr/decode.mjs \
         "http://localhost:4322/api/qr/<slug>?variant=qr&format=png" \
         --expect "https://xn--stttemedlem-hgb.no/bli-medlem/<slug>"

The card (`variant=card`) is SVG and shares the same encoder + payload as the plain
QR, so decoding the PNG variant covers it. To eyeball the card itself on macOS:
`qlmanage -t -s 800 -o <outdir> card.svg` → a PNG thumbnail the Read tool can display.
