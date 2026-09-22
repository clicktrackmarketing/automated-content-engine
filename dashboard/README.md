# Ops Dashboard

A zero-dependency, **localhost-only** console for the team to run the content engine
without the terminal. It reads local files, and publishes only on an explicit,
confirmed click — always as in-review drafts, never straight to live.

```bash
node dashboard/server.mjs           # → http://localhost:4477
node dashboard/server.mjs --port 8080
```

No `npm install` — it uses only Node's built-in modules (Node 18+ for `fetch`).

## What it shows

- **Review queue** — every batch in `projects/`, with client, start date, formats,
  hours saved, and a status badge (Ready / unchecked count / draft / **Published**)
  parsed from each `review.md` and `publish-log.md`. Click a batch to see rendered
  thumbnails, the per-channel captions, the proposed schedule, and any change notes,
  then **Approve**, **Dry-run**, or **Publish**.
- **Clients** — each pack in `brand/clients/`, with readiness dots: GHL location
  set, publish token present in `.env`, and `brand.md` present. Green = ready.
- **Performance** — the latest `output/perf-<client>-*` report (top format /
  pillar / platform and topic leaders). **Refresh from GHL** re-runs
  `tools/perf-report.mjs` (a read-only list call).

## Actions & safety

- **Approve / Unapprove** — flips the checkboxes in the batch's `review.md`
  (a local, reversible file write). This is the gate `ghl-publish-batch.sh`
  enforces; a batch can't be published while any box is unchecked.
- **Dry-run** — previews the full schedule and posts **nothing**.
- **Publish to GHL (in-review)** — runs `ghl-publish-batch.sh … --status in_review`
  for real, creating the posts as **in-review drafts**. Nothing goes live until a
  human approves them in GHL's Social Planner. Every publish requires an explicit
  confirmation that names the client and item count, and the button is disabled
  unless the batch is approved and the client's GHL location + token are present.
  The dashboard never uses `--force` or `--status scheduled`, so the approval gate
  and in-review posture always hold. Already-published batches are flagged and
  their button disabled to avoid duplicates.

Everything else is **read-only**: it serves batch thumbnails (image files only,
sandboxed to the repo — `.env` and paths outside the repo are refused) and a
performance refresh (a read-only GHL list call). Secrets in `.env` are used only
to spawn the engine's own scripts and are never exposed by any endpoint. Prefer
the copy-to-run command (under "Or run it yourself") when you want the terminal.

Binds to `127.0.0.1` only. Intended for the operator's own machine, next to the
engine and its `.env` — not for public hosting.
