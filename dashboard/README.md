# Ops Dashboard

A zero-dependency, **localhost-only** console for the team to run the content engine
without the terminal. It reads local files and never publishes on its own.

```bash
node dashboard/server.mjs           # → http://localhost:4477
node dashboard/server.mjs --port 8080
```

No `npm install` — it uses only Node's built-in modules (Node 18+ for `fetch`).

## What it shows

- **Review queue** — every batch in `projects/`, with client, start date, formats,
  hours saved, and a status badge (Ready / unchecked count / draft) parsed from
  each `review.md`. Click a batch to see rendered thumbnails, the per-channel
  captions, the proposed schedule, and any change notes.
- **Clients** — each pack in `brand/clients/`, with readiness dots: GHL location
  set, publish token present in `.env`, and `brand.md` present. Green = ready.
- **Performance** — the latest `output/perf-<client>-*` report (top format /
  pillar / platform and topic leaders). **Refresh from GHL** re-runs
  `tools/perf-report.mjs` (a read-only list call).

## What it will and won't do

- **Reads** local files; serves batch thumbnails (image files only, sandboxed to
  the repo — `.env` and paths outside the repo are refused).
- **Runs on request, safely:** a performance refresh (read-only) and a publish
  **dry-run** (previews the schedule, posts nothing).
- **Never auto-publishes.** The real push is handed back as a copy-to-run command
  (`ghl-publish-batch.sh … --status in_review`), preserving the human approval
  gate. Secrets in `.env` are used only to spawn the engine's own scripts and are
  never exposed by any endpoint.

Binds to `127.0.0.1` only. Intended for the operator's own machine, next to the
engine and its `.env` — not for public hosting.
