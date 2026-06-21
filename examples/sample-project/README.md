# Sample Project

This directory shows what a completed video project looks like after running `/edit-video` or `/content-machine`.

## Structure

```
sample-project/
  brief.md              # Completed production brief
  clips/                 # Raw AI video clips or source footage
  images/                # Generated keyframe images
  overlays/              # Rendered transparent overlay videos (.mov)
  audio/                 # Voiceover audio + word-level transcript
  output/                # Final assembled videos
    final-reels.mp4      # 9:16 for Instagram Reels, YouTube Shorts, TikTok
    final-linkedin.mp4   # 16:9 for LinkedIn
  captions/              # Platform-specific caption files
    instagram.md
    youtube.md
    linkedin.md
```

## The Brief

See `brief.md` for a completed example brief using the Acme Video Co brand. This demonstrates:
- Hook/Setup/Payoff/CTA script structure
- Timed shot list with B-roll insertion points
- On-screen text cues with timing
- Higgsfield prompt selections from the prompt library
- Music direction
- Brand compliance checklist

## Try It Yourself

1. Read the brief to understand the production plan
2. Run `/video-brief "your topic here"` to generate your own brief
3. Run `/edit-video /path/to/your/video.mp4` to produce a full edit
