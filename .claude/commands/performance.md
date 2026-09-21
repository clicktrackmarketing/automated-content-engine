# Performance — what's working, and feed it back

Pull engagement for a client, see which formats / pillars / topics win, and feed that back
into the topic queue so the engine makes more of what works. Request: $ARGUMENTS

Usage: `/performance --client <slug> [--days N]` (default 90 days)

## Run it
```bash
set -a && source .env && set +a
node tools/perf-report.mjs <slug> --days <N>
```
This joins our batch manifests (topic, format, pillar, schedule time) to the matching GHL
published records' engagement, and writes `output/perf-<slug>-<date>/perf.json` + `perf-report.md`.

## Present
Show the user the digest: **best format**, **best pillar**, **best platform**, the by-format /
by-pillar / by-platform tables, and the **top topics**. Be honest about the caveats the report
states — GHL only tracks likes/shares/comments, numbers lag a few days, and only posts published
from a batch manifest are matched (older ad-hoc posts aren't).

## Feed it back (close the loop)
Offer to refresh the backlog weighted by what's working:
```
/topic-queue --client <slug>
```
`/topic-queue` reads the latest `perf.json` and lifts the priority of topics in the winning
pillars/formats (and generates more of them), so the next `--from-queue` batch leans into proven
material. Nothing publishes here — this is measurement + prioritization only.

## Cadence
Good weekly, per client. Later this can run as a scheduled routine that emails the digest.
