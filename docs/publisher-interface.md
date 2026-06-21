# Publisher Interface Guide

This guide explains how to build a custom publisher integration to replace or supplement the default GHL (GoHighLevel) publisher.

---

## Overview

A publisher handles the final step of the content pipeline: uploading video files and scheduling social media posts. The system is designed to be publisher-agnostic — any service with an API for media upload and post scheduling can be integrated.

---

## Interface Specification

Every publisher must implement 3 operations, each as a shell script (or any executable):

### 1. List Accounts

**Purpose:** Discover which social media platforms are connected and get their account IDs.

| Property | Value |
|----------|-------|
| Input | None (reads from environment variables) |
| Output | JSON array of connected accounts with IDs (stdout) |
| Exit code | 0 on success, non-zero on failure |

**Example output:**
```json
[
  {
    "id": "abc123",
    "platform": "instagram",
    "name": "My Brand",
    "type": "business"
  },
  {
    "id": "def456",
    "platform": "youtube",
    "name": "My Brand Channel",
    "type": "channel"
  }
]
```

### 2. Upload Media

**Purpose:** Upload a local video file to the publisher's CDN so it can be referenced in posts.

| Property | Value |
|----------|-------|
| Input | Path to a local video file (first argument) |
| Output | Public URL of the uploaded media (stdout, single line) |
| Exit code | 0 on success, non-zero on failure |

**Example:**
```bash
./tools/publishers/my-publisher/upload.sh ./projects/batch/video-1/output/final-reels.mp4
# Output: https://cdn.example.com/media/abc123.mp4
```

### 3. Schedule Post

**Purpose:** Create or schedule a social media post using a previously uploaded media URL.

| Property | Value |
|----------|-------|
| Input | Flags (see below) |
| Output | JSON response with post ID and status (stdout) |
| Exit code | 0 on success, non-zero on failure |

**Required flags:**
| Flag | Description |
|------|-------------|
| `--account-id` | Target social media account ID |
| `--summary` | Caption text |
| `--media-url` | Hosted media URL (from upload step) |

**Optional flags:**
| Flag | Description | Default |
|------|-------------|---------|
| `--schedule` | ISO 8601 datetime for scheduled publishing | Now |
| `--post-type` | Content type (`reel`, `post`, `story`, etc.) | `post` |
| `--status` | Publishing status (`scheduled`, `in_review`, `draft`) | `scheduled` |

---

## Directory Structure

```
tools/publishers/<name>/
  <list-accounts-script>
  <upload-media-script>
  <post-script>
  README.md
```

---

## Implementation Steps

### 1. Create the Directory

```bash
mkdir -p tools/publishers/my-publisher
```

### 2. Implement the Scripts

Each script should:
- Read API credentials from environment variables (e.g., `MY_PUBLISHER_API_KEY`)
- Handle errors gracefully with non-zero exit codes
- Write error messages to stderr, not stdout
- Write the expected output (URL, JSON) to stdout

### 3. Add a README

Create `tools/publishers/my-publisher/README.md` with:
- Setup instructions (API key creation, account connection)
- Required environment variables
- Any platform-specific notes

### 4. Update the Social Publisher Agent

Edit `.claude/agents/social-publisher.md` to reference your publisher's script paths:

```
./tools/publishers/my-publisher/accounts.sh
./tools/publishers/my-publisher/upload.sh <file>
./tools/publishers/my-publisher/post.sh --account-id <id> --summary "<text>" --media-url <url>
```

### 5. Add Environment Variables

Add your publisher's required environment variables to `.env.example`:

```bash
# My Publisher
MY_PUBLISHER_API_KEY=your-api-key-here
MY_PUBLISHER_ACCOUNT_ID=your-account-id
```

---

## Example: Buffer Integration

```
tools/publishers/buffer/
  buffer-accounts.sh    # GET /profiles → JSON list
  buffer-upload.sh      # POST /uploads → public URL
  buffer-post.sh        # POST /updates → scheduled post
  README.md
```

**buffer-accounts.sh:**
```bash
#!/usr/bin/env bash
set -euo pipefail
: "${BUFFER_API_KEY:?Set BUFFER_API_KEY environment variable}"

curl -s "https://api.bufferapp.com/1/profiles.json?access_token=${BUFFER_API_KEY}" \
  | python3 -c "
import json, sys
profiles = json.load(sys.stdin)
result = [{'id': p['id'], 'platform': p['service'], 'name': p.get('formatted_username', '')} for p in profiles]
print(json.dumps(result, indent=2))
"
```

**buffer-upload.sh:**
```bash
#!/usr/bin/env bash
set -euo pipefail
: "${BUFFER_API_KEY:?Set BUFFER_API_KEY environment variable}"
FILE_PATH="${1:?Usage: buffer-upload.sh <video-file>}"

RESPONSE=$(curl -s -X POST "https://api.bufferapp.com/1/media/upload.json" \
  -H "Authorization: Bearer ${BUFFER_API_KEY}" \
  -F "media=@${FILE_PATH}")

echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['url'])"
```

**buffer-post.sh:**
```bash
#!/usr/bin/env bash
set -euo pipefail
: "${BUFFER_API_KEY:?Set BUFFER_API_KEY environment variable}"

# Parse flags (same pattern as ghl-post.sh)
ACCOUNT_ID="" SUMMARY="" MEDIA_URL="" SCHEDULE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --account-id) ACCOUNT_ID="$2"; shift 2 ;;
    --summary)    SUMMARY="$2"; shift 2 ;;
    --media-url)  MEDIA_URL="$2"; shift 2 ;;
    --schedule)   SCHEDULE="$2"; shift 2 ;;
    *)            shift ;;
  esac
done

curl -s -X POST "https://api.bufferapp.com/1/updates/create.json" \
  -H "Authorization: Bearer ${BUFFER_API_KEY}" \
  -d "profile_ids[]=${ACCOUNT_ID}" \
  -d "text=${SUMMARY}" \
  -d "media[link]=${MEDIA_URL}" \
  -d "scheduled_at=${SCHEDULE}"
```

---

## Testing Your Publisher

1. **Test account listing:**
   ```bash
   ./tools/publishers/my-publisher/accounts.sh
   # Should output JSON array of connected accounts
   ```

2. **Test media upload:**
   ```bash
   ./tools/publishers/my-publisher/upload.sh /path/to/test-video.mp4
   # Should output a single URL line
   ```

3. **Test post creation:**
   ```bash
   ./tools/publishers/my-publisher/post.sh \
     --account-id "test-id" \
     --summary "Test post" \
     --media-url "https://example.com/test.mp4" \
     --schedule "2026-12-31T12:00:00-08:00"
   # Should output JSON with post ID
   ```

4. **Run the content machine** with your publisher connected and verify posts appear in your scheduling tool.
