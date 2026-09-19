#!/usr/bin/env bash
set -euo pipefail

# Uploads a local IMAGE to the GHL Media Library and returns the hosted URL.
# Companion to ghl-upload-media.sh (which is video-only). Use for graphic/carousel posts.
# Usage: ghl-upload-image.sh <image-file>
# Env: GHL_API_KEY, GHL_LOCATION_ID

FILE_PATH="${1:?Usage: ghl-upload-image.sh <image-file>}"
: "${GHL_API_KEY:?Set GHL_API_KEY environment variable (Private Integration Token)}"
: "${GHL_LOCATION_ID:?Set GHL_LOCATION_ID environment variable}"

[ -f "$FILE_PATH" ] || { echo "Error: File not found: ${FILE_PATH}" >&2; exit 1; }

EXT="$(echo "${FILE_PATH##*.}" | tr '[:upper:]' '[:lower:]')"
case "$EXT" in
  png)        CONTENT_TYPE="image/png" ;;
  jpg|jpeg)   CONTENT_TYPE="image/jpeg" ;;
  webp)       CONTENT_TYPE="image/webp" ;;
  gif)        CONTENT_TYPE="image/gif" ;;
  *) echo "Error: unsupported image type: .$EXT (use png/jpg/webp/gif)" >&2; exit 1 ;;
esac

BASE_URL="https://services.leadconnectorhq.com"
ENDPOINT="/medias/upload-file"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Authorization: Bearer ${GHL_API_KEY}" \
  -H "Version: 2021-07-28" \
  -H "Accept: application/json" \
  -F "file=@${FILE_PATH};type=${CONTENT_TYPE}" \
  -F "hosted=false" \
  -F "locationId=${GHL_LOCATION_ID}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" -lt 200 || "$HTTP_CODE" -ge 300 ]]; then
  echo "Error: HTTP ${HTTP_CODE}" >&2
  echo "$BODY" >&2
  exit 1
fi

MEDIA_URL=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('url', d.get('fileUrl', d.get('mediaUrl',''))))" 2>/dev/null || echo "")
if [ -n "$MEDIA_URL" ] && [ "$MEDIA_URL" != "None" ]; then
  echo "$MEDIA_URL"
else
  echo "Upload complete but no URL field found. Full response:" >&2
  echo "$BODY" >&2
  exit 1
fi
