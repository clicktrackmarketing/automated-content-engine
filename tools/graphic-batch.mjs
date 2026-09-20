#!/usr/bin/env node
// Graphic Machine batch engine — render a whole batch of graphics/carousels,
// compute a spaced weekly schedule, and emit ONE review file + a manifest.
//
//   node tools/graphic-batch.mjs <batch.json>
//
// It shells out to the tested generators (make-graphic.mjs / make-carousel.mjs)
// and render-graphic.sh, so output matches /graphic-post and /carousel-post
// exactly. Captions are authored upstream (by the operator/Claude, grounded in
// brand voice) and passed through in the batch spec.
//
// batch.json shape:
// {
//   "batch":    "graphics-batch-2026-09-19",     // optional; default from date
//   "brand":    "../../brand/ctm.local/graphic.brand.json",  // rel to batch.json
//   "startDate":"2026-09-22",                      // optional; default = tomorrow
//   "timezone": "America/Los_Angeles",             // optional
//   "platformTimes": { "linkedin":"08:30", ... },  // optional overrides (HH:MM local)
//   "items": [
//     {
//       "id":"cloudflare-google-ads",
//       "kind":"graphic" | "carousel",
//       "title":"Cloudflare blocking Google Ads",
//       "spec":{ ...make-graphic or make-carousel spec (no brand/out needed) },
//       "captions":{ "instagram":"...", "facebook":"...", "linkedin":"...",
//                    "linkedin_personal":"...", "gbp":"..." },
//       "link":"https://...",
//       "platforms":["instagram","facebook","linkedin","linkedin_personal","gbp"]
//     }
//   ]
// }
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..');
const batchPath = process.argv[2];
if (!batchPath) { console.error('usage: graphic-batch.mjs <batch.json>'); process.exit(1); }
const batchAbs = resolve(batchPath);
const batchBase = dirname(batchAbs);
const batch = JSON.parse(readFileSync(batchAbs, 'utf8'));

// Resolve the client pack (multi-client): batch.client -> brand/clients/<slug>/.
// Falls back to batch.brand (or the built-in local brand) when no client is set.
let CLIENT = null, CLIENT_DIR = null;
if (batch.client) {
  CLIENT_DIR = resolve(REPO, 'brand/clients', batch.client);
  const cfgPath = join(CLIENT_DIR, 'client.json');
  if (!existsSync(cfgPath)) {
    console.error(`client not found: ${cfgPath} (run tools/init-client.sh ${batch.client})`);
    process.exit(1);
  }
  CLIENT = JSON.parse(readFileSync(cfgPath, 'utf8'));
}

const BRAND_ABS = CLIENT
  ? resolve(CLIENT_DIR, CLIENT.brand || 'graphic.brand.json')
  : resolve(batchBase, batch.brand || '../../brand/ctm.local/graphic.brand.json');
if (!existsSync(BRAND_ABS)) { console.error(`brand not found: ${BRAND_ABS}`); process.exit(1); }

const TZ = batch.timezone || (CLIENT && CLIENT.timezone) || 'America/Los_Angeles';
const PLATFORMS = ['instagram','facebook','linkedin','linkedin_personal','gbp'];
const DEFAULT_TIMES = { linkedin:'08:30', linkedin_personal:'09:00', facebook:'10:00', instagram:'11:30', gbp:'12:30' };
const TIMES = { ...DEFAULT_TIMES, ...((CLIENT && CLIENT.platformTimes)||{}), ...(batch.platformTimes||{}) };
const CLIENT_PLATFORMS = (CLIENT && Array.isArray(CLIENT.platforms) && CLIENT.platforms.length) ? CLIENT.platforms : PLATFORMS;
const DEFAULT_LINK = (CLIENT && CLIENT.defaultLink) || '';
const TARGET = { instagram:'instagram', facebook:'facebook', linkedin:'linkedin:page', linkedin_personal:'linkedin:personal', gbp:'gbp' };

const today = new Date();
const dateStr = today.toISOString().slice(0,10);
const batchName = batch.batch || `graphics-batch-${dateStr}`;
const OUT = join(REPO, 'projects', batchName);
mkdirSync(join(OUT, 'items'), { recursive: true });

// startDate default = tomorrow (local date arithmetic on the Y-M-D string)
function addDays(ymd, n) {
  const [y,m,d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m-1, d));
  dt.setUTCDate(dt.getUTCDate()+n);
  return dt.toISOString().slice(0,10);
}
const startDate = batch.startDate || addDays(dateStr, 1);

// Convert a local wall-clock (Y-M-D H:M in TZ) to a UTC ISO string ending in Z.
function zonedToUTC(ymd, hm) {
  const [y,mo,d] = ymd.split('-').map(Number);
  const [h,mi] = hm.split(':').map(Number);
  const asUTC = Date.UTC(y, mo-1, d, h, mi, 0);
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour12:false,
    year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const p = Object.fromEntries(dtf.formatToParts(new Date(asUTC)).map(x=>[x.type,x.value]));
  const asTZ = Date.UTC(+p.year, +p.month-1, +p.day, +p.hour, +p.minute, +(p.second==='24'?0:p.second));
  return new Date(asUTC - (asTZ - asUTC)).toISOString().replace(/\.\d{3}Z$/, '.000Z');
}
function prettyPT(ymd, hm) {
  const iso = zonedToUTC(ymd, hm);
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday:'short', month:'short', day:'numeric',
    hour:'numeric', minute:'2-digit', timeZoneName:'short' }).format(new Date(iso));
}

const PNG_DIMS = p => { try { const b=readFileSync(p); return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`; } catch { return '?'; } };

// --- render each item --------------------------------------------------------
const manifestItems = [];
const reviewChunks = [];
let dayCursor = 0;

for (const item of (batch.items || [])) {
  const id = item.id;
  const kind = item.kind === 'carousel' ? 'carousel' : 'graphic';
  const itemDir = join(OUT, 'items', id);
  mkdirSync(join(itemDir, 'captions'), { recursive: true });

  // Resolve media paths (photo / bg) against the client pack (or batch dir) so a
  // relative "media/..." reference points at the real file, wherever the spec is
  // written. Absolute paths and data URIs pass through untouched.
  const MEDIA_BASE = CLIENT_DIR || batchBase;
  const resolveMedia = p => (!p || p.startsWith('data:') || p.startsWith('/')) ? p : resolve(MEDIA_BASE, p);
  const withMedia = s => {
    const o = { ...s };
    if (o.photo) o.photo = resolveMedia(o.photo);
    if (o.bg) o.bg = resolveMedia(o.bg);
    return o;
  };
  let specSrc = withMedia(item.spec || {});
  if (kind === 'carousel' && Array.isArray(specSrc.slides)) {
    specSrc = { ...specSrc, slides: specSrc.slides.map(withMedia) };
  }

  // Write the generator spec with brand + out pinned.
  const spec = { ...specSrc, brand: BRAND_ABS, out: id };
  const specPath = join(itemDir, 'spec.json');
  writeFileSync(specPath, JSON.stringify(spec, null, 2));

  // Generate + render.
  let media = [];
  try {
    if (kind === 'carousel') {
      execFileSync('node', [join(REPO,'tools/make-carousel.mjs'), specPath], { stdio:'pipe' });
      const man = JSON.parse(readFileSync(join(itemDir, 'graphics', id, 'carousel.json'), 'utf8'));
      for (const s of man.slides) {
        const dir = join(itemDir, 'graphics', id, s.dir);
        execFileSync('bash', [join(REPO,'tools/render-graphic.sh'), dir, '2'], { stdio:'pipe' });
        media.push(join(dir, 'graphic.png'));
      }
    } else {
      execFileSync('node', [join(REPO,'tools/make-graphic.mjs'), specPath], { stdio:'pipe' });
      const dir = join(itemDir, 'graphics', id);
      execFileSync('bash', [join(REPO,'tools/render-graphic.sh'), dir, '2'], { stdio:'pipe' });
      media.push(join(dir, 'graphic.png'));
    }
  } catch (e) {
    console.error(`FAILED item "${id}": ${e.message}`);
    reviewChunks.push(`## ${item.title || id}\n\n**RENDER FAILED** — ${String(e.message).slice(0,200)}\n\n---\n`);
    continue;
  }

  // Persist caption files (reviewable + safe to quote).
  const caps = item.captions || {};
  for (const [k,v] of Object.entries(caps)) writeFileSync(join(itemDir,'captions',`${k}.txt`), String(v));

  // Schedule: one item per day; each platform at its slot that day.
  const day = addDays(startDate, dayCursor++);
  const platforms = (item.platforms || CLIENT_PLATFORMS).filter(p => PLATFORMS.includes(p));
  const itemLink = item.link || DEFAULT_LINK;
  const posts = platforms.map(p => ({
    platform: p,
    target: TARGET[p],
    kind: p === 'gbp' ? 'graphic-cover' : kind,   // GBP takes only the cover slide
    scheduleUTC: zonedToUTC(day, TIMES[p] || '10:00'),
    schedulePT: prettyPT(day, TIMES[p] || '10:00'),
  }));

  manifestItems.push({ id, kind, title: item.title || id, media, captions: caps, link: itemLink, posts });

  // review.md chunk
  const dims = media.length ? PNG_DIMS(media[0]) : '?';
  const rel = p => p.replace(REPO + '/', '');
  const capPrev = (k) => {
    const t = (caps[k]||'').split('\n').filter(Boolean).slice(0,2).join(' ');
    return t ? `> ${t}${(caps[k]||'').length>t.length?'…':''}` : '_(none)_';
  };
  const slideList = kind==='carousel'
    ? media.map((m,i)=>`  ${String(i+1).padStart(2,'0')}. [${rel(m)}](${rel(m)})`).join('\n')
    : `  [${rel(media[0]||'')}](${rel(media[0]||'')})`;
  const schedList = posts.map(p=>`- **${p.platform}**${p.kind==='graphic-cover'?' (cover only)':''}: ${p.schedulePT}`).join('\n');
  reviewChunks.push(
`## ${item.title || id}   \`${kind}\`${kind==='carousel'?` · ${media.length} slides`:''} · ${dims}

**Slides / image:**
${slideList}

**Instagram:** ${capPrev('instagram')}
**Facebook:** ${capPrev('facebook')}
**LinkedIn (page):** ${capPrev('linkedin')}
${caps.linkedin_personal!==undefined?`**LinkedIn (David):** ${capPrev('linkedin_personal')}\n`:''}**Google Business:** ${capPrev('gbp')}
${itemLink?`\n**Link:** ${itemLink}`:''}

**Proposed schedule:**
${schedList}

**Change notes:**
<!-- add change requests here -->

- [x] Approved for publishing

---
`);
}

// --- estimate manual time saved ----------------------------------------------
// Rough manual build time for one on-brand piece fanned out to its channels with
// per-channel captions + scheduling (design + copy + upload/schedule + QA):
//   graphic  ~60 min,  carousel ~120 min. Engine hands-on time is a few minutes.
const MIN_PER = { graphic: 60, carousel: 120 };
const nGraphic = manifestItems.filter(i => i.kind === 'graphic').length;
const nCarousel = manifestItems.filter(i => i.kind === 'carousel').length;
const savedMin = nGraphic * MIN_PER.graphic + nCarousel * MIN_PER.carousel;
const savedHrs = (savedMin / 60).toFixed(1);

// --- write manifest + review -------------------------------------------------
const manifest = { batch: batchName, brand: BRAND_ABS, timezone: TZ, startDate,
  client: CLIENT ? { slug: CLIENT.slug || batch.client, name: CLIENT.name || batch.client, ghl: CLIENT.ghl || {} } : null,
  timeSaved: { graphics: nGraphic, carousels: nCarousel, minutes: savedMin, hours: Number(savedHrs) },
  items: manifestItems };
writeFileSync(join(OUT, 'batch.manifest.json'), JSON.stringify(manifest, null, 2));

const review = `# Graphic Machine — ${batchName}

${manifestItems.length} item(s) rendered — ${nGraphic} graphic(s) + ${nCarousel} carousel(s). Review each below;
**uncheck** any you don't want, and add change notes. Nothing publishes until you confirm.
Boxes are pre-checked to reduce friction.

⏱️ **Estimated manual time saved: ~${savedHrs} hours** (${nGraphic}×~1h graphic + ${nCarousel}×~2h carousel — design + per-channel captions + scheduling; engine hands-on time is a few minutes).

Full set to Instagram / Facebook / LinkedIn; Google Business Profile gets the **cover only**
(it can't do carousels). Verify after publishing with \`ghl-verify-published.sh\`.

---

${reviewChunks.join('\n')}
## Batch Approval

- [x] All items reviewed and approved for publishing
`;
writeFileSync(join(OUT, 'review.md'), review);

console.log(JSON.stringify({
  batch: batchName, dir: OUT, items: manifestItems.length,
  review: join(OUT,'review.md'), manifest: join(OUT,'batch.manifest.json'),
  startDate, timezone: TZ,
}, null, 2));
