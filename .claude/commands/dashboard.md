---
description: Launch the internal ops dashboard (review queue, clients, performance) in the browser
---

Start the localhost ops console so the team can review batches, check client
readiness, and see performance without the terminal.

1. Start the server in the background from the repo root:
   `node dashboard/server.mjs` (default port 4477; pass `--port <n>` to change).
   It's zero-dependency (Node built-ins only) and binds to `127.0.0.1` only.
2. Open `http://localhost:4477/` in the browser pane so the user can see it.
3. Tell the user it's live and summarize the three tabs: **Review queue**
   (batches from `projects/` with approval status + thumbnails + per-channel
   captions), **Clients** (packs in `brand/clients/` with GHL/token/brand.md
   readiness dots), and **Performance** (latest `output/perf-<client>-*` report,
   with a read-only "Refresh from GHL" button).

Safety: the dashboard reads local files and can run a performance refresh
(read-only) and a publish **dry-run** on request. It never auto-publishes — the
real push is shown as a copy-to-run `ghl-publish-batch.sh … --status in_review`
command so the human approval gate stays intact. See `dashboard/README.md`.
