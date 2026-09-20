# Graphic Post — generate an on-brand graphic and schedule it across social

Produce ONE top-notch, on-brand still graphic and schedule it (with per-channel
captions) to the connected GHL social accounts. This is the still-image sibling
of `/content-machine` (video). Request: $ARGUMENTS

**Read the brand first** — the graphic MUST stay on brand:
- `brand/ctm.local/ctm-brand.md` (real CTM colors, fonts, logo) — or `brand/style_guide.md` for the open-source placeholder brand.
- `brand/ctm.local/graphic.brand.json` (tokens + asset paths the generator reads).

**Never post one caption verbatim across channels.** Tailor each (see memory `social-captions-per-channel`).

---

## Inputs

Accept whichever the user gives:
- A **topic/message** (generate the graphic), and/or
- An existing **finished image** (`--image <path>`) to skip generation, and/or
- A **blog/CTA link** to attach.

Ask only what you truly need: the platforms and the timing (unless the user already said). Default platform set for a still image: **Facebook, Instagram, LinkedIn (CTM page), LinkedIn (David Esau), Google Business Profile.** Never send stills to TikTok/YouTube (video-only).

---

## Pipeline

### 1. Generate the graphic (skip if `--image` given)
Write a spec JSON (see `tools/make-graphic.mjs` header for fields) into a working dir under `output/<slug>/`. Pick the layout that fits the message:
- `announcement` — alert/news hook + subline + optional badge (the Cloudflare style)
- `statement` — a bold centered claim
- `stat` — one big number
- `checklist` — headline + ticked items
- `quote` — pull quote + attribution

Rules for a top-notch, on-brand result:
- Point `brand` at `brand/ctm.local/graphic.brand.json`. Use CTM navy `#0a172e`→`#070f1d`, cyan accent `#14c3eb`/`#1ad5ff`, white headlines only. **Two accents max.** BANNED: yellow karaoke, pastels, neon green, bright red, rainbow.
- Wrap the 1–3 most important words of the headline in `|pipes|` for the cyan accent — not the whole line.
- Keep the headline to ≤ ~6 words per line; let auto-fit size it (override `size` only if needed).
- Default canvas `square` (1080×1080) — best across FB/IG/LI/GBP. Use `portrait` (1080×1350) only if IG-first.
- Use `badgeStyle:"warn"` (amber) sparingly, for genuine alerts only.

```bash
node tools/make-graphic.mjs output/<slug>/spec.json           # -> output/<slug>/graphics/<name>/{index.html,meta.json}
bash tools/render-graphic.sh output/<slug>/graphics/<name>    # -> graphic.png (2160×2160 @2x)
```

### 2. Quality gate (mandatory — this is the "top notch" guarantee)
Open `graphic.png` and actually look at it. Confirm: logo present and crisp; accent on the right words only; no text clipped or overflowing; comfortable margins; readable at phone size; on-brand colors only. If anything is off, edit the spec and re-render before continuing. **Show the rendered PNG to the user and get approval before publishing.** Publishing is outward-facing — always confirm first.

### 3. Per-channel captions
Draft a distinct caption per selected platform (see memory `social-captions-per-channel` for the voice of each). Write them to `output/<slug>/captions/<platform>.txt` so they're reviewable and quoting-safe. Include the link inline on FB/LinkedIn, as the full URL on Instagram (links aren't clickable there — never "link in bio" unless the user says so), and via the GBP CTA button for Google.

### 4. Publish
Load creds: `set -a && source .env && set +a`. Get account IDs and the posting user id (see `tools/publishers/ghl/README.md` and the `social-publisher` agent; user id via `createdBy` on any existing post). Then:

```bash
bash tools/publishers/ghl/ghl-upload-image.sh output/<slug>/graphics/<name>/graphic.png   # -> hosted URL
```
Upload ONCE, reuse the URL for every account. Schedule each with a **future UTC** `scheduleDate` (`...Z`; a past value → 422). Post `--status scheduled`. For Google Business Profile add the CTA:

```bash
bash tools/publishers/ghl/ghl-post.sh \
  --account-id <id> --user-id <uid> \
  --summary "$(cat output/<slug>/captions/<platform>.txt)" \
  --media-url <hosted-url> --media-type image/png \
  --post-type post --status scheduled --schedule <UTC-ISO> \
  [--cta-url <link> --cta-type LEARN_MORE]        # GBP only
```

### 5. Verify
Do NOT trust the created post IDs — GHL soft-deletes the scheduled record at fire time and creates a new published one. After the scheduled time:

```bash
bash tools/publishers/ghl/ghl-verify-published.sh <YYYY-MM-DD>
```
Report each platform's status, the live post link, and engagement.

---

## Gotchas (learned the hard way)
- Image upload needs `ghl-upload-image.sh`; the old `ghl-upload-media.sh` is video-only.
- `scheduleDate` must be future UTC ISO or you get 422 "must be after current date".
- `type` is immutable after creation; to change it, delete and recreate.
- This account has a large existing content calendar — filter by date and only touch posts you created.
- GHL insights lag; engagement often reads 0 for the first hours even when the post is fine.
