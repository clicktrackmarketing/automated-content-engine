#!/usr/bin/env bash
set -euo pipefail

# Renders a make-graphic.mjs output directory (index.html + meta.json) to a
# crisp PNG using headless Chrome. Renders at 2x device scale for sharpness.
#
# Usage: render-graphic.sh <graphic-dir> [scale]
#   <graphic-dir>  dir containing index.html and meta.json
#   [scale]        device scale factor (default 2)
#
# Output: <graphic-dir>/graphic.png  (path printed to stdout)

DIR="${1:?Usage: render-graphic.sh <graphic-dir> [scale]}"
SCALE="${2:-2}"
DIR="$(cd "$DIR" && pwd)"
HTML="${DIR}/index.html"
META="${DIR}/meta.json"
OUT="${DIR}/graphic.png"

[ -f "$HTML" ] || { echo "Error: $HTML not found" >&2; exit 1; }
[ -f "$META" ] || { echo "Error: $META not found" >&2; exit 1; }

W=$(python3 -c "import json;print(json.load(open('$META'))['width'])")
H=$(python3 -c "import json;print(json.load(open('$META'))['height'])")

# Locate a headless Chrome/Chromium binary.
CHROME=""
for c in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Chromium.app/Contents/MacOS/Chromium" \
  "$(command -v chromium 2>/dev/null || true)" \
  "$(command -v google-chrome 2>/dev/null || true)"; do
  if [ -n "$c" ] && [ -x "$c" ]; then CHROME="$c"; break; fi
done
if [ -z "$CHROME" ]; then
  CHROME=$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium-*/chrome-mac/Chromium.app/Contents/MacOS/Chromium 2>/dev/null | head -1 || true)
fi
[ -n "$CHROME" ] || { echo "Error: no Chrome/Chromium binary found" >&2; exit 1; }

TMP=$(mktemp -d)
rm -f "$OUT"

# Some Chrome builds write the screenshot but don't exit promptly in headless
# mode. Run it in the background and stop it as soon as the PNG appears (or after
# a hard timeout), so the render never hangs the pipeline.
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-sandbox \
  --no-first-run --no-default-browser-check --disable-extensions \
  --disable-background-networking --disable-sync --mute-audio \
  --force-device-scale-factor="$SCALE" \
  --window-size="${W},${H}" \
  --default-background-color=00000000 \
  --user-data-dir="$TMP" \
  --screenshot="$OUT" \
  "file://${HTML}" >/dev/null 2>&1 &
CPID=$!

for _ in $(seq 1 40); do          # up to ~20s
  if [ -f "$OUT" ] && ! kill -0 "$CPID" 2>/dev/null; then break; fi
  if [ -f "$OUT" ]; then sleep 0.3; kill "$CPID" 2>/dev/null || true; break; fi
  sleep 0.5
done
kill "$CPID" 2>/dev/null || true
wait "$CPID" 2>/dev/null || true
rm -rf "$TMP"

[ -f "$OUT" ] || { echo "Error: render produced no file" >&2; exit 1; }

# Report the real pixel dimensions.
DIMS=$(python3 -c "
import struct
with open('$OUT','rb') as f:
    f.read(16); w,h=struct.unpack('>II', f.read(8))
print(f'{w}x{h}')
" 2>/dev/null || echo "?")
echo "$OUT ($DIMS)"
