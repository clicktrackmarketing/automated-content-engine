#!/usr/bin/env bash
set -euo pipefail

# Verifies which posts actually published on a given day, and their engagement.
#
# WHY THIS EXISTS: at fire time GHL soft-deletes the *scheduled* post record
# (it keeps status "scheduled" and gains deleted:true) and creates a NEW record
# with status "published". So GET /posts/{originalId} always looks unpublished.
# The truth is in the published list, matched by account.
#
# Usage: ghl-verify-published.sh [YYYY-MM-DD]   (default: today, local date)
# Env: GHL_API_KEY, GHL_LOCATION_ID

: "${GHL_API_KEY:?Set GHL_API_KEY}"
: "${GHL_LOCATION_ID:?Set GHL_LOCATION_ID}"

DAY="${1:-$(date +%F)}"
BASE="https://services.leadconnectorhq.com/social-media-posting/${GHL_LOCATION_ID}/posts/list"

curl -s --connect-timeout 15 --max-time 120 -X POST "$BASE" \
  -H "Authorization: Bearer ${GHL_API_KEY}" \
  -H "Version: 2021-07-28" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{\"limit\":\"50\",\"skip\":\"0\",\"type\":\"published\",\"fromDate\":\"${DAY}T00:00:00.000Z\",\"toDate\":\"${DAY}T23:59:59.999Z\"}" \
  | DAY="$DAY" python3 -c "
import sys, json, os
d = json.load(sys.stdin)
posts = d.get('results', {}).get('posts', [])
day = os.environ['DAY']
rows = [p for p in posts if (p.get('publishedAt') or p.get('scheduleDate') or '').startswith(day)]
if not rows:
    print(f'No published posts found for {day}.'); sys.exit(0)
print(f'Published on {day}: {len(rows)}')
for p in sorted(rows, key=lambda x: x.get('publishedAt') or ''):
    a = (p.get('accountIds') or [''])[0]
    ins = p.get('insights') or {}
    eng = f\"likes {ins.get('like',0)} / shares {ins.get('share',0)} / comments {ins.get('comment',0)}\"
    print(f\"  [{p.get('status')}] {p.get('publishedAt')} | acct {a[:26]}… | {eng}\")
    if p.get('previewLink'): print(f\"      {p.get('previewLink')}\")
"
