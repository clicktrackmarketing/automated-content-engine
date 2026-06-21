# Publisher Interface

Publishers handle the final step of the content pipeline: uploading video files and scheduling social media posts. GHL (GoHighLevel) is the default publisher, but you can add others.

## Interface Specification

Any publisher must implement 3 shell scripts:

### 1. List Accounts (`list-accounts.sh` or equivalent)
- **Input:** None (reads from environment variables)
- **Output:** JSON array of connected social media accounts with IDs
- **Purpose:** Discover which platforms are connected and get account IDs for posting

### 2. Upload Media (`upload-media.sh <file>` or equivalent)
- **Input:** Path to a local video file
- **Output:** Public URL of the uploaded media (stdout, single line)
- **Purpose:** Upload video to the publisher's CDN so it can be referenced in posts

### 3. Schedule Post (`post.sh [flags]` or equivalent)
- **Input flags:**
  - `--account-id` — Target social media account
  - `--summary` — Caption text
  - `--media-url` — Hosted media URL (from upload step)
  - `--schedule` — ISO 8601 datetime for scheduled publishing
  - `--post-type` — Content type (`reel`, `post`, `story`, etc.)
  - `--status` — Publishing status (`scheduled`, `in_review`, `draft`)
- **Output:** JSON response with post ID and status
- **Purpose:** Create or schedule a social media post

## Directory Structure

```
tools/publishers/<name>/
  <list-accounts-script>
  <upload-media-script>
  <post-script>
  README.md
```

## Default: GHL

See `ghl/README.md` for setup instructions.

## Adding a New Publisher

1. Create a directory: `tools/publishers/<name>/`
2. Implement the 3 scripts following the interface above
3. Add a `README.md` with setup instructions
4. Update `.claude/agents/social-publisher.md` to reference your publisher's script paths

### Example: Buffer

```
tools/publishers/buffer/
  buffer-accounts.sh    # Lists connected Buffer channels
  buffer-upload.sh      # Uploads media to Buffer
  buffer-post.sh        # Schedules a post via Buffer API
  README.md
```

Each script would read `BUFFER_API_KEY` from the environment and call Buffer's API.
