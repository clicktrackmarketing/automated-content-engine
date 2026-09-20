# Carousel Post — generate an on-brand multi-slide carousel and schedule it

Produce ONE top-notch, on-brand multi-slide **carousel** (a cover hook → body slides → CTA)
and schedule it with per-channel captions to the carousel-capable GHL accounts. This is the
multi-slide sibling of `/graphic-post`. Request: $ARGUMENTS

**Read the brand first** — every slide MUST stay on brand:
- `brand/ctm.local/ctm-brand.md` (real CTM colors, fonts, logo) — or `brand/style_guide.md` for the placeholder brand.
- `brand/ctm.local/graphic.brand.json` (tokens + asset paths the generator reads).

**Never post one caption verbatim across channels** (memory `social-captions-per-channel`).

---

## Where carousels can go (important)

| Platform | Carousel? | How this command handles it |
|---|---|---|
| Instagram | ✅ native carousel (≤10 slides) | Full slide set |
| LinkedIn (CTM page) | ✅ multi-image (~9) | Full slide set |
| Facebook (CTM page) | ✅ multi-photo (~10) | Full slide set |
| Google Business Profile | ❌ one image only | Post the **cover slide only** as a single image (via `ghl-post.sh`) + optional CTA button |
| TikTok / YouTube | ❌ video-only | Skip |

All slides in a set share ONE aspect ratio (Instagram locks the first slide's ratio for the set). Default canvas: **portrait 1080×1350**.

---

## Pipeline

### 1. Plan the narrative
Turn the topic into a tight sequence — a cover that stops the scroll, one idea per body slide, and a CTA. 4–6 slides is the sweet spot. Assign a section label (kicker) per body slide ("THE SYMPTOM", "WHY IT HAPPENS", "THE FIX") — it's the spine that makes the set read as one story.

### 2. Generate the slides
Write a carousel spec JSON (see `tools/make-carousel.mjs` header for the full schema) into `output/<slug>/`. Point `brand` at `brand/ctm.local/graphic.brand.json`. Per-slide `type` reuses the graphic vocabulary: `statement`, `stat`, `number`, `checklist`, `quote`, `image` (photo/screenshot band), `announcement`.

Brand rules (same as `/graphic-post`): CTM navy→cyan only, white headlines, two accents max, wrap only the 1–3 key headline words in `|pipes|`; `badgeStyle:"warn"` (amber) for genuine alerts only. BANNED: yellow karaoke, pastels, neon green, bright red, rainbow.

```bash
node tools/make-carousel.mjs output/<slug>/carousel.json
# -> output/<slug>/graphics/<out>/slide-NN/{index.html,meta.json} + carousel.json manifest
for d in output/<slug>/graphics/<out>/slide-*; do bash tools/render-graphic.sh "$d"; done
# -> slide-NN/graphic.png  (2160x2700 @2x for portrait)
```

### 3. Quality gate (mandatory)
Open every `slide-NN/graphic.png` and look. Confirm: consistent margins/logo/footer across slides; progress indicator advances; cover has the `SWIPE →` cue and the biggest headline; CTA has the ask + link; no clipped text; on-brand colors only; readable at phone size. Fix the spec and re-render before continuing. **Show the full set to the user and get approval before publishing** (outward-facing — always confirm).

### 4. Per-channel captions
Draft a distinct caption per platform (memory `social-captions-per-channel`). Carousel captions should tease slide 1's hook and tell people to swipe. Write to `output/<slug>/captions/<platform>.txt`. Link inline on FB/LinkedIn; full URL on Instagram (never "link in bio" unless asked); GBP link via the CTA button.

### 5. Publish
`set -a && source .env && set +a`. Get account IDs + the posting user id (`tools/publishers/ghl/README.md`; user id via `createdBy` on any existing post). Upload EVERY slide once, in order, and collect the hosted URLs:

```bash
for d in output/<slug>/graphics/<out>/slide-*; do
  bash tools/publishers/ghl/ghl-upload-image.sh "$d/graphic.png"
done   # capture each returned URL IN ORDER (slide-01 first = the cover)
```

Then, for each carousel-capable account (Instagram, LinkedIn, Facebook):
```bash
bash tools/publishers/ghl/ghl-carousel-post.sh \
  --account-id <id> --user-id <uid> \
  --summary "$(cat output/<slug>/captions/<platform>.txt)" \
  --media-urls "<url1>,<url2>,<url3>,<url4>,<url5>" \
  --media-type image/png --status scheduled --schedule <future-UTC-ISO>
```

For **Google Business Profile**, post the COVER ONLY as a single image with the CTA:
```bash
bash tools/publishers/ghl/ghl-post.sh \
  --account-id <gbp-id> --user-id <uid> \
  --summary "$(cat output/<slug>/captions/gbp.txt)" \
  --media-url "<url1>" --media-type image/png \
  --post-type post --status scheduled --schedule <future-UTC-ISO> \
  --cta-url <link> --cta-type LEARN_MORE
```

### 6. Verify
```bash
bash tools/publishers/ghl/ghl-verify-published.sh <YYYY-MM-DD>
```
Report each platform's status, live link, and engagement.

---

## Gotchas (learned)
- **Carousels must be created `in_review`, not `scheduled`.** GHL collapses a multi-image post to a single image (only `media[0]`) when created directly as `status:"scheduled"` — and its PUT does the same. Multi-image only survives when created `in_review` (with `--approver <userId>`) then approved in GHL's Social Planner (approve preserves all slides). The scripts now refuse `--status scheduled` for carousels.
- `media` order = display order; `media[0]` is the cover. Upload/collect slides in order.
- All slides one aspect ratio; keep the set ≤10 (Instagram cap) — the script warns past 10.
- `type` stays `post` for carousels (never `reel`); it's immutable after create (delete + recreate to change).
- GBP takes only the first image — post the cover only there, don't send the whole set.
- `scheduleDate` must be future UTC (`...Z`) or 422.
- A 201 nests the post at `results.post`; don't read a false failure from a missing top-level id.
- GHL soft-deletes the scheduled record at fire time and creates a published one — verify with `ghl-verify-published.sh`, not the created id.
