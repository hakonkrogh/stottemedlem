#!/usr/bin/env bash
# Give the seeded org a fixture logo + banner so public pages render the full
# visual identity (banner backdrop, circled logo). Generates FICTITIOUS PNGs
# with python3 stdlib (no ImageMagick/PIL needed), uploads them to the local R2
# bucket, and points the org row at them with correctly hashed keys
# (org/<id>/<kind>-<sha256-first-16>.png — the format orgImages.ts serves).
#
# Local R2 + D1 state live in apps/backoffice/.wrangler, shared live with a
# running `astro dev` — no restart needed. Run seed.sh first (needs the org row).
set -euo pipefail

SLUG="${1:-eksempel-musikkorps}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT/apps/backoffice"

ORG_ID=$(CI=1 pnpm exec wrangler d1 execute DB --local --json \
  --command "SELECT id FROM organizations WHERE slug='${SLUG}'" |
  python3 -c "import json,sys; r=json.load(sys.stdin)[0]['results']; print(r[0]['id'] if r else '')")
if [ -z "$ORG_ID" ]; then
  echo "no org with slug '${SLUG}' — run seed.sh first" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Solid/gradient fixture images — clearly not any real org's imagery.
python3 - "$TMP" <<'PY'
import struct, sys, zlib

def png(path, w, h, rgb_fn):
    raw = b"".join(
        b"\x00" + b"".join(bytes(rgb_fn(x, y)) for x in range(w)) for y in range(h)
    )
    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data))
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))

tmp = sys.argv[1]
# banner: amber→green gradient, uneven so a focal-point crop is visible
png(f"{tmp}/banner.png", 1200, 500, lambda x, y: (240 - y // 6, 170 + y // 10, 70 + x // 24))
# logo: dark disc on cream (tests the circle frame's object-fit: contain)
png(f"{tmp}/logo.png", 400, 400,
    lambda x, y: (40, 60, 90) if (x - 200) ** 2 + (y - 200) ** 2 < 160 ** 2 else (250, 245, 235))
PY

put() { # kind file -> echoes the object key it stored
  local kind="$1" file="$2"
  local hash key
  hash=$(shasum -a 256 "$file" | cut -c1-16)
  key="org/${ORG_ID}/${kind}-${hash}.png"
  CI=1 pnpm exec wrangler r2 object put "stottemedlem-media/${key}" \
    --file "$file" --content-type image/png --local >/dev/null
  echo "$key"
}

LOGO_KEY=$(put logo "$TMP/logo.png")
BANNER_KEY=$(put banner "$TMP/banner.png")

CI=1 pnpm exec wrangler d1 execute DB --local --command \
  "UPDATE organizations SET logo_key='${LOGO_KEY}', banner_key='${BANNER_KEY}' WHERE id='${ORG_ID}'" >/dev/null

echo "seeded images for ${SLUG}: ${LOGO_KEY} + ${BANNER_KEY}"
