# Topic Queue — generate a ranked content backlog for a client

Turn a client's pillars into a ranked queue of concrete, on-brand content topics — so
`/graphic-machine` never waits on "what should we post?". Request: $ARGUMENTS

Usage: `/topic-queue --client <slug> [extra themes or focus for this refresh]`

## Read first
- `brand/clients/<slug>/topics.seed.json` — the client's pillars, audience, keywords, tone, link.
- `brand/clients/<slug>/brand.md` — voice / caption notes.
- `tools/topic-angles.json` — the reusable angle library (myth, mistake-list, how-to, checklist, stat, question, comparison, case, warning, trend, explainer, quick-win) with each angle's default format.
- `brand/clients/<slug>/topics.queue.json` and `topics.used.json` (if they exist) — so you do **not** repeat topics already queued or used.
- The latest `output/perf-<slug>-*/perf.json` (if any) — the feedback loop. If present, **weight toward what's working**: lift the priority of topics in the winning pillars and formats (`leaders.pillar`, `leaders.format`, and the `byPillar`/`byFormat` tables), generate more topics in those pillars, and lean toward the winning format. Note in your summary that the queue was weighted by performance.

## Produce
Generate **15–30 topics** by combining the client's pillars with the angle library — but write each as a **specific, concrete title**, not a filled-in template. Good: "Cloudflare's Bot Fight Mode can silently block your Google Ads". Weak: "A warning about Google Ads". Rules:
- Spread across all pillars and several angles; avoid near-duplicates of each other or of anything in `topics.queue.json` / `topics.used.json`.
- Pick a `format` per topic: `carousel` for steps / lists / comparisons / walkthroughs; `graphic` for a single hook, stat, myth, or question.
- Write a one-line `hook` (the scroll-stopper) for each.
- Set `priority` 1–5 (5 = most timely / highest impact — news-pegged or high-demand topics rank higher).
- `link`: the client's `defaultLink`, unless a specific blog URL fits better.
- Never invent statistics or client results; if a topic needs a figure, note it with `[__]` in the hook so it's filled at build time.
- `status`: `"queued"`. `id`: a unique kebab-case slug.

Merge with any existing queue: keep unused topics, append the new ones, don't duplicate. Write the file:

```
brand/clients/<slug>/topics.queue.json
{
  "client": "<slug>",
  "generatedAt": "<now ISO>",
  "topics": [
    { "id": "cloudflare-blocks-ads", "title": "…", "angle": "warning", "format": "carousel",
      "pillar": "Google Ads", "hook": "…", "link": "…", "priority": 5, "status": "queued" }
  ]
}
```

Then summarize: how many topics, the spread by pillar, and the top few. Tell the user they can run `/graphic-machine --client <slug> --from-queue [N]` to produce the next batch from the top of the queue.

## Notes
- This only writes the backlog — it renders and schedules nothing.
- Refresh anytime; used topics are tracked in `topics.used.json` and never resurface.
- Later, performance data can weight `priority` toward what's working (feedback loop).
