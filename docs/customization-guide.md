# Customization Guide

This guide explains how to replace the example "Acme Video Co" brand with your own brand identity.

---

## Step 1: Define Your Brand Colors

Open `brand/style_guide.md` and replace the Acme Video Co color palette with your own:

| Role | What to Change | Used In |
|------|---------------|---------|
| Background | Primary dark color for overlays, cards, padding | Templates, overlays, FFmpeg padding |
| Primary accent | Highlight color for data, stats, active captions | Kinetic text, caption highlights, charts |
| CTA accent | Button/urgency color | End cards, CTA overlays |
| Positive accent | Success/growth color | Win stats, growth arrows |
| Text | Primary text color (usually white) | Headlines, captions, body text |

### Update CSS Variables in Templates

All 4 HTML templates (`templates/*.html`) use CSS custom properties. Update the `:root` block in each:

```css
:root {
  --brand-bg: #YOUR_BG_COLOR;
  --brand-accent: #YOUR_ACCENT_COLOR;
  --brand-cta: #YOUR_CTA_COLOR;
  --brand-positive: #YOUR_POSITIVE_COLOR;
  --brand-text: #FFFFFF;
}
```

### Update FFmpeg Padding Color

In `brand/style_guide.md`, note your background color hex. The post-producer agent uses this when padding 9:16 source footage. Search for `color=#` in the agent files to find these references.

---

## Step 2: Update Brand Voice

In `brand/style_guide.md`, customize:

1. **Brand name** — Replace "Acme Video Co" with your company name
2. **Catchphrases** — Replace the example catchphrases with your own (or remove)
3. **Voice description** — Adjust the tone descriptors to match your brand personality
4. **Banned elements** — Add any additional visual or textual elements to avoid

---

## Step 3: Build Your Prompt Library

Open `brand/prompts_library.md` and customize:

1. **Universal Style Anchors** — Update the color hex values to match your brand palette
2. **Style reference** — Change the visual aesthetic description (e.g., "Apple keynote meets Bloomberg" → your reference)
3. **Category prompts** — Replace or adapt each prompt category to match your industry:
   - Category 1-2: Your product/service hero shots
   - Category 3: Your on-camera B-roll style
   - Category 4: Abstract/transition visuals for your brand
   - Category 5: Client results relevant to your business
   - Category 6: Pain points your audience experiences

---

## Step 4: Add Your Logo

1. Place your logo files in `brand/logos/`:
   - `logo-white.png` — White version for dark backgrounds
   - `logo-color.png` — Full-color version
   - `logo-icon.png` — Square icon/mark only
2. Update any template or agent that references logo placement

---

## Step 5: Create Reference Edits (Optional)

If you have a reference video that demonstrates your desired editing style:

1. Extract keyframes at each cut point (every 1-3 seconds)
2. Save frames to `brand/reference-edits/frames/`
3. Write a structural analysis in `brand/reference-edits/editing-style-guide.md` covering:
   - Visual modes used (talking head, split-screen, mockups, etc.)
   - Cut rhythm and pacing
   - Color and typography patterns
   - Transition style
4. Add the source reel info to `brand/reference-edits/README.md`

---

## Step 6: Configure Your Publisher

The default publisher is GHL (GoHighLevel). To set it up:

1. Follow the instructions in `tools/publishers/ghl/README.md`
2. Set `GHL_API_KEY` and `GHL_LOCATION_ID` in your `.env`
3. Connect your social accounts in GHL

To use a different publisher, see `tools/publishers/README.md` for the interface spec and `docs/publisher-interface.md` for implementation details.

---

## Step 7: Update the Brief Template

Open `brand/video_brief_template.md` and customize:

1. Replace placeholder product/service names with yours
2. Update CTA examples to match your actual calls-to-action
3. Adjust the style checklist if you've changed brand rules

---

## Step 8: Test Your Setup

Run a quick validation:

```bash
# 1. Check that your brand files are complete
ls brand/style_guide.md brand/prompts_library.md brand/video_brief_template.md

# 2. Open Claude Code in the repo
cd /path/to/automated-content-engine

# 3. Test the style checker
# /style-check brand/style_guide.md

# 4. Test brief generation
# /video-brief "Why [your topic] matters for [your audience]"

# 5. Test a single video edit (if you have source footage)
# /edit-video /path/to/your/video.mp4
```

---

## File Checklist

After customization, verify these files contain YOUR brand info (not Acme Video Co):

- [ ] `brand/style_guide.md` — colors, voice, catchphrases
- [ ] `brand/prompts_library.md` — style anchors, prompt categories
- [ ] `brand/video_brief_template.md` — product names, CTAs
- [ ] `templates/title-card.html` — `:root` CSS variables
- [ ] `templates/lower-third.html` — `:root` CSS variables
- [ ] `templates/cta-endcard.html` — `:root` CSS variables, brand name, URL
- [ ] `templates/caption-sequence.html` — `:root` CSS variables
- [ ] `.env` — API keys and location IDs
