# Edit Video with Brand Standards

Read the brand system files first:
- `brand/style_guide.md`
- `brand/prompts_library.md`
- `brand/video_brief_template.md`

Then process the video file: $ARGUMENTS

## Pipeline

1. **Analyze the source video** — ffprobe for resolution, duration, codec, rotation
2. **Extract audio** — separate audio track for transcription
3. **Transcribe** — use Hyperframes whisper-cpp for word-level timestamps
4. **Reformat** — crop/scale to target aspect ratio if needed (9:16 for Reels/Shorts, 16:9 for YouTube)
5. **Create overlays** — all overlays MUST use brand colors and Montserrat font:
   - Title card (0-4s): brand background color bg, white headline, accent color accents
   - Captions (full duration): white Montserrat SemiBold 600, word-level timing, NO yellow highlight, use brand accent for active word or bold white
   - CTA end card (last 5-6s): brand bg, white headline, CTA color button, accent brand name
6. **Identify B-roll moments** — every 5-6 seconds max without a visual change, per pacing rules
7. **Generate B-roll** — use Higgsfield with prompts from `brand/prompts_library.md`, adapted to content
8. **Render overlays** — Hyperframes render as ProRes MOV (not WebM, alpha doesn't work in FFmpeg)
9. **Assemble** — FFmpeg composite: base video + B-roll cuts + overlays + original audio
10. **Quality check** — resolution, duration, file size, audio sync, no black frames, faststart

## Overlay Rendering Notes (Learned)

- Always use `--format mov` for transparent overlays (ProRes 4444 with alpha)
- WebM VP9 Profile 0 alpha does NOT work with FFmpeg overlay filter
- Hyperframes requires `index.html` in the project directory
- Set `PATH="/opt/homebrew/bin:$PATH"` before Hyperframes render commands
- Render command: `cd ~/hyperframes && npx hyperframes render --format mov`

## Color Rules (STRICT)

Read `brand/style_guide.md` for exact hex values. The templates use CSS custom properties:
- `--brand-bg` — background color (NOT black, NOT generic dark)
- `--brand-accent` — primary accent for highlights, data viz, brand elements
- `--brand-cta` — CTA accent for buttons, urgency, calls to action
- `--brand-positive` — win accent for positive stats, growth indicators
- `--brand-text` — text color for headlines, captions, primary text
- BANNED: yellow (`#facc15` or any yellow), pastel, neon green, bright red, gradient rainbows
