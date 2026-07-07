#!/usr/bin/env bash
# Render a URL to PNG via headless Chrome (no extension/driver needed).
# Usage: shot.sh <url> <out.png> [width] [height]
set -euo pipefail
URL="$1"
OUT="$2"
W="${3:-1440}"
H="${4:-1200}"
if [ "$W" -lt 500 ]; then
  # macOS clamps Chrome windows to >=500px wide even under --headless=new, so a
  # narrower --window-size silently renders a 500px-wide layout clipped to the
  # requested PNG width — mobile shots look broken when the page is fine (and
  # vice versa). Emulate the viewport via Playwright driving the installed
  # Chrome instead (no browser download; the npm package is cached after the
  # first run). --full-page: the PNG spans the whole page, and its width
  # exceeding $W is a positive signal of real horizontal overflow.
  npx -y playwright screenshot --channel=chrome --full-page \
    --viewport-size="${W},${H}" "$URL" "$OUT" >/dev/null 2>&1
else
  CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  # Chrome prints harmless profile/app errors on stderr — suppress them.
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --window-size="${W},${H}" --screenshot="$OUT" "$URL" 2>/dev/null
fi
echo "$OUT"
