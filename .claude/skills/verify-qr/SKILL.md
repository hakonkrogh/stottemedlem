---
name: verify-qr
description: Decode a generated QR code PNG (file or URL) and assert its payload — the real proof a QR feature works, the way a phone scanning it would — plus `--shrink`, which measures how SMALL the picture may be drawn and still decode, and `budget.mjs`, which measures how much of a code a LOGO may cover before it stops decoding. Use whenever QR generation/endpoints change, whenever a code is resized or its payload shortened, or before drawing anything on top of a code.
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

## `budget.mjs`: how much may a LOGO cover?

    node .claude/skills/verify-qr/budget.mjs "<payload>" [--ec L,M,Q,H] [--cover <percent-of-width>]

Takes a **payload, not a PNG**: this is the question you have *before* drawing
anything, so there is no picture yet. For each error-correction level it prints
the version and module count, the largest centred cover that still decodes, a
"safe to draw" figure (half the breaking point), and, with `--cover`, whether a
proposed size passes and what it costs on the shrink floor.

The cover is modelled as a **white square measured in modules**, which is both
conservative (a square hides more than the shape inside it) and accurate: a
logo on a QR needs a white pad under it anyway, or the binarizer reads its dark
pixels as modules. `#e0182d` is dark enough to matter.

**Raising the error-correction level is not free**, and this is the trade the
tool exists to show: it buys cover budget by adding modules, and more modules
means each one is smaller at a given printed size. On the member scan address,
M→H doubles the affordable cover (28%→43% of width) but moves the code from 29
to 37 modules, so the shrink floor rises with it. Read both numbers before
reaching for H.

## Typical flow against the running app
1. Start backoffice and seed it:

       bash .claude/skills/verify-public-routes/seed.sh
       bash .claude/skills/dev-logs/devlog.sh start
       PORT=$(bash .claude/skills/dev-logs/devlog.sh port)

   **Read the port back; never hardcode 4322.** When it is taken (another
   worktree) astro moves on silently, and a URL built from 4322 then drives
   somebody else's server against their D1 (see dev-logs). Stop with
   `devlog.sh stop` afterwards.

2. Decode straight from the endpoint. The payload origin is env-aware since
   2026-08-27: `JOIN_PAGE_ORIGIN` from `.dev.vars`/wrangler vars if set (staging
   sets its own origin), else the canonical punycode origin — never the
   request's origin:

       node .claude/skills/verify-qr/decode.mjs \
         "http://localhost:$PORT/bli-medlem/<slug>/qr?variant=qr&format=png" \
         --expect "https://xn--stttemedlem-hgb.no/bli-medlem/<slug>"

## One code, every surface

The product hands out the same code from three places: the organization's card,
the member's card, and the plain download (PNG **and** SVG). They are supposed
to be one picture, heart and all (qr-codes.md).

**This is not something to take on trust, and it used to be false.** Until
2026-09-17 this file said decoding one variant covered the others because they
"share the same encoder". They did not: the plain PNG came from the `qrcode`
library's own renderer while the cards were drawn by hand, so when the codes
gained the heart in their middle the PNG quietly kept handing out a bare code.
The second renderer is gone, but the way to catch it coming back is to check
the surfaces against each other rather than to reason about who calls what:

    # every surface decodes to the payload
    for v in "?variant=qr&format=png" "?variant=qr&format=svg" ""; do
      node .claude/skills/verify-qr/decode.mjs \
        "http://localhost:$PORT/bli-medlem/<slug>/qr$v" --expect "<payload>"
    done

Two of those are SVG, which `decode.mjs` cannot read (it wants pixels), so
rasterize them first with `preview-screenshot/shot.sh "file://<abs>.svg" out.png`.
Counting `#e0182d` in an SVG is the cheap version of the same question: the
org card holds exactly 2 (attribution + code), the plain code SVG exactly 1.

To eyeball the card itself on macOS: `qlmanage -t -s 800 -o <outdir> card.svg`
→ a PNG thumbnail the Read tool can display. For the cards specifically,
`render-card --raster` is the better loop: no server, every fixture at once.
