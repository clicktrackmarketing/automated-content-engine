# Reference Editing Style Guide

Derived from frame-by-frame analysis of a high-performing Instagram Reel (73s, 720x1280, 18.8K likes, 1M follower account).

Source frames: `brand/reference-edits/frames/frame_001.jpg` through `frame_036.jpg` (sampled every 2 seconds).

---

## 1. Structure: Alternating Visual Modes

The edit never stays in one mode for more than 4-6 seconds. It constantly rotates between 5 visual modes:

| Mode | Description | Duration per cut |
|------|------------|-----------------|
| **Talking Head** | Full-screen speaker, multiple angles | 1-3s |
| **Split-Screen** | Speaker (bottom 50%) + demo/UI (top 50%) | 3-5s |
| **Screen Mockup** | Terminal/folder/calendar UI, centered on light gray bg | 3-5s |
| **Result Gallery** | Generated output on floating cards, stacked cascade | 2-4s |
| **Kinetic Typography** | Single massive word in accent color, speaker blurred behind | 1-2s |

**Typical flow:**
```
Talk → Screen Demo → Talk → Results → Talk → Kinetic Text → Talk → Split-Screen → ...
```

**Pacing:** ~15-20 distinct segments per minute. Cuts every 1-2 seconds on talking head, longer holds (3-5s) on demos and results.

---

## 2. Talking Head Shots

### Camera Angles (3 angles, rotated rapidly)
- **Wide**: Shows table, drink, room context. Slightly elevated angle looking down.
- **Medium**: Waist-up, laptop on lap visible, hands gesturing.
- **Tight**: Shoulders and head, fills frame. Used for emphasis moments.

### Cinematography
- Shallow depth of field (subject sharp, background soft bokeh)
- Warm ambient lighting from practical sources (pendant lamp, wall sconces)
- Cool blue screen glow on face from laptop (creates contrast)
- Room setting: cozy/moody with art, mid-century furniture, shelving

### Cut Rhythm
- Switch angles every 1-3 seconds during talking segments
- **Hard cuts only** — no dissolves, fades, or transitions
- Cut on emphasis words or natural speech pauses

---

## 3. Word-Level Captions

### Placement
- Bottom center of frame, roughly 15-20% from bottom edge
- Only on talking head segments (not on screen mockups or result galleries)

### Typography
- **One word at a time** (or 2-3 word phrase max)
- Bold sans-serif font (Montserrat Bold or similar)
- White text as default
- **Accent color** on emphasis/key words (use your brand accent from `style_guide.md`)

### Behavior
- Words appear and disappear in sync with speech
- Key emotional or action words get the accent color
- Natural rhythm — not every word is highlighted

---

## 4. Kinetic Typography Moments

### Purpose
2-3 per video, evenly spaced. These are the "punch" moments — single words that carry maximum emphasis.

### Visual Treatment
- **Single word** takes up 40-60% of screen width
- Color: brand accent color
- Smaller lead-in text above in white (e.g., "with the right" small → "SKILLS" massive)
- Speaker visible but **intentionally blurred** behind the text
- Background acts as a dimmed/defocused texture

### Timing
- Hold for 1-2 seconds max
- Always preceded by talking head building up to the word
- Always followed by either a result showcase or return to talking head

---

## 5. Screen Mockup Overlays

### Window Chrome
- macOS-style terminal window with red/yellow/green traffic light dots
- Title bar: `~/projects/my-app`
- Dark background (`#0D0D0D` to `#1A1A2E`)
- Rounded corners with subtle shadow

### Content Types Inside Mockup

**Terminal/CLI:**
- Monospace font, colored syntax (green commands, yellow params, pink values)
- Simulated typing animation
- Product thumbnails inline (small image in the terminal output)

**Folder/File System:**
- Color-coded folder icons
- File icons with descriptive names
- Represents the pipeline: content → captions → AI → publish

**Calendar/Scheduling:**
- Dark calendar widget showing month view
- Accent-colored date highlights
- Scheduling panel with file thumbnails + time

### Placement
- Centered on light gray background (`#E0E0E5`)
- Takes up roughly 60-70% of frame width
- Can be full-screen or upper half in split-screen mode

### Animation
- Smooth zoom/scale into the mockup content
- Elements appear sequentially (typing effect, folder-by-folder reveal)

---

## 6. Result Gallery / Showcase

### Single Result
- Generated image displayed on a floating card
- Rounded corners (12-16px radius)
- Subtle drop shadow
- Light gray background behind card
- Label text at bottom in accent color

### Stacked Card Cascade
- 3-4 result images shown as overlapping tilted cards
- Cards fan out at slight angles (plus/minus 5-10 degrees)
- Dynamic animation: cards cascade/reveal sequentially

### Multi-Image Grid
- 2x2 or 3x3 grid layout
- All results from a single generation batch

---

## 7. Split-Screen Layout

### Composition
- **Top 50%**: Screen demo, UI mockup, calendar, or results
- **Bottom 50%**: Talking head (medium or tight shot)
- Sharp horizontal dividing line (no gradient blend)

### Usage
- Used when the speaker is explaining what's on screen
- Maintains visual connection between narrator and content
- Word captions appear at the split line between the two halves

---

## 8. Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Accent (captions, kinetic text, UI highlights) | Lime/Chartreuse | `#BFFF00` |
| Primary text | White | `#FFFFFF` |
| Screen mockup background | Near-black | `#0D0D0D` |
| Card/mockup surround | Light gray | `#E0E0E5` |
| Terminal chrome | Standard macOS | — |
| Room tone | Warm amber | — |
| Screen glow | Cool blue | — |

> **For brand adaptation:** Replace `#BFFF00` lime with your brand accent color from `style_guide.md`. All structural patterns remain identical.

---

## 9. Transitions

- **Hard cuts** — the dominant transition (90%+ of cuts)
- **Zoom scale** — smooth zoom into screen mockup content
- **Card cascade** — stacked cards fan out for result reveals
- **Blur-to-sharp** — background blurs, kinetic text appears sharp in foreground
- **NO dissolves, wipes, fades, or fancy transitions**

---

## 10. Pacing Breakdown (73s reel)

| Timestamp | Mode | Content |
|-----------|------|---------|
| 0-2s | Talking Head (tight) | Hook/intro |
| 2-6s | Split-Screen | Speaker + terminal mockup |
| 6-8s | Screen Mockup | Full-screen terminal with code |
| 8-10s | Talking Head (wide) | Continue narration |
| 10-14s | Screen Mockup | Folder icons, file structure |
| 14-16s | Result Gallery | Generated image grid |
| 16-18s | Kinetic Typography | Accent word, full frame |
| 18-22s | Talking Head (medium) | Transition to next topic |
| 22-26s | Split-Screen | Speaker + more terminal |
| 26-30s | Screen Mockup | CLI with product thumbnail |
| 30-34s | Screen Mockup (zoom) | Zoomed into terminal details |
| 34-38s | Result Gallery | Single card with label |
| 38-42s | Result Gallery | Stacked card cascade |
| 42-44s | Talking Head (tight) | Caption on screen |
| 44-50s | Screen Mockup | Folder system, full pipeline |
| 50-52s | Talking Head (wide) | Hand gestures |
| 52-56s | Split-Screen | Calendar + scheduling + speaker |
| 56-58s | Talking Head (wide) | Kinetic text moment |
| 58-62s | Screen Mockup | Terminal, login screen |
| 62-64s | Screen Mockup | Auth transition |
| 64-68s | Talking Head | Kinetic typography |
| 68-70s | Screen Mockup | File icons on dark bg |
| 70-73s | Talking Head (medium) | Closing, CTA |

---

## 11. Brand Adaptation Rules

When applying this editing style to your brand:

1. **Accent color**: Replace `#BFFF00` (lime) with your brand accent from `style_guide.md`
2. **Terminal mockup**: Replace generic paths with brand-relevant paths or UI
3. **Result showcases**: Show your product's outputs, not generic images
4. **Folder structure**: Adapt categories to your services or workflow
5. **Font**: Use your brand font from `style_guide.md` for all text overlays
6. **Background**: Use your brand background color for screen mockups
7. **CTA button**: Use your brand CTA color
8. **Logo**: Your logo on final frame or persistent watermark

### B-Roll Category Suggestions
Adapt B-roll categories to your niche:
- **SaaS/Tech**: Dashboard screenshots, API responses, code editors
- **E-commerce**: Product photos, order confirmations, review screenshots
- **Local business**: Map results, Google Business profiles, review highlights
- **Creator**: Content calendars, analytics, follower growth charts
