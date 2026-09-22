#!/usr/bin/env node
// Automated Content Engine — internal ops dashboard.
//
// A zero-dependency, localhost-only console for the team: browse client packs,
// review the batch queue with thumbnails + per-channel captions, see the
// performance report, and get the exact publish command. It READS local files
// and can run two safe things on request — a performance refresh (read-only
// GHL list call) and a publish DRY-RUN. It NEVER publishes on its own; the real
// push is handed back as a copy-to-run command, keeping the human approval gate.
//
//   node dashboard/server.mjs [--port 4477]
//
// Binds to 127.0.0.1 only. Secrets from .env are loaded solely to spawn the
// engine's own scripts; no endpoint ever echoes environment values.

import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { resolve, dirname, join, extname, relative, sep } from 'node:path';
import { spawn } from 'node:child_process';

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..');
const DASH = join(REPO, 'dashboard');
const argv = process.argv.slice(2);
const PORT = parseInt((argv.indexOf('--port') >= 0 && argv[argv.indexOf('--port') + 1]) || process.env.PORT || '4477', 10);

// ---- load .env into process.env (for spawned engine scripts only) -----------
(function loadEnv() {
  const p = join(REPO, '.env');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
})();

const IMG = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));
const safe = (p) => { const r = resolve(REPO, p); return (r === REPO || r.startsWith(REPO + sep)) ? r : null; };

// ---- clients ----------------------------------------------------------------
function clients() {
  const dir = join(REPO, 'brand/clients');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(d => {
    const s = join(dir, d);
    return d !== 'README.md' && existsSync(join(s, 'client.json'));
  }).map(slug => {
    const c = readJSON(join(dir, slug, 'client.json'));
    const tokenEnv = c.ghl?.tokenEnv || 'GHL_API_KEY';
    return {
      slug,
      name: c.name || slug,
      platforms: c.platforms || [],
      timezone: c.timezone || '',
      defaultLink: c.defaultLink || '',
      ghlLocationSet: !!(c.ghl && c.ghl.locationId),
      tokenEnv,
      tokenSet: !!process.env[tokenEnv],   // boolean only — never the value
      hasBrandMd: existsSync(join(dir, slug, 'brand.md')),
    };
  });
}

// ---- batches ----------------------------------------------------------------
function reviewState(dir) {
  const p = join(dir, 'review.md');
  if (!existsSync(p)) return { hasReview: false, approved: 0, unchecked: 0, ready: false, notes: [] };
  const md = readFileSync(p, 'utf8');
  const approved = (md.match(/- \[x\]/gi) || []).length;
  const unchecked = (md.match(/- \[ \]/g) || []).length;
  const notes = [];
  const re = /\*\*Change notes:\*\*\s*\n([\s\S]*?)(?:\n- \[|$)/g;
  let m; while ((m = re.exec(md))) {
    const t = m[1].replace(/<!--[\s\S]*?-->/g, '').trim();
    if (t) notes.push(t);
  }
  return { hasReview: true, approved, unchecked, ready: unchecked === 0 && approved > 0, notes };
}

function batchSummary(id) {
  const dir = join(REPO, 'projects', id);
  const mp = join(dir, 'batch.manifest.json');
  if (!existsSync(mp)) return null;
  const m = readJSON(mp);
  const formats = {};
  for (const it of m.items || []) formats[it.kind] = (formats[it.kind] || 0) + 1;
  return {
    id,
    client: m.client?.slug || null,
    clientName: m.client?.name || null,
    startDate: m.startDate || null,
    timezone: m.timezone || null,
    items: (m.items || []).length,
    formats,
    hoursSaved: m.timeSaved?.hours ?? null,
    review: reviewState(dir),
    mtime: statSync(mp).mtimeMs,
  };
}

function batches() {
  const dir = join(REPO, 'projects');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map(batchSummary).filter(Boolean)
    .sort((a, b) => b.mtime - a.mtime);
}

function batchDetail(id) {
  const dir = join(REPO, 'projects', id);
  const mp = join(dir, 'batch.manifest.json');
  if (!existsSync(mp)) return null;
  const m = readJSON(mp);
  const items = (m.items || []).map(it => ({
    id: it.id, kind: it.kind, title: it.title, link: it.link || '',
    captions: it.captions || {},
    media: (it.media || []).map(abs => {
      const rel = relative(REPO, abs);
      return { rel, url: '/media?path=' + encodeURIComponent(rel) };
    }),
    posts: (it.posts || []).map(p => ({ platform: p.platform, target: p.target, kind: p.kind, schedule: p.schedulePT || p.scheduleUTC })),
  }));
  return {
    ...batchSummary(id),
    brand: m.brand ? relative(REPO, m.brand) : null,
    items,
    publishCommand: `set -a; source .env; set +a\nbash tools/publishers/ghl/ghl-publish-batch.sh projects/${id} --status in_review`,
  };
}

// ---- performance ------------------------------------------------------------
function perfFor(client) {
  const out = join(REPO, 'output');
  if (!existsSync(out)) return null;
  const dirs = readdirSync(out).filter(d => d.startsWith(`perf-${client}-`)).sort();
  if (!dirs.length) return null;
  const latest = dirs[dirs.length - 1];
  const base = join(out, latest);
  const perf = existsSync(join(base, 'perf.json')) ? readJSON(join(base, 'perf.json')) : null;
  const md = existsSync(join(base, 'perf-report.md')) ? readFileSync(join(base, 'perf-report.md'), 'utf8') : null;
  return { dir: latest, generated: statSync(base).mtimeMs, perf, md };
}

// ---- child-process runner (perf refresh / dry-run) --------------------------
function run(cmd, args, res) {
  const child = spawn(cmd, args, { cwd: REPO, env: process.env });
  let out = '', err = '';
  child.stdout.on('data', d => out += d);
  child.stderr.on('data', d => err += d);
  child.on('close', code => json(res, 200, { code, stdout: out.slice(-20000), stderr: err.slice(-8000) }));
  child.on('error', e => json(res, 500, { code: -1, stdout: '', stderr: String(e) }));
}

// ---- server -----------------------------------------------------------------
const server = createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const path = u.pathname;
  try {
    if (path === '/' || path === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(readFileSync(join(DASH, 'index.html')));
    }
    if (path === '/api/clients') return json(res, 200, { clients: clients() });
    if (path === '/api/batches') return json(res, 200, { batches: batches() });
    if (path.startsWith('/api/batches/')) {
      const d = batchDetail(decodeURIComponent(path.slice('/api/batches/'.length)));
      return d ? json(res, 200, d) : json(res, 404, { error: 'not found' });
    }
    if (path === '/api/performance') {
      const c = u.searchParams.get('client');
      if (!c) return json(res, 400, { error: 'client required' });
      return json(res, 200, perfFor(c) || { empty: true });
    }
    if (path === '/media') {
      const rel = u.searchParams.get('path') || '';
      const abs = safe(rel);
      if (!abs || !existsSync(abs) || !IMG.has(extname(abs).toLowerCase())) return json(res, 404, { error: 'not found' });
      const type = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }[extname(abs).toLowerCase()];
      res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' });
      return createReadStream(abs).pipe(res);
    }
    // POST actions
    if (req.method === 'POST' && path === '/api/performance/refresh') {
      const c = u.searchParams.get('client');
      if (!c) return json(res, 400, { error: 'client required' });
      return run('node', ['tools/perf-report.mjs', c], res);
    }
    if (req.method === 'POST' && path.startsWith('/api/dry-run/')) {
      const id = decodeURIComponent(path.slice('/api/dry-run/'.length));
      if (!existsSync(join(REPO, 'projects', id, 'batch.manifest.json'))) return json(res, 404, { error: 'not found' });
      return run('bash', ['tools/publishers/ghl/ghl-publish-batch.sh', `projects/${id}`, '--status', 'in_review', '--dry-run'], res);
    }
    json(res, 404, { error: 'not found' });
  } catch (e) {
    json(res, 500, { error: String(e && e.message || e) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Automated Content Engine — Ops Dashboard`);
  console.log(`  → http://localhost:${PORT}\n  (localhost only · reads local files · never auto-publishes)\n`);
});
