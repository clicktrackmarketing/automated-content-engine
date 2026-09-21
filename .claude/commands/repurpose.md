# Repurpose — turn a reel/video into a full content pack

Take an existing reel or video (or just its key points) and produce a complete, on-brand
content pack — **reel cover + carousel + single graphic + per-channel captions** — then run it
through the review → schedule flow. One source in, everywhere out. Request: $ARGUMENTS

Usage:
- `/repurpose --client <slug> <video file(s) or folder>` — transcribe + derive
- `/repurpose --client <slug> --from <reels.json>` — from a prepared list
- `/repurpose --client <slug>` then paste reels inline (hook + key points + link each)

**Read the brand first** (`brand/clients/<slug>/` — `graphic.brand.json`, `brand.md`). Never
post one caption verbatim across channels (memory `social-captions-per-channel`). Reuse
`graphic-generator`, `carousel-generator`, `graphic-machine-batch`, `multi-client-brand-packs`.

---

## What a "pack" is (per reel)
1. **Reel cover** — 9:16 (1080×1920), the hook, grid-safe. Optional background photo (a grabbed video frame or a supplied image).
2. **Primary post** — a **carousel** (story/steps/result → cover→points→CTA) or a **single graphic** (one tip/stat). Pick per content.
3. **Per-channel captions** — IG/FB/LinkedIn(page)/LinkedIn(personal)/GBP, each with a **"Watch the full reel →"** CTA (the reel link; GBP via its CTA button).

---

## Pipeline

### 1. Ingest the source
- **Video files:** transcribe each, and (optional) grab a cover frame:
  ```bash
  bash tools/transcribe.sh <video> output/rp-<date>        # -> <name>.transcript.txt
  bash tools/grab-frame.sh <video> output/rp-<date>/frames/<id>.jpg 2.0   # optional cover bg
  ```
  (Needs the whisper model cached — see docs/RUNBOOK.md §0. No ElevenLabs needed.)
- **Manual / inline:** use the provided hook + key points + link.

### 2. Author the pack (the craft step)
For EACH reel, read the transcript/points and write:
- The **primary spec** — carousel when there's a story, steps, or a result to unpack (cover → one idea per slide → CTA); a single **graphic** for a lone tip or stat. Wrap only the 1–3 key words in `|pipes|`; CTM navy/cyan; never invent numbers — use only what the reel states, else `[__]`.
- **Five per-channel captions**, each ending with the reel CTA. Link inline on FB/LinkedIn, full URL on Instagram, GBP via the CTA button. If there's no reel link yet, use the client `defaultLink` and note it.
- A **cover spec** — `make-graphic` `canvas:"story"`, the hook, `logoPos:"top"`, `footer:""`; if a frame/photo exists set `bg:"<path>"`, `bgScrim:"strong"`.

Write a `batch.json` (client + the carousels/graphics as items) at `output/rp-<date>/batch.json` — same shape as `/graphic-machine`.

### 3. Render
```bash
node tools/graphic-batch.mjs output/rp-<date>/batch.json      # posts + review.md + manifest
# covers (one per reel), 9:16:
node tools/make-graphic.mjs output/rp-<date>/covers/<id>.json  # writes graphics/<id>/… ; render:
bash tools/render-graphic.sh output/rp-<date>/covers/graphics/<id>
```
Covers are **assets** (the reel's thumbnail), not scheduled posts — keep them beside the batch and deliver them with the review.

### 4. Quality gate + ONE approval
Open the covers + a sample of each post's slides. Confirm on-brand, legible, correct accents. **Show the pack (covers + posts) to the user and get approval** before publishing (`projects/<batch>/review.md`).

### 5. Publish + verify (after approval)
```bash
set -a && source .env && set +a
bash tools/publishers/ghl/ghl-publish-batch.sh projects/<batch> --status in_review
bash tools/publishers/ghl/ghl-verify-published.sh <YYYY-MM-DD>
```
Covers are handed to the user to set as the reel thumbnail (or reuse as the carousel cover).

---

## Gotchas
- Carousels must publish `in_review` then be approved in GHL (scheduled-create collapses them) — the publisher enforces this.
- Never fabricate a stat, result, or quote from a reel — transcribe/verify, or mark `[__]`.
- Covers are 9:16 assets, not posts; the carousel/graphic are the scheduled posts.
- One reel commonly yields: 1 cover + 1 carousel (or graphic) + 5 captions. Batch many reels at once — the review file gathers them all behind one approval.
