#!/usr/bin/env bash
set -euo pipefail

# Grab a still frame from a video, for use as a reel cover background.
# Usage: grab-frame.sh <video> <out.jpg> [timestamp-seconds]
#   timestamp defaults to 1.0s (avoids a black first frame).

IN="${1:?Usage: grab-frame.sh <video> <out.jpg> [timestamp-seconds]}"
OUT="${2:?Usage: grab-frame.sh <video> <out.jpg> [timestamp-seconds]}"
TS="${3:-1.0}"
[ -f "$IN" ] || { echo "Error: file not found: $IN" >&2; exit 1; }
command -v ffmpeg >/dev/null 2>&1 || { echo "Error: ffmpeg not found" >&2; exit 1; }
mkdir -p "$(dirname "$OUT")"

# -ss before -i seeks fast; -frames:v 1 grabs one frame; -q:v 2 = high quality.
ffmpeg -y -ss "$TS" -i "$IN" -frames:v 1 -q:v 2 "$OUT" >/dev/null 2>&1 \
  || { echo "Error: ffmpeg could not grab a frame at ${TS}s from $IN" >&2; exit 1; }
[ -f "$OUT" ] || { echo "Error: no frame written" >&2; exit 1; }
echo "$OUT"
