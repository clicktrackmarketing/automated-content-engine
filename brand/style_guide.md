# Acme Video Co — Video Style Guide

**Purpose:** Master visual, brand, and editorial standards for every video produced with this engine.
**Use this with:** `video_brief_template.md` and `prompts_library.md`

Every editor, AI tool, and agent producing video reads this first. If a request conflicts with this guide, this guide wins.

---

## 1. Brand Identity

**Positioning:** Acme Video Co is a video-first content studio that turns raw footage into scroll-stopping social content. We handle editing, branding, and publishing so creators and businesses can focus on filming.

**Target audience:** Small business owners and content creators who want professional video without a production team. People who value quality and efficiency over cheap and fast.

**Brand voice across all video:**
- Confident, helpful, no-nonsense
- Creator to creator, never corporate
- Premium without being flashy
- Direct without being aggressive
- Smart without being academic

**Voice guardrails (do not do these):**
- No hypey bro-marketing tone
- No "secret hack" or "I'll show you the trick" language
- No fake urgency ("only 3 spots left!!!")
- No "guru" energy
- No corporate jargon ("synergy," "leverage," "circle back")

---

## 2. Catchphrases and Repeatable Lines

These appear across multiple videos and build brand recall. Use naturally, not forced.

- "Your footage. Our engine. Their attention."
- "Stop filming. Start publishing."
- "Raw to reel in one command."
- "Content that works as hard as you do."
- "Professional video without the production team."

---

## 3. Visual Aesthetic

**Overall feel:** Dark, data-driven, cinematic. Apple keynote meets premium SaaS. Cinematic, not flashy.

**Color palette (with CSS custom property names):**

| Role | Hex | CSS Variable | Use |
|------|-----|-------------|-----|
| Background primary | `#12284D` | `--brand-bg` | Main dark backgrounds, lower thirds, end cards |
| Accent primary | `#18C0E7` | `--brand-accent` | Data viz, highlights, key stat callouts |
| Accent CTA | `#FE6601` | `--brand-cta` | High-energy CTAs, urgency callouts, buttons |
| Accent positive | `#61CE70` | `--brand-positive` | "Win" moments, positive stats, growth arrows |
| Neutral dark | `#444444` | — | Body text on light backgrounds, secondary UI |
| Text primary | `#FFFFFF` | `--brand-text` | Headlines, captions, primary text on dark |

**Color usage rules:**
- Default video background: `#12284D` (deep navy), often pushed darker for cinematic depth
- Hero accent for data/tracking moments: `#18C0E7` (cyan)
- Urgency, CTA buttons, "act now" moments: `#FE6601` (orange)
- Wins, positive stats, growth reveals: `#61CE70` (green)
- Reserve white for headlines and captions only, never for big backgrounds
- Two accent colors max per shot (cyan + orange, or cyan + green). Three or more looks cluttered.

**Never:**
- Bright red (use orange `#FE6601` for urgency instead)
- Neon green that isn't `#61CE70`
- Yellow karaoke captions
- Pastel anything
- Gradient rainbows

**Typography for on-screen text:**

Primary font family: **Montserrat** (Google Fonts, free, broad weight range, excellent mobile readability).

| Use | Weight | Size guidance |
|-----|--------|---------------|
| Hook headline overlay | Montserrat Black (900) or ExtraBold (800) | Large, fills 60-70% of width |
| Stat callout (4.4X, 95%, $10K) | Montserrat Black (900) | Huge, dominant, single focal element |
| Captions / subtitle text | Montserrat SemiBold (600) | Mobile-readable, ~28-36pt at 1080p |
| Lower third / name plate | Montserrat Bold (700) | Mid-size |
| Body / explanation text | Montserrat Medium (500) or Regular (400) | Use sparingly, prefer voiceover |
| CTA text | Montserrat Bold (700) | Bold, with directional arrow icon |

**Typography rules:**
- All caps for stat callouts (e.g. "CONVERSIONS UP 4.4X")
- Title case for headlines (e.g. "Stop Filming Start Publishing")
- Sentence case for captions and CTAs
- Letter-spacing: tighten 1-2% on large display text, loosen 2-4% on all-caps
- Line height: 1.1 for headlines, 1.3 for captions
- Always test captions on a phone before finalizing. If you have to squint, scale up.

**Backup fonts:** Inter, Poppins, or Manrope.

**Never:**
- Comic Sans, Papyrus, script fonts
- Ultra-thin display fonts (vanish on mobile)
- Mixing two display font families in one video
- Italic for emphasis (use bold or color instead)

**Lighting reference (when filming on camera):**
- Soft key light from camera-left
- Subtle cool rim/back light
- Dark or out-of-focus background
- Never: Flat ring-light face, harsh overhead, washed-out daylight

---

## 4. Pacing Rules

**Talking head shots:**
- Maximum 4 to 6 seconds before a cut, B-roll insert, or visual mode change
- First 3 seconds must be the hook. No throat-clearing.
- Cut to B-roll on every stat, every name drop, every product reference
- Alternate between 3 camera angles (tight, medium, wide) on every cut

**Visual mode rotation (filmed content):**
- Rotate constantly between: Talking Head, Split-Screen, Screen Mockup, Result Gallery, Kinetic Typography
- Never stay in one mode for more than 4-6 seconds
- Target ~15-20 distinct visual segments per minute
- Hard cuts only — no dissolves, fades, or fancy transitions
- 2-3 kinetic typography "punch" moments per video

**B-roll and screen recordings:**
- 2 to 4 seconds per shot
- Slow push-ins or static. No shake. No crash zooms unless intentionally high-energy.

**Sales scripts:**
- Mid-tempo. Cut every 3 to 5 seconds.
- Hook, problem, solution, proof, CTA. Don't linger.

---

## 5. On-Screen Text Rules

**When to use on-screen text:**
- Every spoken stat (4.4x, 95%, $10K, etc.)
- Every product/brand name
- Every client name on case study moments
- Every CTA repeated visually

**How to format:**
- White text on dark background for stat callouts
- Bold weight, large size, mobile-readable (test on phone)
- Captions: white text, subtle drop shadow OR 70% opacity black background bar
- Captions on every video for sound-off viewing

**Hard rules:**
- No em dashes or hyphens used as punctuation in any on-screen text. Use periods, commas, or new lines.
- Compound modifiers like "AI-first" or "low-VOC" are fine.
- Brand name is always written in full in customer-facing text.
- No emoji in serious sales scripts. Light emoji okay on Instagram captions.

---

## 6. Format Specifications

| Format | Aspect Ratio | Length | Use Case |
|--------|--------------|--------|----------|
| Vertical (Reels/Shorts/TikTok) | 9:16 | 15 to 60 sec | Social hooks, viral scripts, daily content |
| Square (Feed posts) | 1:1 | 15 to 90 sec | LinkedIn, Instagram feed, FB feed |
| Landscape (YouTube/web) | 16:9 | 60 sec to 12 min | VSLs, website embeds, long-form |

**Per-format rules:**
- Vertical: subject in center vertical third, captions in middle, CTA in lower third
- Square: hook text top third, content middle, CTA bottom third
- Landscape: more breathing room, can hold shots 1 to 2 seconds longer

---

## 7. Music Direction

**Tone:** Confident, modern, cinematic. Not EDM drops. Not corporate elevator music.

**BPM by content type:**
- Talking head sales script: 80 to 100 BPM, sparse underscore
- Vertical hook video: 100 to 120 BPM, builds energy
- Highlight reel / event recap: 110 to 130 BPM, full drops
- VSL: 70 to 90 BPM, ambient cinematic underscore

**Reference vibes:**
- "Cinematic Tech Underscore"
- "Modern Documentary Score"
- "Apple Product Reveal"
- "Subtle Corporate Cinematic"

**Never:**
- Bro-marketing motivational sax
- Royalty-free YouTube tutorial music
- Anything with vocals during the hook or CTA

---

## 8. Prohibited Elements (Universal Bans)

- Generic stock footage of "diverse business people shaking hands"
- "AI-generated person looking at laptop" stock that screams stock
- Em dashes or hyphens as sentence punctuation in any on-screen text
- Comic Sans, Papyrus, or script fonts
- Yellow drop shadow karaoke captions
- Lens flare overuse
- Cheap zoom/shake transitions between every clip
- Uncanny valley AI faces
- Auto-generated YouTube subtitle styling
- "As seen on" logos that aren't real placements
- Fake countdown timers in CTAs

---

## 9. Signature Visual Library

These are hero shots that should appear in most videos when relevant:

1. **Analytics dashboard close-up** with slow push-in. Show data, charts, revenue numbers.
2. **Schema / code overlay** with cyan syntax on dark background. Use when explaining technical infrastructure.
3. **AI chat interface mockup** (ChatGPT, Claude, Perplexity) with a result highlighted.
4. **Before/after split** of a client result. Old version on the left, new version on the right.
5. **Data flow animation:** dot of light traveling through connected nodes with a counter ticking up.
6. **Map overlay** showing local dominance (cyan glow, pin on the business).

---

## 10. Pre-Production Checklist

Before any video is briefed, confirm:

- [ ] Format locked (vertical / square / landscape)
- [ ] Length target locked (15 / 30 / 45 / 60 / VSL)
- [ ] Hook is in the first 3 seconds
- [ ] At least one specific stat or proof point
- [ ] CTA is consistent across the video
- [ ] No em dashes anywhere in script or on-screen text
- [ ] Brand colors and fonts confirmed
- [ ] Music vibe locked

---

*This is an example brand ("Acme Video Co"). Replace with your own brand standards. See `docs/customization-guide.md`.*
