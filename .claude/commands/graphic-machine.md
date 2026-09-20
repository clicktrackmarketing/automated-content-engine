# Graphic Machine — batch-produce a week of on-brand graphics & carousels

Turn a list of topics into a full batch of on-brand still graphics and/or carousels, per-channel
captions, and a spaced weekly schedule — behind ONE approval gate. This is the batch sibling of
`/graphic-post` and `/carousel-post`. Input: `$ARGUMENTS`

**Read the brand first** — every asset MUST stay on brand:
- `brand/ctm.local/ctm-brand.md` (real CTM colors/fonts/logo) or `brand/style_guide.md` (placeholder).
- `brand/ctm.local/graphic.brand.json` (tokens the generators read).

**Never reuse one caption across channels** (memory `social-captions-per-channel`). Reuse the layout
vocabulary and gotchas from `/graphic-post` (memory `graphic-generator`) and `/carousel-post`
(memory `carousel-generator`).

---

## Input

Comma-separated topics: `/graphic-machine topic one, topic two, topic three`

Per-topic format:
- Default = single **graphic**.
- Prefix a topic with `carousel:` to force a carousel, or `graphic:` to force a single graphic.
- Otherwise infer: step-by-step / listicle / "how to" / "N ways" / checklist topics → **carousel**; a single hook, stat, or announcement → **graphic**.

Optional flags: `--start YYYY-MM-DD` (first publish day; default tomorrow), `--platforms a,b,c`
(default `instagram,facebook,linkedin,linkedin_personal,gbp`).

---

## Pipeline

### 1. Author the batch spec (this is the craft step)
Write `output/gm-<YYYY-MM-DD>/batch.json`. For EACH topic decide the format, then write:
- an on-brand generator `spec` (a `/graphic-post` spec for graphics; a `/carousel-post` slides spec for carousels — cover hook → one idea per body slide → CTA). Wrap only the 1–3 key words in `|pipes|`; CTM navy/cyan only; `badgeStyle:"warn"` for genuine alerts only.
- five per-channel `captions` (`instagram`, `facebook`, `linkedin`, `linkedin_personal`, `gbp`) in each channel's voice; Instagram uses the full URL (never "link in bio" unless asked); GBP is concise (its link rides the CTA button).
- the `link` and the `platforms` for that item.

Set the top-level `brand` to `../../brand/ctm.local/graphic.brand.json`, plus `startDate` and any
`platformTimes`. See `tools/graphic-batch.mjs` header for the exact schema.

### 2. Render the whole batch
```bash
node tools/graphic-batch.mjs output/gm-<YYYY-MM-DD>/batch.json
```
This renders every item (via the tested `make-graphic`/`make-carousel` + `render-graphic.sh`),
computes a spaced schedule (one item per day, each platform at its optimal time), and writes
`projects/<batch>/review.md` + `projects/<batch>/batch.manifest.json` + per-item caption files.

### 3. Quality gate (mandatory)
Open a sample of the rendered PNGs under `projects/<batch>/items/*/graphics/…` — at least every cover
and one body slide. Confirm on-brand, no clipping, readable at phone size, correct accents. Fix the
`batch.json` spec and re-run step 2 for anything off.

### 4. ONE approval gate
Present `projects/<batch>/review.md` to the user. It lists every item: the rendered slides/image, the
five captions, and the proposed schedule, each with a pre-checked `[x]`. Ask them to **uncheck**
anything they don't want and add change notes. Make requested changes (edit `batch.json`, re-run
step 2) and re-present. **Do not publish until the user confirms.**

### 5. Publish (after approval)
```bash
set -a && source .env && set +a
bash tools/publishers/ghl/ghl-publish-batch.sh projects/<batch> --dry-run   # preview first
bash tools/publishers/ghl/ghl-publish-batch.sh projects/<batch> --status scheduled
```
The publisher reads the manifest, resolves accounts, uploads each image once, and schedules each item:
full set → Instagram/LinkedIn/Facebook (carousel or graphic); **cover-only → Google Business Profile**
(with the CTA button). It honours the approval gate (refuses if any box is unchecked, unless `--force`)
and logs to `projects/<batch>/publish-log.md`.

### 6. Verify
```bash
bash tools/publishers/ghl/ghl-verify-published.sh <YYYY-MM-DD>   # per scheduled day
```
Report per-platform status, live links, and engagement.

---

## Rules & gotchas
- **Batches with carousels must publish `in_review`, not `scheduled`.** GHL drops all but the first image when a carousel is created directly as scheduled. Publish with `--status in_review`, then approve in GHL's Social Planner (approve preserves every slide). `ghl-publish-batch.sh` refuses `--status scheduled` when the batch contains any carousel.
- ONE approval gate — the review file. Pre-check the boxes to reduce friction.
- Spacing: one item per day; never more than one post per platform per day (the engine enforces this).
- Carousels: all slides one aspect ratio, ≤10 slides; GBP gets the cover only.
- `scheduleDate` is future UTC; `type` is `post` and immutable; a 201 nests at `results.post`; GHL
  soft-deletes the scheduled record at fire time — always verify with `ghl-verify-published.sh`.
- Produce as much as possible: if one item fails to render, the engine logs it and continues.
- Publishing env: `GHL_API_KEY`, `GHL_LOCATION_ID`. Steps 1–4 work without them.
