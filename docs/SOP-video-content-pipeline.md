# SOP: Video Content Pipeline
**Last Updated:** June 2026

---

## Overview

Two Claude Code commands handle video content from raw footage to scheduled social posts:

| Command | Use When |
|---------|----------|
| **`/edit-video`** | Editing a single video with full creative control |
| **`/content-machine`** | Batch-producing multiple videos with automated scheduling |

Both commands use the same brand system, overlay templates, B-roll generators, and publisher tools.

---

## Prerequisites

Before running either command, confirm:

1. **Claude Code** is open in the repo root directory
2. **Environment variables** are set (see `.env.example`):
   - `GHL_API_KEY` — Publisher API token (required for scheduling)
   - `GHL_LOCATION_ID` — Publisher location/account ID
   - `ELEVEN_API_KEY` — only needed for AI-generated voiceover mode
3. **Hyperframes** is installed at `~/hyperframes` (renders HTML overlays to ProRes MOV)
4. **FFmpeg** is installed (`brew install ffmpeg`)
5. **Source video** is filmed in portrait (9:16) or landscape (will be cropped to 9:16)

---

## Command 1: Edit Video (`/edit-video`)

### What It Does
Takes a single filmed video and produces a fully edited, branded video with:
- Multi-angle cuts (tight/medium/wide simulated from single camera)
- Word-level captions (Montserrat, brand colors)
- Title card, lower third, kinetic typography, CTA end card
- AI-generated B-roll
- Original audio preserved

### How to Run

```
/edit-video /path/to/your/video.mp4
```

### Step-by-Step Process

1. **Analysis** — Claude probes the video (resolution, duration, codec, rotation)
2. **Audio extraction + transcription** — Whisper generates word-level timestamps
3. **Reformat** — Crops/scales to 1080x1920 (9:16 vertical)
4. **Multi-angle variants** — Creates tight (70% crop), medium (85% crop), wide (full frame)
5. **Overlay creation** — Builds HTML/GSAP overlays using brand templates:
   - Title card (first 3.5s)
   - Captions (full duration, word-synced)
   - Lower third (name/company, 1-5s)
   - Kinetic typography (key phrases)
   - CTA end card (last 5-6s)
6. **Overlay rendering** — Hyperframes renders each overlay to ProRes 4444 MOV (alpha channel)
7. **B-roll generation** — AI images via Higgsfield + real website screenshots via Playwright
8. **Assembly** — FFmpeg composites everything: segments + B-roll + overlays + audio
9. **Quality check** — Verifies 1080x1920, H.264/AAC, yuv420p, no black frames

### Your Role During Edit
- Review the video when Claude opens it
- Request changes (spelling, more B-roll, different cuts, trim length)
- Approve when ready
- Tell Claude to schedule when done

### Scheduling After Edit
Once you approve, tell Claude:
```
Schedule on my social channels for [date]
```
Claude will:
1. Upload the video to the publisher's media library
2. Schedule across all connected platforms
3. Use optimal posting times (see schedule below)

---

## Command 2: Content Machine (`/content-machine`)

### What It Does
Batch pipeline that takes multiple topics or filmed videos and produces scheduled social posts across all platforms. Fully automated with 2 approval gates.

### How to Run

**AI-Generated Mode** (creates videos from scratch with AI clips + AI voiceover):
```
/content-machine topic about X, topic about Y, topic about Z
```

**Filmed Mode** (edits existing footage you recorded):
```
/content-machine --filmed ~/Desktop/vid1.mp4, ~/Desktop/vid2.mp4, ~/Desktop/vid3.mp4
```

### Pipeline (9 Phases)

```
Phase 1: Initialize    → Creates batch directory, transcribes audio (filmed mode)
Phase 2: Briefs        → Content strategist generates production briefs
Phase 3: APPROVAL #1   → You review and approve briefs
Phase 4: Production    → Video director + team produce all videos
Phase 5: Captions      → Platform-specific captions generated
Phase 6: Review file   → Everything compiled into review.md
Phase 7: APPROVAL #2   → You review final videos + captions + schedule
Phase 8: Publish       → Social publisher uploads and schedules
Phase 9: Confirmation  → Publish log with all scheduled posts
```

### Your Role During Content Machine
1. **Approval Gate 1** — Review briefs (title, hook, script, B-roll plan, CTA). Approve or request changes.
2. **Approval Gate 2** — Review final videos, captions, and proposed schedule. Uncheck any approval boxes for items that need changes. Confirm when ready.
3. Everything else is automated.

---

## Posting Schedule

Posts are distributed at optimal engagement times:

| Platform | Days | Time Window |
|----------|------|-------------|
| LinkedIn | Mon, Tue, Thu | 8:00 - 10:00 AM |
| Facebook (reel) | Mon, Wed, Fri | 9:00 - 11:00 AM |
| Instagram (reel) | Mon, Wed, Fri | 11:00 AM - 1:00 PM |
| YouTube (short) | Mon, Wed, Fri | 12:00 - 2:00 PM |
| TikTok | Mon, Wed, Fri | 1:00 - 3:00 PM |

**Rules:**
- Max 1 post per platform per day
- Posts spaced at least 1 day apart per platform
- Always scheduled 24+ hours in the future

---

## Brand Standards (Non-Negotiable)

Every video must use:
- **Font:** Montserrat (all weights)
- **Colors:** Defined in `brand/style_guide.md` and available as CSS variables in templates
- **BANNED colors:** yellow, pastel, neon green, bright red, gradient rainbows

**Voice:** Confident, calm, operator-to-operator. No hype, no guru energy, no fake urgency.

---

## File Structure

### Single Edit (`/edit-video`)
```
projects/<name>/
  overlays/           # HTML source + rendered .mov overlays
  broll/              # Screenshots and AI-generated B-roll
  temp/               # Intermediate files (angles, segments)
  output/
    final.mp4         # Final deliverable
```

### Batch (`/content-machine`)
```
projects/batch-YYYY-MM-DD/
  video-1/
    brief.md
    clips/ images/ overlays/ audio/
    output/
      final-reels.mp4       # 9:16 (IG, YT, TikTok, FB)
      final-linkedin.mp4    # 16:9 (LinkedIn)
    captions/
      instagram.md
      youtube.md
      linkedin.md
  video-2/ ...
  review.md             # Approval checklist
  publish-log.md        # Scheduling results
```

---

## Publisher Tools (Reference)

Three shell scripts in `tools/publishers/ghl/`:

| Script | Purpose | Usage |
|--------|---------|-------|
| `ghl-accounts.sh` | List connected social accounts | `bash tools/publishers/ghl/ghl-accounts.sh` |
| `ghl-upload-media.sh` | Upload video to media library | `bash tools/publishers/ghl/ghl-upload-media.sh <file>` |
| `ghl-post.sh` | Schedule a post | `bash tools/publishers/ghl/ghl-post.sh --account-id <id> --user-id <id> --summary "<caption>" --media-url <url> --schedule <ISO-datetime> --post-type <reel\|post> --status scheduled` |

See `tools/publishers/ghl/README.md` for setup instructions (API key, Location ID, User ID).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `in_review` status fails with approver error | Use `--status scheduled` instead |
| Video plays sideways | FFmpeg auto-rotates from metadata — don't add `transpose` filter |
| Overlays have no transparency | Render with `--format mov` (ProRes 4444), not WebM |
| Captions misspell a name | Edit the HTML in `overlays/captions/index.html`, re-render with Hyperframes, re-assemble |
| B-roll looks generic | Use Playwright screenshots of real websites instead of AI-generated images |
| Publisher upload fails | Check API key is set and not expired. Retry once. |
| Cookie popup in screenshot | Re-screenshot with Playwright using `--wait-for-timeout` and JS to dismiss the popup |
| Post not showing in planner | Verify the schedule date is in the future and in UTC/ISO 8601 format |

---

## Quick Reference Card

**Edit a single video:**
```
/edit-video /path/to/video.mp4
# Review → request changes → approve → "schedule for tomorrow"
```

**Batch content production:**
```
/content-machine --filmed ~/Desktop/vid1.mp4, ~/Desktop/vid2.mp4
# Approve briefs → approve final review → auto-publishes
```
