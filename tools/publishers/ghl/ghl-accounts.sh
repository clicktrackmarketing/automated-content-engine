#!/usr/bin/env bash
set -euo pipefail

# Lists connected social media accounts via GHL API
# Usage: ghl-accounts.sh
# Env: GHL_API_KEY, GHL_LOCATION_ID

: "${GHL_API_KEY:?Set GHL_API_KEY environment variable (Private Integration Token)}"
: "${GHL_LOCATION_ID:?Set GHL_LOCATION_ID environment variable}"

BASE_URL="https://services.leadconnectorhq.com"
ENDPOINT="/social-media-posting/${GHL_LOCATION_ID}/accounts"

RESPONSE=$(curl -s --connect-timeout 15 --max-time 120 -w "\n%{http_code}" \
  -X GET "${BASE_URL}${ENDPOINT}" \
  -H "Authorization: Bearer ${GHL_API_KEY}" \
  -H "Version: 2021-07-28" \
  -H "Accept: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" -lt 200 || "$HTTP_CODE" -ge 300 ]]; then
  echo "Error: HTTP ${HTTP_CODE}" >&2
  echo "$BODY" >&2
  exit 1
fi

if command -v python3 &>/dev/null; then
  echo "$BODY" | python3 -m json.tool
else
  echo "$BODY"
fi
