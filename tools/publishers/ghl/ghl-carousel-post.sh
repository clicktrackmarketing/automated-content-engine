#!/usr/bin/env bash
set -euo pipefail

# Creates or schedules a multi-image CAROUSEL post via GHL Social Planner API.
# Drop-in sibling of ghl-post.sh; the media array carries MULTIPLE {url,type}
# entries in display order (media[0] = cover slide). type stays "post".
# Usage: ghl-carousel-post.sh --account-id <id> --user-id <id> --summary <text> \
#          --media-url <url> [--media-url <url> ...] [--media-urls <csv>] [options]
# Env: GHL_API_KEY, GHL_LOCATION_ID

: "${GHL_API_KEY:?Set GHL_API_KEY environment variable (Private Integration Token)}"
: "${GHL_LOCATION_ID:?Set GHL_LOCATION_ID environment variable}"

# Defaults
ACCOUNT_ID=""
USER_ID=""
SUMMARY=""
MEDIA_URLS=()          # ordered list of slide URLs (media[0] = cover)
MEDIA_TYPE="image/png" # applied to all slides
SCHEDULE=""
POST_TYPE=""
STATUS="in_review"
CTA_URL=""
CTA_TYPE="LEARN_MORE"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --account-id)  ACCOUNT_ID="$2"; shift 2 ;;
    --user-id)     USER_ID="$2"; shift 2 ;;
    --summary)     SUMMARY="$2"; shift 2 ;;
    --media-url)   MEDIA_URLS+=("$2"); shift 2 ;;                 # REPEATABLE; appends one slide in order
    --media-urls)                                                # comma-separated URLs in order
      IFS=',' read -ra _CSV <<< "$2"
      for _u in "${_CSV[@]}"; do
        _u="${_u#"${_u%%[![:space:]]*}"}"   # trim leading whitespace
        _u="${_u%"${_u##*[![:space:]]}"}"   # trim trailing whitespace
        [ -n "$_u" ] && MEDIA_URLS+=("$_u")  # skip empty entries
      done
      shift 2 ;;
    --media-type)  MEDIA_TYPE="$2"; shift 2 ;;
    --schedule)    SCHEDULE="$2"; shift 2 ;;
    --post-type)   POST_TYPE="$2"; shift 2 ;;
    --status)      STATUS="$2"; shift 2 ;;
    --cta-url)     CTA_URL="$2"; shift 2 ;;    # Google Business Profile CTA button link
    --cta-type)    CTA_TYPE="$2"; shift 2 ;;   # LEARN_MORE|BOOK|ORDER|SHOP|SIGN_UP|CALL
    *)             echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
done

# Validate required args
: "${ACCOUNT_ID:?--account-id is required}"
: "${USER_ID:?--user-id is required}"
: "${SUMMARY:?--summary is required}"

# Require at least one media URL.
if [[ ${#MEDIA_URLS[@]} -eq 0 ]]; then
  echo "Error: at least one --media-url (or --media-urls <csv>) is required" >&2
  exit 1
fi

# A carousel (>1 slide) must be a "post"; reels cannot be multi-image.
POST_TYPE="${POST_TYPE:-post}"
if [[ ${#MEDIA_URLS[@]} -gt 1 ]]; then
  if [[ "$(echo "$POST_TYPE" | tr '[:upper:]' '[:lower:]')" == "reel" ]]; then
    echo "Error: --post-type reel is invalid for a multi-image carousel (${#MEDIA_URLS[@]} slides); use post" >&2
    exit 1
  fi
  POST_TYPE="post"
fi

# Instagram caps carousels at 10 slides.
if [[ ${#MEDIA_URLS[@]} -gt 10 ]]; then
  echo "Warning: ${#MEDIA_URLS[@]} slides exceeds Instagram's 10-image carousel cap; extra slides may be rejected there." >&2
fi

BASE_URL="https://services.leadconnectorhq.com"
ENDPOINT="/social-media-posting/${GHL_LOCATION_ID}/posts"

export _ACCOUNT_ID="$ACCOUNT_ID"
export _USER_ID="$USER_ID"
export _SUMMARY="$SUMMARY"
export _MEDIA_TYPE="$MEDIA_TYPE"
export _SCHEDULE="$SCHEDULE"
export _POST_TYPE="$POST_TYPE"
export _STATUS="$STATUS"
export _CTA_URL="$CTA_URL"
export _CTA_TYPE="$CTA_TYPE"
# Ordered media URLs passed newline-delimited (URLs never contain newlines).
export _MEDIA_URLS="$(printf '%s\n' "${MEDIA_URLS[@]}")"

JSON_BODY=$(python3 << 'PYEOF'
import json, os

media_type = os.environ.get('_MEDIA_TYPE', 'image/png')
urls = [u for u in os.environ.get('_MEDIA_URLS', '').split('\n') if u]
media = [{'url': u, 'type': media_type} for u in urls]

summary = os.environ.get('_SUMMARY', '')
body = {
    'accountIds': [os.environ['_ACCOUNT_ID']],
    'summary': summary,
    'media': media,
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

# A 201 nests the created post under results.post (NOT top-level).
echo "Carousel post created successfully."
echo "$BODY" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
post = (d.get('results') or {}).get('post') if isinstance(d.get('results'), dict) else None
if not isinstance(post, dict):
    post = d.get('post') if isinstance(d.get('post'), dict) else d
pid = post.get('_id') or post.get('id') or ''
status = post.get('status', '')
ptype = post.get('type', '')
sched = post.get('scheduleDate', '')
print(f'  _id: {pid}  status: {status}  type: {ptype}  scheduleDate: {sched}')
" 2>/dev/null || true

if command -v python3 &>/dev/null; then
  echo "$BODY" | python3 -m json.tool
else
  echo "$BODY"
fi
