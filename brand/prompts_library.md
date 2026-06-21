# Generative Prompts Library

**Purpose:** A reusable library of generative video prompts that match a dark, data-driven, cinematic aesthetic. Paste these directly into Higgsfield, Sora, Runway, or Veo. Tweak the bracketed variables per video.

**Prompt formula:**
```
[Subject + action] | [Camera direction] | [Lens/depth] | [Lighting] | [Color/aesthetic] | [Style reference] | [Aspect ratio + quality]
```

**Universal style anchors (paste into every prompt):**
- Color: "deep navy background (hex #12284D), electric cyan accents (hex #18C0E7), and warm orange highlights (hex #FE6601), with subtle green accents (hex #61CE70) on positive data, high contrast"
- Lighting: "cinematic, soft cool key light, subtle cyan rim light"
- Style: "shot in the style of an Apple product launch film crossed with a Bloomberg documentary"
- Quality: "4K cinematic, shallow depth of field, professional commercial production"

> **Note:** Replace the hex codes above with your brand's colors from `style_guide.md`. Most generative video tools don't read hex codes literally, but they do shift output noticeably when colors are described precisely.

---

## Category 1: Dashboard and Data Hero Shots

### Prompt 1.1: Analytics Dashboard Push-In
```
Extreme close-up of a glowing analytics dashboard on a large monitor, showing attribution data with bar charts and revenue numbers ticking upward, cyan and orange data visualizations on a deep navy background | slow dolly push-in | 85mm lens, shallow depth of field, screen sharp, background out of focus | cinematic cool cyan rim light, soft warm key from screen glow | deep navy (#12284D) and black with electric cyan (#18C0E7) and warm orange (#FE6601) accents | shot in the style of an Apple keynote product reveal | 16:9 aspect ratio, 4K cinematic quality
```

### Prompt 1.2: Data Flow Visualization
```
Abstract 3D data visualization of glowing dots traveling along electric cyan light paths, connecting nodes labeled with platform icons (chat bubble, globe, shopping cart), revenue counter ticking up in warm orange numerals (#FE6601) in the corner | slow rotation around the data network | wide cinematic shot | cool cyan ambient lighting with warm orange accent highlights | deep navy (#12284D) background with electric cyan (#18C0E7) and warm orange (#FE6601) | style of a high-end fintech commercial | 16:9 aspect ratio, 4K cinematic quality
```

### Prompt 1.3: Code Reveal
```
Extreme close-up of structured data code scrolling on a dark monitor, electric cyan (#18C0E7) and white syntax highlighting on near-black background, with subtle orange underlines highlighting key tags | slow horizontal pan across the code | 50mm lens, shallow depth of field | soft cool cyan screen glow lighting | deep navy (#12284D) and black with electric cyan (#18C0E7) text | shot in the style of a cybersecurity documentary | 16:9 aspect ratio, 4K cinematic quality
```

---

## Category 2: AI Search Hero Shots

### Prompt 2.1: AI Chat Interface Reveal
```
Close-up of a sleek AI chat interface on a dark mode screen, a user query typing in cool cyan text (#18C0E7), then an AI response appearing with a business name highlighted in warm orange (#FE6601) as the recommended answer | slow push-in on the answer | 85mm lens, shallow depth of field | soft cool monitor glow | deep navy (#12284D) and black with electric cyan (#18C0E7) user text and warm orange (#FE6601) highlight | shot in the style of an Apple product film | 9:16 vertical aspect ratio, 4K cinematic quality
```

### Prompt 2.2: City Map Domination
```
Aerial top-down view of a stylized dark city grid at night, a single bright orange pin glowing on one building (#FE6601) with cyan light beams (#18C0E7) radiating outward across the map | slow camera lift and rotation | wide cinematic shot | cool cyan ambient with warm orange highlight on the focal pin | deep navy city (#12284D) with electric cyan light streams (#18C0E7) and a warm orange focal point (#FE6601) | style of a futuristic strategy game cinematic | 16:9 aspect ratio, 4K cinematic quality
```

### Prompt 2.3: Chess King Hero
```
Cinematic close-up of a glowing warm orange chess king piece (#FE6601) standing on a dark city map with electric cyan light streams (#18C0E7) radiating from its base, blurred dark buildings in the background | slow dolly in and slight tilt up | 50mm lens, shallow depth of field | dramatic warm orange uplight on the king, cool cyan ambient | deep navy city (#12284D) with electric cyan light streams (#18C0E7) and a warm orange hero piece (#FE6601) | style of a high-end SaaS brand film | 16:9 aspect ratio, 4K cinematic quality
```

---

## Category 3: On-Camera Brand B-Roll

### Prompt 3.1: Professional at Desk
```
A confident professional in their 40s wearing a dark navy suit, sitting at a clean modern desk, looking thoughtfully at a glowing dashboard on a large monitor, face partially lit by screen glow, shot from behind the shoulder | slow push-in toward the monitor | 50mm lens, shallow depth of field, subject in soft focus | warm screen glow with cool cyan ambient | dark modern office with deep navy (#12284D) and warm orange (#FE6601) lighting | shot in the style of a premium financial services commercial | 16:9 aspect ratio, 4K cinematic quality
```

### Prompt 3.2: Hands Typing on Laptop
```
Extreme close-up of hands typing on a sleek matte black laptop, electric cyan (#18C0E7) and warm orange (#FE6601) data visible on the screen, dark wood desk with a coffee cup and notebook | static locked-off shot, subtle screen glow flickering | 85mm macro lens, shallow depth of field | warm orange desk lamp from the side, cool cyan screen glow from front | deep navy (#12284D) and black with electric cyan (#18C0E7) screen accents | style of a luxury productivity ad | 16:9 aspect ratio, 4K cinematic quality
```

---

## Category 4: Abstract Tech / Transition B-Roll

### Prompt 4.1: Particle Data Stream
```
Abstract flowing river of electric cyan (#18C0E7) and warm orange (#FE6601) light particles streaming across a dark void, particles occasionally forming digital glyph shapes before dissolving back into flow | slow horizontal tracking shot | wide cinematic | self-illuminated particles on near-black background | deep navy (#12284D) with electric cyan (#18C0E7) and warm orange (#FE6601) particle highlights | style of a cinematic ambient piece | 16:9 aspect ratio, 4K cinematic quality
```

### Prompt 4.2: Glowing Network Nodes
```
3D network of glowing nodes connected by thin electric cyan lines (#18C0E7), slowly pulsing and rotating in dark space, occasional warm orange node (#FE6601) lighting up brighter than others | slow orbital camera move around the network | wide shot | self-illuminated network on deep navy background | deep navy (#12284D) with electric cyan connections (#18C0E7) and warm orange focal nodes (#FE6601) | style of an AI/tech documentary opening | 16:9 aspect ratio, 4K cinematic quality
```

### Prompt 4.3: Vertical Stat Reveal Background
```
Abstract moving background of subtle electric cyan data lines (#18C0E7) and slow-moving particles on a deep navy background, with a darkened central area where text will be overlaid in post | static locked-off | wide vertical composition | soft self-illumination | deep navy (#12284D) and electric cyan (#18C0E7) | style of a premium SaaS product demo background plate | 9:16 vertical aspect ratio, 4K cinematic quality, loopable
```

---

## Category 5: Client Result / Case Study B-Roll

### Prompt 5.1: Before / After Split
```
Split-screen composition: left half shows a dull outdated website with washed-out colors fading into the dark, right half shows a sleek modern dark mode website with vibrant electric cyan and warm orange accents glowing | slow push-in toward the right half | wide cinematic | left side underexposed and cool, right side vibrant and cinematic | left side desaturated grey, right side deep navy (#12284D) with electric cyan (#18C0E7) and green (#61CE70) | style of a high-end agency case study reel | 16:9 aspect ratio, 4K cinematic quality
```

### Prompt 5.2: Score Counter Climbing
```
Extreme close-up of a digital scoring meter on a dark dashboard, the number rapidly climbing from a low score in muted orange (#FE6601 desaturated) to a perfect score in glowing green (#61CE70), the meter fills with electric cyan (#18C0E7) as it ascends | static locked-off shot, screen action only | 85mm lens, shallow depth of field on the score | soft cool screen glow | deep navy background (#12284D) with orange-to-green score gradient (#FE6601 to #61CE70) and electric cyan meter fill (#18C0E7) | style of a fitness tracker hero shot reimagined for SaaS | 16:9 or 9:16 aspect ratio, 4K cinematic quality
```

---

## Category 6: Mistake / Pain Point B-Roll

### Prompt 6.1: Money Burning Up
```
Slow-motion cinematic shot of a stack of currency notes catching fire and turning to glowing embers against a black background, edges curling in warm orange flame (#FE6601) | slow-motion locked-off shot | wide cinematic | dramatic warm orange uplight (#FE6601) from the flame itself, cool cyan ambient from behind | black background with warm orange flame highlights (#FE6601) | style of a Christopher Nolan film insert | 16:9 aspect ratio, 4K cinematic quality
```

### Prompt 6.2: Empty Calendar
```
Close-up of a digital calendar interface in dark mode, weeks of empty days slowly scrolling by, no appointments anywhere, only one faint grey "no events" placeholder | slow downward scroll | 50mm lens | soft cool screen glow, otherwise dim | dark navy and black with desaturated cool grey text | style of a melancholy productivity ad inverted | 16:9 aspect ratio, 4K cinematic quality
```

### Prompt 6.3: Competitor Winning
```
Cinematic shot of two business storefront signs side by side in a dark city at night, the left storefront is dim and unlit, the right storefront is glowing brightly with warm orange lighting (#FE6601) and a "RECOMMENDED" badge floating above it in electric cyan (#18C0E7) | slow dolly past both, settling on the right | wide cinematic | dramatic contrast between dim left and glowing right | deep navy night (#12284D) with warm orange storefront glow (#FE6601) and electric cyan badge (#18C0E7) | style of a futuristic local business commercial | 16:9 aspect ratio, 4K cinematic quality
```

---

## How to Use This Library With Claude Code

In your project folder, run:
```
"Read style_guide.md, video_brief_template.md, and prompts_library.md.
For my next video brief, identify every generative B-roll moment and select the
matching prompt from the library. Output the final ready-to-paste prompts
in a numbered list, with each prompt tagged to its timestamp in the script."
```

Claude Code will return a copy-paste list aligned to your timeline.

---

## Adding New Prompts

When you find a generative shot that works well, add it back to this library under the right category. The goal is to build a 50+ prompt library that covers every recurring visual need so you never start from scratch.

---

*Replace the hex color codes in these prompts with your own brand colors from `style_guide.md`.*
