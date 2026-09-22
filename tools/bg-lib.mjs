#!/usr/bin/env node
// bg-lib.mjs — the curated background library + selector for the content engine.
//
// A background library is a `backgrounds.json` manifest that describes vetted,
// LICENSED images the graphics can sit on. It is deliberately NOT a dumping
// folder: every entry must carry a license + source, and validate() refuses
// entries that don't. The selector mixes and matches by pillar / mood /
// orientation so a batch varies instead of reusing one image.
//
// Two manifests are merged (both optional):
//   brand/backgrounds/backgrounds.json          shared, brand-neutral set
//   brand/clients/<slug>/media/backgrounds/backgrounds.json   this client's set
//
// Entry shape (file path is relative to that manifest's own base):
//   {
//     "file": "media/backgrounds/san-diego-dusk.jpg",
//     "mood": "local",            // tech | local | abstract | human | texture
//     "pillars": ["SEO (technical & local)"],  // [] or omitted = fits any pillar
//     "orientation": "portrait",  // portrait | square | any (default any)
//     "scrim": "strong",          // light | medium | strong  (text legibility)
//     "focus": "50% 40%",         // optional bgFocus (object-position)
//     "license": "Unsplash License",   // REQUIRED
//     "source": "https://unsplash.com/photos/…",  // REQUIRED
//     "credit": "Jane Doe"        // optional
//   }
//
// CLI:
//   node tools/bg-lib.mjs --client ctm --list
//   node tools/bg-lib.mjs --client ctm --validate
//   node tools/bg-lib.mjs --client ctm --pick --pillar "AEO / AI search" \
//        --orientation portrait [--mood tech] [--exclude a.jpg,b.jpg]
//
// pick() returns an ABSOLUTE bg path (+ scrim/focus) so callers can drop it
// straight into a generator spec; graphic-batch passes absolute paths through
// untouched. Returns null when the library is empty or nothing matches — the
// caller then simply renders text-only.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';

export const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..');
const MOODS = ['tech', 'local', 'abstract', 'human', 'texture'];
const SCRIMS = ['light', 'medium', 'strong'];

function readManifest(manifestPath, base) {
  if (!existsSync(manifestPath)) return [];
  let doc;
  try { doc = JSON.parse(readFileSync(manifestPath, 'utf8')); }
  catch (e) { throw new Error(`invalid JSON in ${manifestPath}: ${e.message}`); }
  const list = Array.isArray(doc) ? doc : (doc.backgrounds || []);
  return list.map(e => ({ ...e, _base: base, _abs: e.file ? resolve(base, e.file) : null, _manifest: manifestPath }));
}

// Merge shared + client libraries. clientSlug optional.
export function loadLibrary(clientSlug) {
  const out = [];
  out.push(...readManifest(join(REPO, 'brand/backgrounds/backgrounds.json'), REPO));
  if (clientSlug) {
    const dir = join(REPO, 'brand/clients', clientSlug);
    out.push(...readManifest(join(dir, 'media/backgrounds/backgrounds.json'), dir));
  }
  return out;
}

// Enforce the "licensed, not a dumping folder" rule. Returns {ok, errors, warnings}.
export function validate(entries) {
  const errors = [], warnings = [];
  entries.forEach((e, i) => {
    const where = `${e._manifest || 'entry'}[${i}]${e.file ? ` (${e.file})` : ''}`;
    if (!e.file) errors.push(`${where}: missing "file"`);
    else if (!existsSync(e._abs)) warnings.push(`${where}: file not found on disk yet`);
    if (!e.license) errors.push(`${where}: missing "license" — every background must be licensed`);
    if (!e.source) errors.push(`${where}: missing "source" (URL or where it came from)`);
    if (e.mood && !MOODS.includes(e.mood)) warnings.push(`${where}: mood "${e.mood}" not in ${MOODS.join('/')}`);
    if (e.scrim && !SCRIMS.includes(e.scrim)) warnings.push(`${where}: scrim "${e.scrim}" not in ${SCRIMS.join('/')}`);
  });
  return { ok: errors.length === 0, errors, warnings };
}

function shuffle(a, seed = Date.now()) {
  // Small deterministic-ish shuffle so repeated runs vary but a --seed is stable.
  let s = seed >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

// Pick a background. Scores pillar and mood fit; honors orientation; avoids
// anything in `exclude` (by file or abs path) so a batch varies. Returns
// { bg, bgScrim, bgFocus, file, id } or null.
export function pick({ clientSlug, pillar, mood, orientation, exclude = [], seed } = {}) {
  let lib = loadLibrary(clientSlug).filter(e => e.file && existsSync(e._abs));
  if (!lib.length) return null;
  const ex = new Set(exclude);
  const orient = orientation || 'any';
  const fits = lib.filter(e => {
    const o = e.orientation || 'any';
    return o === 'any' || orient === 'any' || o === orient;
  });
  let pool = fits.filter(e => !ex.has(e.file) && !ex.has(e._abs));
  if (!pool.length) pool = fits;              // everything used — allow reuse
  if (!pool.length) return null;
  const score = e => (pillar && Array.isArray(e.pillars) && e.pillars.includes(pillar) ? 2 : 0)
    + (mood && e.mood === mood ? 1 : 0)
    + ((!e.pillars || e.pillars.length === 0) ? 0.1 : 0);   // generic fits anything, slight base
  const best = shuffle(pool, seed).sort((a, b) => score(b) - score(a))[0];
  return { bg: best._abs, bgScrim: best.scrim || 'medium', bgFocus: best.focus || null, file: best.file, id: best.file };
}

// ---- CLI --------------------------------------------------------------------
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const a = process.argv.slice(2);
  const opt = (n, d) => { const i = a.indexOf(`--${n}`); return i >= 0 && a[i + 1] && !a[i + 1].startsWith('--') ? a[i + 1] : d; };
  const has = n => a.includes(`--${n}`);
  const clientSlug = opt('client', null);
  const entries = loadLibrary(clientSlug);

  if (has('validate')) {
    const v = validate(entries);
    console.log(`Library: ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}${clientSlug ? ` (shared + ${clientSlug})` : ' (shared only)'}`);
    v.warnings.forEach(w => console.log('  ⚠ ' + w));
    v.errors.forEach(e => console.log('  ✗ ' + e));
    console.log(v.ok ? '✓ valid — every background is licensed.' : `✗ ${v.errors.length} error(s) — fix before use.`);
    process.exit(v.ok ? 0 : 1);
  }
  if (has('pick')) {
    const p = pick({ clientSlug, pillar: opt('pillar'), mood: opt('mood'), orientation: opt('orientation', 'any'),
      exclude: (opt('exclude', '') || '').split(',').filter(Boolean), seed: opt('seed') ? +opt('seed') : undefined });
    if (!p) { console.error('no matching background (library empty or nothing fits) — render text-only.'); process.exit(2); }
    console.log(JSON.stringify(p, null, 2));
    process.exit(0);
  }
  // default: list
  if (!entries.length) { console.log('Library is empty. Add licensed images with tools/bg-add.mjs, then re-run.'); process.exit(0); }
  console.log(`${entries.length} background(s)${clientSlug ? ` for ${clientSlug} (shared + client)` : ''}:\n`);
  entries.forEach(e => console.log(`  • ${e.file}  [${e.orientation || 'any'} · ${e.mood || 'untagged'} · scrim ${e.scrim || 'medium'}]  ${e.license ? '✓ ' + e.license : '✗ NO LICENSE'}${(e.pillars && e.pillars.length) ? '  pillars: ' + e.pillars.join(', ') : ''}`));
}
