# GHL (GoHighLevel) Publisher

The default publisher integration for scheduling social media posts via GoHighLevel's Social Planner API.

## Setup

### 1. Create a Private Integration

1. Log into your GHL sub-account
2. Go to **Settings → Integrations → Private Integrations**
3. Create a new integration with these scopes:
   - `social-media-posting` — Create and schedule posts
   - `medias` — Upload video files
   - `locations.readonly` — Read location data
   - `users.readonly` — Look up user IDs

### 2. Find Your Location ID

1. Go to **Settings → Business Profile** in your GHL sub-account
2. The Location ID is in the URL: `https://app.gohighlevel.com/v2/location/{LOCATION_ID}/...`

### 3. Set Environment Variables

```bash
export GHL_API_KEY="your-private-integration-token"
export GHL_LOCATION_ID="your-location-id"
```

Or add to your `.env` file (see `.env.example` in the repo root).

### 4. Connect Social Accounts

In GHL, go to **Marketing → Social Planner → Settings** and connect your social accounts (Facebook Page, Instagram, LinkedIn, YouTube, TikTok).

### 5. Find Your User ID

The GHL User ID is required for scheduling posts. To find it:
1. Get your companyId: `GET /locations/{locationId}` → `location.companyId`
2. Search users: `GET /users/search?companyId={companyId}&locationId={locationId}`
3. Match by name/email to find your user ID

## Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `ghl-accounts.sh` | List connected social accounts | `bash tools/publishers/ghl/ghl-accounts.sh` |
| `ghl-upload-media.sh` | Upload **video** to GHL CDN | `bash tools/publishers/ghl/ghl-upload-media.sh <file>` |
| `ghl-upload-image.sh` | Upload **image** (png/jpg/webp/gif) to GHL CDN | `bash tools/publishers/ghl/ghl-upload-image.sh <file>` |
| `ghl-post.sh` | Create/schedule a single-media post | See flags below |
| `ghl-carousel-post.sh` | Create/schedule a **multi-image carousel** post | Same flags as `ghl-post.sh`, but repeatable `--media-url` (or `--media-urls <csv>`) in slide order |
| `ghl-verify-published.sh` | Confirm what actually published on a day + engagement | `bash tools/publishers/ghl/ghl-verify-published.sh [YYYY-MM-DD]` |
| `ghl-publish-batch.sh` | Schedule a whole rendered batch from its manifest (used by `/graphic-machine`) | `bash tools/publishers/ghl/ghl-publish-batch.sh <batch-dir> [--dry-run] [--status scheduled]` |

### ghl-post.sh Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--account-id` | Yes | Target social media account ID |
| `--user-id` | Yes | GHL user ID of the post creator |
| `--summary` | Yes | Caption text |
| `--media-url` | Yes | Hosted media URL (from upload) |
| `--media-type` | No | MIME type (default: `video/mp4`) |
| `--schedule` | No | ISO 8601 datetime for scheduling |
| `--post-type` | No | `reel` or `post` |
| `--status` | No | `in_review` or `scheduled` |
| `--cta-url` | No | Google Business Profile CTA button link (adds `gmbPostDetails`; ignored by other platforms) |
| `--cta-type` | No | CTA action: `LEARN_MORE` (default), `BOOK`, `ORDER`, `SHOP`, `SIGN_UP`, `CALL` |

### Verifying publication

GHL soft-deletes the *scheduled* record at fire time and creates a new *published*
one, so `GET /posts/{id}` on the original always looks unpublished. Use
`ghl-verify-published.sh <date>` to read the real published records (status, live
link, engagement) matched by account.

## GHL API Reference

- **Media upload**: `POST /medias/upload-file`
- **Post creation**: `POST /social-media-posting/{locationId}/posts`
- **List accounts**: `GET /social-media-posting/{locationId}/accounts`
