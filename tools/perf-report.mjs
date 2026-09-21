#!/usr/bin/env node
// Feedback loop — join what we published (batch manifests) with how it performed
// (GHL engagement), so the engine learns which pillars, formats and topics win.
//
//   node tools/perf-report.mjs <client> [--days N] [--out <dir>]
//
// Reads every projects/*/batch.manifest.json for the client, keys each post by
// its exact scheduleUTC (unique per post — platforms are staggered), pulls the
// matching GHL published record's insights, and aggregates by format, pillar,
// platform and topic. Writes perf.json + perf-report.md.
//
// Env: the client's GHL token/location (resolved from the client pack + .env,
// like ghl-publish-batch.sh). Caller does `set -a && source .env && set +a`.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const client = args[0];
if (!client || client.startsWith('--')) { console.error('usage: perf-report.mjs <client> [--days N] [--out <dir>]'); process.exit(1); }
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i+1] ? args[i+1] : d; };
const DAYS = parseInt(opt('days', '90'), 10);

// --- resolve client GHL creds ------------------------------------------------
const cfgPath = join(REPO, 'brand/clients', client, 'client.json');
if (!existsSync(cfgPath)) { console.error(`client not found: ${cfgPath}`); process.exit(1); }
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
const LOC = (cfg.ghl && cfg.ghl.locationId) || process.env.GHL_LOCATION_ID;
const TOKEN = (cfg.ghl && cfg.ghl.tokenEnv && process.env[cfg.ghl.tokenEnv]) || process.env.GHL_API_KEY;
if (!LOC || !TOKEN) { console.error(`Missing GHL creds for ${client} (location or token). Set ${cfg.ghl?.tokenEnv||'GHL_API_KEY'} in .env.`); process.exit(1); }

const H = { 'Authorization': `Bearer ${TOKEN}`, 'Version': '2021-07-28', 'Content-Type': 'application/json', 'Accept': 'application/json' };
const BASE = `https://services.leadconnectorhq.com/social-media-posting/${LOC}/posts`;

// --- 1. published insights, keyed by scheduleDate ----------------------------
async function fetchPublished() {
  const byDate = {};
  for (let skip = 0; skip < 1000; skip += 100) {
    const r = await fetch(`${BASE}/list`, { method: 'POST', headers: H, body: JSON.stringify({ limit: '100', skip: String(skip), type: 'published' }) });
    if (!r.ok) break;
    const d = await r.json();
    const posts = (d.results && d.results.posts) || [];
    for (const p of posts) {
      const sd = p.scheduleDate || p.publishedAt;
      if (!sd) continue;
      const ins = p.insights || {};
      const rec = { like: ins.like||0, share: ins.share||0, comment: ins.comment||0, link: p.previewLink||'', id: p._id };
      const tot = rec.like + rec.share + rec.comment;
      const prev = byDate[sd];
      // Engine batches stagger per-platform times, so scheduleDate is unique per
      // post. If a legacy batch reused one timestamp, keep the record with the
      // most engagement rather than letting last-write win.
      if (!prev || tot > (prev.like + prev.share + prev.comment)) byDate[sd] = rec;
    }
    if (posts.length < 100) break;
  }
  return byDate;
}

// --- 2. our published items, from batch manifests ----------------------------
function manifests() {
  const dir = opt('projects', join(REPO, 'projects'));
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const mp = join(dir, name, 'batch.manifest.json');
    if (!existsSync(mp)) continue;
    let m; try { m = JSON.parse(readFileSync(mp, 'utf8')); } catch { continue; }
    const slug = m.client && (m.client.slug || m.client.name);
    // Match this client (manifests with no client block are treated as the built-in/ctm).
    if (m.client) { if (String(slug).toLowerCase() !== client.toLowerCase() && slug !== cfg.name) continue; }
    else if (client !== 'ctm') continue;
    out.push(m);
  }
  return out;
}

const cutoff = Date.now() - DAYS*24*3600*1000;

const published = await fetchPublished();
const records = [];   // one per matched post
for (const m of manifests()) {
  for (const it of (m.items || [])) {
    for (const post of (it.posts || [])) {
      const sd = post.scheduleUTC;
      if (!sd || new Date(sd).getTime() < cutoff) continue;
      const ins = published[sd];
      if (!ins) continue;   // not published yet (still in_review / future) — skip
      records.push({
        topic: it.id, title: it.title, format: it.kind, pillar: it.pillar || '(none)',
        platform: post.platform, date: sd.slice(0,10),
        eng: (ins.like||0) + (ins.share||0) + (ins.comment||0),
        like: ins.like, share: ins.share, comment: ins.comment, link: ins.link,
      });
    }
  }
}

// --- 3. aggregate ------------------------------------------------------------
function agg(key) {
  const g = {};
  for (const r of records) {
    const k = r[key] || '(none)';
    (g[k] = g[k] || { n: 0, eng: 0 });
    g[k].n++; g[k].eng += r.eng;
  }
  return Object.entries(g).map(([k,v]) => ({ key: k, posts: v.n, totalEng: v.eng, avgEng: +(v.eng/v.n).toFixed(1) }))
    .sort((a,b) => b.avgEng - a.avgEng);
}
const byFormat = agg('format'), byPillar = agg('pillar'), byPlatform = agg('platform');
const byTopic = Object.values(records.reduce((a,r) => { (a[r.topic]=a[r.topic]||{topic:r.topic,title:r.title,format:r.format,pillar:r.pillar,eng:0,posts:0}); a[r.topic].eng+=r.eng; a[r.topic].posts++; return a; }, {}))
  .sort((a,b)=>b.eng-a.eng);

const perf = {
  client, generatedAt: new Date().toISOString(), windowDays: DAYS,
  postsMatched: records.length,
  leaders: {
    format: byFormat[0]?.key || null,
    pillar: byPillar[0]?.key || null,
    platform: byPlatform[0]?.key || null,
  },
  byFormat, byPillar, byPlatform,
  topTopics: byTopic.slice(0, 10),
};

const today = new Date().toISOString().slice(0,10);
const outDir = opt('out', join(REPO, 'output', `perf-${client}-${today}`));
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'perf.json'), JSON.stringify(perf, null, 2));

// --- 4. human digest ---------------------------------------------------------
const tbl = (rows, label) => rows.length
  ? `| ${label} | Posts | Avg engagement | Total |\n|---|--:|--:|--:|\n` + rows.map(r=>`| ${r.key} | ${r.posts} | ${r.avgEng} | ${r.totalEng} |`).join('\n')
  : `_(no data)_`;
const md = `# Performance — ${cfg.name || client}  ·  last ${DAYS} days

Matched **${records.length}** published post(s) to our batches (engagement = likes + shares + comments; GHL only tracks those, and numbers lag for a few days).

${records.length === 0 ? `> No published posts matched yet — either nothing has fired, or engagement hasn't synced. Re-run after posts go live.\n` : ''}
## Winners
- **Best format:** ${perf.leaders.format || '—'}
- **Best pillar:** ${perf.leaders.pillar || '—'}
- **Best platform:** ${perf.leaders.platform || '—'}

## By format
${tbl(byFormat,'Format')}

## By pillar
${tbl(byPillar,'Pillar')}

## By platform
${tbl(byPlatform,'Platform')}

## Top topics
${byTopic.length ? byTopic.slice(0,10).map((t,i)=>`${i+1}. **${t.title}** — ${t.eng} eng · ${t.format} · ${t.pillar}`).join('\n') : '_(no data)_'}

---
_Feed this back with \`/topic-queue --client ${client}\` — it reads perf.json and weights priority toward the winning pillars and formats._
`;
writeFileSync(join(outDir, 'perf-report.md'), md);

console.log(JSON.stringify({ client, postsMatched: records.length, leaders: perf.leaders, report: join(outDir,'perf-report.md') }, null, 2));
