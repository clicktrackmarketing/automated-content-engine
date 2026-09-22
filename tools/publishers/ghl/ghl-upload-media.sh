#!/usr/bin/env bash
set -euo pipefail

# Uploads a local video file to GHL Media Library and returns the public URL
# Usage: ghl-upload-media.sh <video-file>
# Env: GHL_API_KEY, GHL_LOCATION_ID

FILE_PATH="${1:?Usage: ghl-upload-media.sh <video-file>}"

: "${GHL_API_KEY:?Set GHL_API_KEY environment variable (Private Integration Token)}"
: "${GHL_LOCATION_ID:?Set GHL_LOCATION_ID environment variable}"

if [ ! -f "$FILE_PATH" ]; then
  echo "Error: File not found: ${FILE_PATH}" >&2
  exit 1
fi

BASE_URL="https://services.leadconnectorhq.com"
ENDPOINT="/medias/upload-file"

EXT="${FILE_PATH##*.}"
case "$EXT" in
  mp4)  CONTENT_TYPE="video/mp4" ;;
  mov)  CONTENT_TYPE="video/quicktime" ;;
  webm) CONTENT_TYPE="video/webm" ;;
  *)    CONTENT_TYPE="video/mp4" ;;
esac

RESPONSE=$(curl -s --connect-timeout 15 --max-time 180 -w "\n%{http_code}" \
  -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Authorization: Bearer ${GHL_API_KEY}" \
  -H "Version: 2021-07-28" \
  -H "Accept: application/json" \
  -F "file=@${FILE_PATH};type=${CONTENT_TYPE}" \
  -F "hosted=false" \
  -F "fileProcessingType=video" \
  -F "locationId=${GHL_LOCATION_ID}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" -lt 200 || "$HTTP_CODE" -ge 300 ]]; then
  echo "Error: HTTP ${HTTP_CODE}" >&2
  echo "$BODY" >&2
  exit 1
fi

if command -v python3 &>/dev/null; then
  MEDIA_URL=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('url', d.get('fileUrl', d.get('mediaUrl', ''))))" 2>/dev/null || echo "")
  if [ -n "$MEDIA_URL" ] && [ "$MEDIA_URL" != "None" ]; then
    echo "$MEDIA_URL"
  else
    echo "Upload complete. Full response:"
    echo "$BODY" | python3 -m json.tool
  fi
else
  echo "$BODY"
fi
