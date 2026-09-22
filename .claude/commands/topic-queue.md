# Topic Queue — generate a ranked content backlog for a client

Turn a client's pillars into a ranked queue of concrete, on-brand content topics — so
`/graphic-machine` never waits on "what should we post?". Request: $ARGUMENTS

Usage: `/topic-queue --client <slug> [extra themes or focus for this refresh]`

## Read first
- `brand/clients/<slug>/topics.seed.json` — the client's pillars, audience, keywords, tone, link.
- `brand/clients/<slug>/brand.md` — voice / caption notes.
- `tools/topic-angles.json` — the reusable angle library (myth, mistake-list, how-to, checklist, stat, question, comparison, case, warning, trend, explainer, quick-win) with each angle's default format.
- `brand/clients/<slug>/topics.queue.json` and `topics.used.json` (if they exist) — so you do **not** repeat topics already queued or used.

## Gather grounding (four sources, blend them)
Pull from every source available, then synthesize — don't rely on one:

1. **Past winners** — the latest `output/perf-<slug>-*/perf.json` (feedback loop). If present, **weight toward what's working**: lift priority for the winning pillars/formats (`leaders.pillar`, `leaders.format`, and the `byPillar`/`byFormat` tables), generate more in those pillars, lean toward the winning format. Say in your summary that the queue was performance-weighted.
2. **Client research docs (NotebookLM)** — if `client.json` has a `notebookLM` id, run `node tools/notebook-topics.mjs --client <slug> --json` to pull source-grounded topic candidates (each with title/angle/pillar/support) from the client's Gemini Notebook. This is an **optional feed**: it exits code 2 with a notice if auth is expired (`nlm login`) or the tool is down — if so, note it and continue with the other three sources. Prefer these candidates for their `support` (real, cited source detail); fold them into the queue rather than pasting verbatim.
3. **Brand + offers** — `brand.md` and `topics.seed.json`: keep every topic on-voice and tied to what the client actually sells.
4. **Live search/SEO** — when the Semrush or Firecrawl MCP tools are connected, pull current keyword/search-demand angles for the client's pillars and let real demand raise `priority`. Skip quietly if unavailable.

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
