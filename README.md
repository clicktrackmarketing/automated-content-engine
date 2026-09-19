# Automated Content Engine

An AI-powered video content pipeline built on [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Takes raw topics or filmed footage and produces fully edited, branded short-form videos scheduled across social media platforms.

## What It Does

- **Single video editing** (`/edit-video`) — Takes filmed footage and produces a branded video with multi-angle cuts, word-level captions, title cards, AI B-roll, and CTA end cards
- **Batch content production** (`/content-machine`) — Takes multiple topics or videos and produces scheduled posts across Instagram Reels, YouTube Shorts, LinkedIn, TikTok, and Facebook with 2 approval gates
- **Graphic posts** (`/graphic-post`) — Generates a top-notch, on-brand still graphic (announcement / statement / stat / checklist / quote layouts), writes per-channel captions, and schedules it to the image-friendly accounts (Facebook, Instagram, LinkedIn, Google Business Profile) with a publish-verification step
- **Carousel posts** (`/carousel-post`) — Generates a multi-slide, on-brand carousel (cover hook → body slides → CTA, with progress counter, swipe cue, and a consistent set system), writes per-channel captions, and schedules it to the carousel-capable accounts (Instagram, LinkedIn, Facebook; cover-only to Google Business Profile) with verification
- **Brief generation** (`/video-brief`) — Creates production-ready video briefs from topics
- **Style compliance** (`/style-check`) — Audits overlays and templates against brand standards
- **B-roll prompts** (`/broll-prompts`) — Generates Higgsfield prompts from scripts

## Documentation

- [docs/RUNBOOK.md](docs/RUNBOOK.md) — step-by-step: footage to scheduled post
- [docs/editing-method.md](docs/editing-method.md) — pause detection, tightening, verification
- [docs/SOP-video-content-pipeline.md](docs/SOP-video-content-pipeline.md) — the slash-command workflow
- [docs/customization-guide.md](docs/customization-guide.md) — replacing the example brand
- [SECURITY.md](SECURITY.md) — secrets and the pre-commit guard

## Architecture

```
Topics/Footage → Content Strategist → [Approve] → Video Director + Team → [Approve] → Social Publisher
                                                        │
                                          ┌─────────────┼─────────────┐
                                          │             │             │
                                    Scene Generator  Overlay    Audio Producer
                                    (Higgsfield)    Composer    (ElevenLabs)
                                                  (Hyperframes)
                                          │             │             │
                                          └─────────────┼─────────────┘
                                                        │
                                                  Post-Producer
                                                    (FFmpeg)
```

8 specialist agents coordinate through Claude Code's team system. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system design.

## Quick Start

### Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed
- [FFmpeg](https://ffmpeg.org/) (`brew install ffmpeg`)
- [Hyperframes](https://github.com/nichochar/hyperframes) for overlay rendering
- [Higgsfield](https://higgsfield.ai/) MCP server connected for AI video generation

### Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/your-org/automated-content-engine.git
   cd automated-content-engine
   ```

2. **Copy the environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Set your API keys** in `.env`:
   ```bash
   GHL_API_KEY=your-ghl-private-integration-token
   GHL_LOCATION_ID=your-ghl-location-id
   ELEVEN_API_KEY=your-elevenlabs-api-key  # Optional, for AI voiceover
   ```

4. **Customize the brand** (or use the example "Acme Video Co" brand to test):
   - Edit `brand/style_guide.md` with your colors, voice, and catchphrases
   - Update CSS variables in `templates/*.html`
   - See [docs/customization-guide.md](docs/customization-guide.md) for the full walkthrough

5. **Open Claude Code in the repo:**
   ```bash
   claude
   ```

### Usage

**Edit a single video:**
```
/edit-video /path/to/your/video.mp4
```

**Batch produce from topics:**
```
/content-machine why AI search matters, how to optimize for ChatGPT, local SEO in 2026
```

**Batch produce from filmed footage:**
```
/content-machine --filmed ~/Desktop/vid1.mp4, ~/Desktop/vid2.mp4
```

**Generate a brief:**
```
/video-brief "why your website needs to be the answer to AI search"
```

## Brand System

The repo ships with an example brand ("Acme Video Co") that you can use immediately or replace with your own.

| File | Purpose |
|------|---------|
| `brand/style_guide.md` | Master visual standards: colors, typography, voice, rules |
| `brand/prompts_library.md` | Reusable Higgsfield prompts organized by category |
| `brand/video_brief_template.md` | Brief structure template with all required sections |
| `brand/reference-edits/` | Editing style analysis for filmed-mode pacing |
| `brand/logos/` | Logo files (add your own) |

### Template Theming

All overlay templates use CSS custom properties for easy brand customization:

```css
:root {
  --brand-bg: #12284D;
  --brand-accent: #18C0E7;
  --brand-cta: #FE6601;
  --brand-positive: #61CE70;
  --brand-text: #FFFFFF;
}
```

## Publisher System

The default publisher is GHL (GoHighLevel). The publisher interface is modular — you can add Buffer, Hootsuite, or any service by implementing 3 shell scripts:

1. **List accounts** — discover connected social platforms
2. **Upload media** — upload video to CDN, return URL
3. **Schedule post** — create a scheduled post with caption and media

See [tools/publishers/README.md](tools/publishers/README.md) for the interface spec and [docs/publisher-interface.md](docs/publisher-interface.md) for implementation guide.

## Project Structure

```
automated-content-engine/
├── .claude/commands/     # 5 slash commands
├── .claude/agents/       # 8 specialist agents
├── brand/                # Brand identity system
├── templates/            # HTML/GSAP overlay templates
├── tools/                # Shell scripts and publisher integrations
├── docs/                 # SOP, customization guide, publisher docs
├── examples/             # Sample project with completed brief
└── projects/             # Runtime output (gitignored)
```

## Documentation

| Doc | Description |
|-----|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, data flow, agent architecture |
| [docs/SOP-video-content-pipeline.md](docs/SOP-video-content-pipeline.md) | Step-by-step operations guide |
| [docs/customization-guide.md](docs/customization-guide.md) | How to replace the example brand with yours |
| [docs/publisher-interface.md](docs/publisher-interface.md) | How to build a custom publisher |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |

## Dependencies

All external dependencies are open-source or publicly available:

| Dependency | License/Type | Purpose |
|-----------|-------------|---------|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | Anthropic | AI agent orchestration |
| [Higgsfield](https://higgsfield.ai/) | Commercial (MCP) | AI video/image generation |
| [Hyperframes](https://github.com/nichochar/hyperframes) | Apache 2.0 | HTML overlay → video rendering |
| [FFmpeg](https://ffmpeg.org/) | LGPL/GPL | Video compositing and encoding |
| [ElevenLabs](https://elevenlabs.io/) | Commercial API | Text-to-speech voiceover |
| [GHL](https://www.gohighlevel.com/) | Commercial API | Social media scheduling |
| [GSAP](https://gsap.com/) | Standard License | Animation in overlay templates |
| [Whisper](https://github.com/ggerganov/whisper.cpp) | MIT | Audio transcription |

## License

MIT — see [LICENSE](LICENSE).
