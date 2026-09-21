#!/usr/bin/env bash
set -euo pipefail

# Transcribe a video/audio file to plain text (for repurposing into content).
# Wraps ffmpeg (16k mono WAV) + hyperframes whisper. Prints the transcript path;
# writes <input-basename>.transcript.txt and .transcript.json next to the input.
#
# Usage: transcribe.sh <video-or-audio-file> [out-dir]
#
# Notes (from docs/RUNBOOK.md):
#   - hyperframes writes transcript.json NEXT TO the input and overwrites an
#     existing one, so we transcribe a temp wav and move the result immediately.
#   - Pre-cache the model once: ~/.cache/hyperframes/whisper/models/ggml-small.en.bin

IN="${1:?Usage: transcribe.sh <video-or-audio-file> [out-dir]}"
[ -f "$IN" ] || { echo "Error: file not found: $IN" >&2; exit 1; }
OUT_DIR="${2:-$(cd "$(dirname "$IN")" && pwd)}"
mkdir -p "$OUT_DIR"
BASE="$(basename "${IN%.*}")"

command -v ffmpeg >/dev/null 2>&1 || { echo "Error: ffmpeg not found" >&2; exit 1; }
command -v hyperframes >/dev/null 2>&1 || { echo "Error: hyperframes not found (npm i -g hyperframes)" >&2; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
WAV="${WORK}/audio16k.wav"

# Extract mono 16kHz PCM — what whisper wants.
ffmpeg -y -i "$IN" -vn -ac 1 -ar 16000 -c:a pcm_s16le "$WAV" >/dev/null 2>&1 \
  || { echo "Error: ffmpeg failed to extract audio from $IN" >&2; exit 1; }

# Transcribe. hyperframes writes transcript.json next to the WAV.
hyperframes transcribe "$WAV" --json >/dev/null 2>&1 \
  || { echo "Error: hyperframes transcribe failed" >&2; exit 1; }
JSON_SRC="${WORK}/audio16k.transcript.json"
[ -f "$JSON_SRC" ] || JSON_SRC="${WORK}/transcript.json"
[ -f "$JSON_SRC" ] || { echo "Error: no transcript produced" >&2; exit 1; }

JSON_OUT="${OUT_DIR}/${BASE}.transcript.json"
TXT_OUT="${OUT_DIR}/${BASE}.transcript.txt"
cp "$JSON_SRC" "$JSON_OUT"

# Flatten to plain text (join segment/word text; tolerate a few json shapes).
python3 - "$JSON_SRC" "$TXT_OUT" << 'PY'
import sys, json
d = json.load(open(sys.argv[1]))
def text_of(o):
    if isinstance(o, str): return o
    if isinstance(o, dict):
        if 'text' in o and isinstance(o['text'], str): return o['text']
        return ' '.join(text_of(v) for v in o.values() if isinstance(v,(str,list,dict)))
    if isinstance(o, list): return ' '.join(text_of(x) for x in o)
    return ''
if isinstance(d, str):
    txt = d
elif isinstance(d, dict):
    txt = text_of(d.get('segments') or d.get('words') or d)
else:
    txt = text_of(d)
txt = ' '.join(txt.split())
open(sys.argv[2],'w').write(txt)
print(txt[:280] + ('…' if len(txt) > 280 else ''))
PY

echo "---" >&2
echo "transcript: ${TXT_OUT}" >&2
