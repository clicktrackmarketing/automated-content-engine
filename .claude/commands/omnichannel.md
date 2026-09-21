# Omnichannel — one source, everywhere

Take one source (a topic, an existing post, or a reel/video) and produce a full cross-channel
pack: **social graphics/carousel + email + landing page + SMS** — all on brand, from one input.
The north star: be everywhere in as few clicks as possible. Request: $ARGUMENTS

Usage: `/omnichannel --client <slug> <topic | --from post/reel | video file>` with optional
`--channels social,email,landing,sms` (default: all).

**Read the brand first** (`brand/clients/<slug>/`). Reuse `graphic-generator`, `carousel-generator`,
`repurpose-command`, `multi-client-brand-packs`. Captions/copy tailored per channel (memory
`social-captions-per-channel`).

## Important: drafts, not sends
This command **generates on-brand drafts** — it never auto-sends email or SMS. Sending is outward,
needs recipient lists / campaign setup, and is the user's call. Deliver the files; the user sends
from GHL/Klaviyo. (Social still routes through the normal review → in-review flow.)

## Pipeline

### 1. Ingest the source
- Topic/points inline, an existing post (reuse its angle), or a video → `tools/transcribe.sh`.
- Pull the core message: the hook, 2–4 key points, the proof/result, the CTA + link.

### 2. Author per-channel specs (the craft step) — write to `output/oc-<date>/`
- **Social** — run `/repurpose` (or `/graphic-machine`) for the graphics/carousel + captions.
- **Email** — a spec for `tools/make-email.mjs`: `subject`, `preheader`, `kicker`, `headline`, `body` (2–4 short paragraphs), `bullets` (the key points), `ctaText`/`ctaUrl`, `footerName`. Subject line: specific + curiosity, no clickbait.
- **Landing page** — a spec for `tools/make-landing.mjs`: `kicker`, `headline`, `subhead`, `stats` (if there's a number), `sections` (the points as h+p or bullets), `ctaText`/`ctaUrl`.
- **SMS** — 1–3 variants, each ≤ 160 chars if possible (note if it spills to a 2nd segment at 160), one clear idea + the link + a soft CTA. No all-caps spam; include brand name once.

### 3. Render
```bash
node tools/make-email.mjs   output/oc-<date>/email.spec.json     # -> email/<out>.html + .txt
node tools/make-landing.mjs output/oc-<date>/landing.spec.json   # -> landing/<out>.html
# social: via /repurpose or /graphic-machine (renders + review.md)
```
Write the SMS variants to `output/oc-<date>/sms.txt`.

### 4. Present the pack (one review)
Show the user: the social preview(s), the email (open the HTML), the landing page (open the HTML),
and the SMS options. Everything on brand, ready to ship. Get approval.

### 5. Publish / hand off
- **Social** → `ghl-publish-batch.sh --status in_review` (approve in GHL).
- **Email** → hand over `email/<out>.html` + `.txt` to paste/import into GHL/Klaviyo (we don't auto-send).
- **Landing** → hand over `landing/<out>.html` to publish on the site / GHL funnels.
- **SMS** → hand over the copy for the user's SMS tool.

## Notes
- Everything derives from ONE source message, so it stays consistent across channels while the
  wording fits each medium.
- Never invent stats/results/quotes — use only what the source states, else `[__]`.
- Email is light-background + web-safe fonts for deliverability; the landing page is the full dark
  CTM look; social is the usual navy/cyan system.
