#!/usr/bin/env bash
set -euo pipefail

TEXT="${1:?Usage: elevenlabs-tts.sh <text> <output_path> [voice_id] [model_id]}"
OUTPUT_PATH="${2:?Usage: elevenlabs-tts.sh <text> <output_path> [voice_id] [model_id]}"
VOICE_ID="${3:-21m00Tcm4TlvDq8ikWAM}"  # Rachel (default)
MODEL_ID="${4:-eleven_v3}"

if [ -z "${ELEVEN_API_KEY:-}" ]; then
  echo "Error: ELEVEN_API_KEY environment variable is not set"
  echo "Set it in ~/.zshrc: export ELEVEN_API_KEY=\"your-key-here\""
  exit 1
fi

echo "Generating TTS with ElevenLabs..."
echo "  Voice: ${VOICE_ID}"
echo "  Model: ${MODEL_ID}"
echo "  Text: ${TEXT:0:80}..."

HTTP_CODE=$(curl -s -w "%{http_code}" -o "${OUTPUT_PATH}" \
  -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}" \
  -H "xi-api-key: ${ELEVEN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": $(python3 -c "import json; print(json.dumps('${TEXT}'))"),
    \"model_id\": \"${MODEL_ID}\",
    \"voice_settings\": {
      \"stability\": 0.5,
      \"similarity_boost\": 0.75,
      \"style\": 0.0,
      \"use_speaker_boost\": true
    }
  }")

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  SIZE=$(wc -c < "${OUTPUT_PATH}" | tr -d ' ')
  echo "Generated ${OUTPUT_PATH} (${SIZE} bytes)"
else
  echo "ElevenLabs API error (HTTP ${HTTP_CODE}):"
  cat "${OUTPUT_PATH}" 2>/dev/null
  rm -f "${OUTPUT_PATH}"
  exit 1
fi
