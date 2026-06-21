# Brand System

This directory contains three working files that define your brand's visual identity, production workflow, and generative prompt library. Every agent in the automated-content-engine reads from these files.

## Working Files

| File | Purpose | When to read |
|------|---------|-------------|
| `style_guide.md` | Master visual and brand standards | Read first, always. Every production decision references this file. |
| `video_brief_template.md` | Per-video production brief | Duplicate once per video. Fill in before handing to agents. |
| `prompts_library.md` | Reusable generative video prompt library | Select prompts during brief creation. Copy into your brief. |

## Supporting Directories

| Directory | Purpose |
|-----------|---------|
| `reference-edits/` | Reference editing analysis and frame screenshots |
| `logos/` | Brand logo files (excluded from git) |

## Example Brand

This ships with **Acme Video Co** as an example brand. All colors, catchphrases, voice guidelines, and prompts are functional examples you can use immediately, then replace with your own brand standards.

See `docs/customization-guide.md` for step-by-step instructions on replacing the example brand with yours.

## Workflow

1. **Write your script** or supply raw footage
2. **Duplicate** `video_brief_template.md` for your video
3. **Fill in the brief** referencing `style_guide.md` for visual standards
4. **Select prompts** from `prompts_library.md` and paste into the brief
5. **Hand to Claude Code** — run `/edit-video` or `/content-machine`
