---
name: verify-qr
description: Decode a generated QR code PNG (file or URL) and assert its payload — the real proof a QR feature works, the way a phone scanning it would. Use whenever QR generation/endpoints change.
---

# Verify QR codes as a scanner would

Build/tests passing does not prove a QR is scannable or encodes the right URL.
This skill decodes the actual pixels.

## Setup (first use only)
`node_modules` is gitignored; install deps inside this folder:

    cd .claude/skills/verify-qr && npm i --no-audit --no-fund

## Usage
    node .claude/skills/verify-qr/decode.mjs <png-path-or-url> [--expect <payload>]

Prints the decoded payload; exits non-zero if nothing decodes or `--expect` mismatches.

## Typical flow against the running app
1. Start backoffice (`pnpm --filter @stottemedlem/backoffice dev`, port 4322 —
   remember `astro dev stop` afterwards, see stack-docs).
2. Decode straight from the endpoint (payload is always the canonical punycode
   origin, regardless of where the server runs):

       node .claude/skills/verify-qr/decode.mjs \
         "http://localhost:4322/api/qr/<slug>?variant=qr&format=png" \
         --expect "https://xn--stttemedlem-hgb.no/bli-med/<slug>"

The card (`variant=card`) is SVG and shares the same encoder + payload as the plain
QR, so decoding the PNG variant covers it. To eyeball the card itself on macOS:
`qlmanage -t -s 800 -o <outdir> card.svg` → a PNG thumbnail the Read tool can display.
