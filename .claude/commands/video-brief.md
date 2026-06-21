# Create Video Brief

Read the brand system files before doing anything:
- `brand/style_guide.md`
- `brand/video_brief_template.md`
- `brand/prompts_library.md`

Then create a completed video brief for the user's request: $ARGUMENTS

## Steps

1. Parse the user's topic, script, or description
2. Determine format (9:16 vertical, 16:9 landscape, 1:1 square) from context or ask
3. Write the hook line (first 3 seconds, per style guide)
4. Build a timed shot list with B-roll insertion points every 5-6 seconds max
5. For each B-roll moment, select or adapt a prompt from `brand/prompts_library.md`
6. List all on-screen text cues with timing (stats, product names, CTA)
7. Specify music direction and BPM target
8. Fill in the brand compliance checklist
9. Save the completed brief to `projects/[name]/brief.md`

## Brand Enforcement

All output MUST comply with `brand/style_guide.md`:
- Colors: use the brand palette defined in the style guide (see CSS variables: `--brand-bg`, `--brand-accent`, `--brand-cta`, `--brand-positive`, `--brand-text`)
- Font: Montserrat (Black 900 for stats, Bold 700 for headlines, SemiBold 600 for captions)
- No yellow. No em dashes. No hypey bro-marketing tone.
- Hook in first 3 seconds. Cut every 5-6 seconds max.
- Captions: white text with subtle drop shadow or 70% black bar. No rainbow karaoke.
