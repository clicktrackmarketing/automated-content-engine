#!/usr/bin/env bash
set -euo pipefail

JOB_ID="${1:?Usage: download-result.sh <job_id> <output_path>}"
OUTPUT_PATH="${2:?Usage: download-result.sh <job_id> <output_path>}"

echo "Fetching job ${JOB_ID}..."

JOB_JSON=$(higgsfield generate get "${JOB_ID}" --json 2>/dev/null)

STATUS=$(echo "$JOB_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null || echo "unknown")

if [ "$STATUS" != "completed" ] && [ "$STATUS" != "done" ]; then
  echo "Job ${JOB_ID} status: ${STATUS} (not completed yet)"
  echo "Run: higgsfield generate wait ${JOB_ID}"
  exit 1
fi

RESULT_URL=$(echo "$JOB_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
results = d.get('results', d.get('result', []))
if isinstance(results, list) and len(results) > 0:
    r = results[0]
    print(r.get('url', r.get('video_url', r.get('image_url', ''))))
elif isinstance(results, dict):
    print(results.get('url', results.get('video_url', results.get('image_url', ''))))
else:
    print('')
" 2>/dev/null)

if [ -z "$RESULT_URL" ]; then
  echo "Could not extract result URL from job ${JOB_ID}"
  echo "Raw JSON:"
  echo "$JOB_JSON" | python3 -m json.tool 2>/dev/null || echo "$JOB_JSON"
  exit 1
fi

echo "Downloading from: ${RESULT_URL}"
curl -sL -o "${OUTPUT_PATH}" "${RESULT_URL}"

if [ -f "${OUTPUT_PATH}" ]; then
  SIZE=$(wc -c < "${OUTPUT_PATH}" | tr -d ' ')
  echo "Downloaded ${OUTPUT_PATH} (${SIZE} bytes)"
else
  echo "Download failed"
  exit 1
fi
