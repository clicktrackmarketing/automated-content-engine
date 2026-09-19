#!/usr/bin/env bash
set -euo pipefail

# Creates or schedules a social media post via GHL Social Planner API
# Usage: ghl-post.sh --account-id <id> --user-id <id> --summary <text> --media-url <url> [options]
# Env: GHL_API_KEY, GHL_LOCATION_ID

: "${GHL_API_KEY:?Set GHL_API_KEY environment variable (Private Integration Token)}"
: "${GHL_LOCATION_ID:?Set GHL_LOCATION_ID environment variable}"

# Defaults
ACCOUNT_ID=""
USER_ID=""
SUMMARY=""
MEDIA_URL=""
MEDIA_TYPE="video/mp4"
SCHEDULE=""
POST_TYPE=""
STATUS="in_review"
CTA_URL=""
CTA_TYPE="LEARN_MORE"
APPROVER=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --account-id)  ACCOUNT_ID="$2"; shift 2 ;;
    --user-id)     USER_ID="$2"; shift 2 ;;
    --summary)     SUMMARY="$2"; shift 2 ;;
    --media-url)   MEDIA_URL="$2"; shift 2 ;;
    --media-type)  MEDIA_TYPE="$2"; shift 2 ;;
    --schedule)    SCHEDULE="$2"; shift 2 ;;
    --post-type)   POST_TYPE="$2"; shift 2 ;;
    --status)      STATUS="$2"; shift 2 ;;
    --cta-url)     CTA_URL="$2"; shift 2 ;;    # Google Business Profile CTA button link
    --cta-type)    CTA_TYPE="$2"; shift 2 ;;   # LEARN_MORE|BOOK|ORDER|SHOP|SIGN_UP|CALL
    --approver)    APPROVER="$2"; shift 2 ;;   # user id; required by GHL when status=in_review
    *)             echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
done

# Validate required args
: "${ACCOUNT_ID:?--account-id is required}"
: "${USER_ID:?--user-id is required}"
: "${SUMMARY:?--summary is required}"
: "${MEDIA_URL:?--media-url is required}"

BASE_URL="https://services.leadconnectorhq.com"
ENDPOINT="/social-media-posting/${GHL_LOCATION_ID}/posts"

export _ACCOUNT_ID="$ACCOUNT_ID"
export _USER_ID="$USER_ID"
export _SUMMARY="$SUMMARY"
export _MEDIA_URL="$MEDIA_URL"
export _MEDIA_TYPE="$MEDIA_TYPE"
export _SCHEDULE="$SCHEDULE"
export _POST_TYPE="${POST_TYPE:-post}"
export _STATUS="$STATUS"
export _CTA_URL="$CTA_URL"
export _CTA_TYPE="$CTA_TYPE"
export _APPROVER="$APPROVER"

JSON_BODY=$(python3 << 'PYEOF'
import json, sys, os

summary = os.environ.get('_SUMMARY', '')
body = {
    'accountIds': [os.environ['_ACCOUNT_ID']],
    'summary': summary,
    'media': [{'url': os.environ['_MEDIA_URL'], 'type': os.environ.get('_MEDIA_TYPE', 'video/mp4')}],
    'userId': os.environ['_USER_ID'],
    'status': os.environ.get('_STATUS', 'in_review')
}

schedule = os.environ.get('_SCHEDULE', '')
if schedule:
    body['scheduleDate'] = schedule

post_type = os.environ.get('_POST_TYPE', 'post').lower()
body['type'] = post_type

# Google Business Profile call-to-action button (ignored by other platforms).
cta_url = os.environ.get('_CTA_URL', '')
if cta_url:
    body['gmbPostDetails'] = {
        'gmbEventType': 'STANDARD',
        'actionType': os.environ.get('_CTA_TYPE', 'LEARN_MORE'),
        'url': cta_url,
    }

# GHL requires an approver when a post is submitted for review.
approver = os.environ.get('_APPROVER', '')
if approver and body.get('status') == 'in_review':
    body['postApprovalDetails'] = {'approver': approver}

print(json.dumps(body))
PYEOF
)

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Authorization: Bearer ${GHL_API_KEY}" \
  -H "Version: 2021-07-28" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$JSON_BODY")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" -lt 200 || "$HTTP_CODE" -ge 300 ]]; then
  echo "Error: HTTP ${HTTP_CODE}" >&2
  echo "$BODY" >&2
  exit 1
fi

echo "Post created successfully."
if command -v python3 &>/dev/null; then
  echo "$BODY" | python3 -m json.tool
else
  echo "$BODY"
fi
