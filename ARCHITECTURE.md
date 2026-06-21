# Architecture

## System Overview

The Automated Content Engine is a Claude Code-powered pipeline that produces branded short-form video from raw topics or filmed footage and schedules them across social media platforms.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code CLI                              │
│                                                                  │
│  /edit-video ─────────────→ Single video editing pipeline        │
│  /content-machine ─────────→ Batch production + scheduling       │
│  /video-brief ─────────────→ Brief generation only               │
│  /style-check ─────────────→ Brand compliance audit              │
│  /broll-prompts ───────────→ B-roll prompt generation            │
│                                                                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Agent Team                                  │
│                                                                  │
│  video-director (orchestrator)                                   │
│    ├── scene-generator ──→ Higgsfield CLI (AI video/image)       │
│    ├── overlay-composer ─→ Hyperframes (HTML → ProRes MOV)       │
│    ├── audio-producer ───→ ElevenLabs API (TTS + transcripts)    │
│    └── post-producer ────→ FFmpeg (assembly + encoding)          │
│                                                                  │
│  content-strategist ─────→ Brief generation from topics          │
│  caption-writer ─────────→ Platform-specific captions            │
│  social-publisher ───────→ Publisher API (upload + schedule)     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Single Video (`/edit-video`)

```
Source Video (.mp4)
    │
    ├──→ ffprobe analysis (resolution, duration, codec)
    ├──→ FFmpeg audio extraction (.aac)
    ├──→ Whisper transcription (word-level .json)
    ├──→ FFmpeg reformat (crop/scale to 9:16)
    │
    ├──→ Higgsfield: generate B-roll clips
    ├──→ Hyperframes: render overlay MOVs (title, captions, CTA)
    │
    └──→ FFmpeg: composite all layers → final.mp4
```

### Batch Pipeline (`/content-machine`)

```
Topics or Footage
    │
    ▼
Phase 1: Initialize
    ├── Create project directories
    ├── (Filmed) Copy source, extract audio, transcribe
    │
    ▼
Phase 2: Content Strategist
    ├── Read brand system
    ├── Generate briefs with shot lists
    │
    ▼
Phase 3: ████ USER GATE 1 ████  ← Approve briefs
    │
    ▼
Phase 4: Video Director + Team
    ├── scene-generator ──→ AI clips (parallel)
    ├── overlay-composer ─→ MOV overlays (parallel)
    ├── audio-producer ───→ TTS + transcript (parallel)
    └── post-producer ────→ FFmpeg assembly (sequential, after above)
    │
    ▼
Phase 5: Caption Writer
    ├── instagram.md, youtube.md, linkedin.md
    │
    ▼
Phase 6-7: ████ USER GATE 2 ████  ← Approve videos + captions
    │
    ▼
Phase 8: Social Publisher
    ├── Upload media to publisher CDN
    ├── Schedule posts across platforms
    └── Generate publish-log.md
```

---

## Component Dependencies

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Higgsfield  │     │ Hyperframes  │     │  ElevenLabs  │
│  CLI (MCP)   │     │  (local)     │     │  (API)       │
│              │     │              │     │              │
│ AI video/img │     │ HTML → video │     │ TTS + voice  │
│ generation   │     │ with alpha   │     │ generation   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                     ┌──────▼───────┐
                     │    FFmpeg    │
                     │   (local)   │
                     │             │
                     │ Composite,  │
                     │ encode,     │
                     │ format      │
                     └──────┬──────┘
                            │
                     ┌──────▼───────┐
                     │  Publisher   │
                     │  (GHL API)  │
                     │             │
                     │ Upload,     │
                     │ schedule    │
                     └─────────────┘
```

### External Services

| Service | Type | Purpose | Required? |
|---------|------|---------|-----------|
| **Higgsfield** | MCP Server | AI video/image generation | Yes (for B-roll and AI-generated mode) |
| **Hyperframes** | Local CLI | HTML overlay → ProRes MOV rendering | Yes (for overlays and captions) |
| **ElevenLabs** | API | Text-to-speech voiceover | Only for AI-generated mode |
| **FFmpeg** | Local CLI | Video compositing, encoding, format conversion | Yes |
| **GHL** | API | Social media scheduling and publishing | Only for scheduling |
| **Whisper** | Local (via Hyperframes) | Audio transcription with word timestamps | Yes (for filmed mode) |
| **Playwright** | Local CLI | Website screenshots for B-roll | Optional |

---

## Directory Structure

```
automated-content-engine/
│
├── .claude/
│   ├── settings.local.json      # Tool permissions
│   ├── commands/                 # 5 user-invocable commands
│   │   ├── edit-video.md
│   │   ├── content-machine.md
│   │   ├── video-brief.md
│   │   ├── style-check.md
│   │   └── broll-prompts.md
│   └── agents/                   # 8 specialist agents
│       ├── video-director.md     # Orchestrator
│       ├── scene-generator.md    # AI generation
│       ├── overlay-composer.md   # Motion graphics
│       ├── audio-producer.md     # Voiceover
│       ├── post-producer.md      # FFmpeg assembly
│       ├── caption-writer.md     # Social captions
│       ├── content-strategist.md # Brief generation
│       └── social-publisher.md   # Scheduling
│
├── brand/                        # Brand identity system
│   ├── style_guide.md            # Master brand standards
│   ├── prompts_library.md        # Reusable Higgsfield prompts
│   ├── video_brief_template.md   # Brief structure template
│   ├── reference-edits/          # Editing style reference
│   └── logos/                    # Brand logos
│
├── templates/                    # HTML/GSAP overlay templates
│   ├── title-card.html           # Opening title
│   ├── lower-third.html          # Name/title bar
│   ├── cta-endcard.html          # Call-to-action
│   └── caption-sequence.html     # Word-synced captions
│
├── tools/
│   ├── init-project.sh           # Project directory scaffolder
│   ├── elevenlabs-tts.sh         # ElevenLabs TTS wrapper
│   ├── download-result.sh        # Higgsfield result downloader
│   └── publishers/
│       ├── README.md             # Publisher interface spec
│       └── ghl/                  # GoHighLevel publisher
│           ├── ghl-accounts.sh
│           ├── ghl-upload-media.sh
│           ├── ghl-post.sh
│           └── README.md
│
├── docs/
│   ├── SOP-video-content-pipeline.md
│   ├── customization-guide.md
│   └── publisher-interface.md
│
├── examples/
│   └── sample-project/
│       ├── brief.md              # Completed example brief
│       └── README.md
│
└── projects/                     # Runtime: generated project data
    └── (created by init-project.sh)
```

---

## Agent Architecture

### Team Mode (Content Machine)

The video-director spawns a team using Claude Code's `TeamCreate`:

```
video-director
├── TaskCreate: "Generate scenes" → scene-generator
├── TaskCreate: "Render overlays" → overlay-composer
├── TaskCreate: "Generate voiceover" → audio-producer (AI mode only)
└── TaskCreate: "Assemble video" → post-producer (blocked by above)
```

The first three agents work in parallel. Post-producer is blocked until all three complete.

### Filmed Mode (Reduced Team)

```
video-director
├── TaskCreate: "Generate B-roll" → scene-generator (B-ROLL rows only)
├── TaskCreate: "Render overlays" → overlay-composer
└── TaskCreate: "Assemble video" → post-producer (blocked by above)
```

No audio-producer — source audio from the filmed footage is used directly.

---

## Template System

All 4 HTML overlay templates use CSS custom properties for brand theming:

```css
:root {
  --brand-bg: #12284D;       /* Override with your background color */
  --brand-accent: #18C0E7;   /* Override with your accent color */
  --brand-cta: #FE6601;      /* Override with your CTA color */
  --brand-positive: #61CE70; /* Override with your positive/win color */
  --brand-text: #FFFFFF;     /* Override with your text color */
}
```

Templates are rendered by Hyperframes into ProRes 4444 MOV files with alpha transparency, then composited onto video by FFmpeg.

---

## Platform Output Format

All final videos must meet this spec for social platform compatibility:

| Property | Value |
|----------|-------|
| Container | MP4 |
| Video codec | H.264 (libx264) |
| Audio codec | AAC at 192kbps |
| Pixel format | yuv420p |
| moov atom | At start (-movflags +faststart) |
| 9:16 resolution | 1080x1920 |
| 16:9 resolution | 1920x1080 |
| Max file size | 500MB |
