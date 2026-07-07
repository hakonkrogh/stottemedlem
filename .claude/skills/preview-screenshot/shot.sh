#!/usr/bin/env bash
# Render a URL to PNG via headless Chrome (no extension/driver needed).
# Usage: shot.sh <url> <out.png> [width] [height]
set -euo pipefail
URL="$1"
OUT="$2"
W="${3:-1440}"
H="${4:-1200}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# Chrome prints harmless profile/app errors on stderr — suppress them.
"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --window-size="${W},${H}" --screenshot="$OUT" "$URL" 2>/dev/null
echo "$OUT"
