# Background library

Curated, **licensed** background images the graphics can sit on — mixed and
matched behind the branded typography. This is a *library*, not a dumping
folder: every entry carries a license and a source, and the tooling refuses
entries that don't.

Two manifests are merged (client wins ties):

- `brand/backgrounds/backgrounds.json` — **shared**, brand-neutral set (this folder)
- `brand/clients/<slug>/media/backgrounds/backgrounds.json` — that client's own set

Image files (`*.png/*.jpg/…`) are gitignored and stay local; the JSON manifests
are tracked so the catalog is versioned.

## Add a background (enforces license + source)

```bash
# 1. Put the licensed image in the folder (client or shared)
#    e.g. brand/clients/ctm/media/backgrounds/san-diego-dusk.jpg
# 2. Register it with its tags + license
node tools/bg-add.mjs --client ctm \
  --file media/backgrounds/san-diego-dusk.jpg \
  --license "Unsplash License" --source https://unsplash.com/photos/xyz \
  --mood local --pillars "SEO (technical & local)" \
  --orientation portrait --scrim strong --focus "50% 40%" --credit "Jane Doe"
```

## Inspect / validate

```bash
node tools/bg-lib.mjs --client ctm --list       # what's in the library
node tools/bg-lib.mjs --client ctm --validate   # every entry licensed?
```

## Use in a batch

In a `/graphic-machine` batch item, set `"background": "auto"` (or
`{ "pillar": "...", "mood": "tech", "orientation": "portrait" }`). The selector
(`tools/bg-lib.mjs`) picks a fitting background, applies the recommended scrim
for legibility, and varies picks across the batch. It's skipped silently when
nothing fits (text-only), and an explicit `bg` in the spec always wins.

## What makes a good background

- **Licensed or owned** — these post publicly on client accounts.
- **Legible** — darker / calmer images that text survives on; set the right `scrim`.
- **On-brand** — navy/tech, local (e.g. San Diego), abstract, or texture; avoid generic stock.
- **Deliberate** — covers, statements, and case studies; not every checklist slide.
