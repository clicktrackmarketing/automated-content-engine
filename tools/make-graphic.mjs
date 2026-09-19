#!/usr/bin/env node
// On-brand social graphic generator — typographic posters that render as sharp,
// branded PNGs for feed/carousel/story organic posts. Sibling to make-cover.mjs
// (which is photo-cover-centric); this one is layout/typography-first and fully
// self-contained (fonts + logo embedded), so the HTML renders anywhere.
//
//   node tools/make-graphic.mjs <spec.json>
//   node tools/render-graphic.sh <outdir>            # HTML -> PNG
//
// Spec fields:
//   layout    "announcement" | "statement" | "stat" | "checklist" | "quote"
//   canvas    "square" (1080x1080, default) | "portrait" (1080x1350) | "story" (1080x1920)
//   brand     path to graphic.brand.json (colors, fontsDir, logoB64)
//   kicker    small uppercase pill label (optional)
//   headline  hook text; wrap accent words in |pipes|; use \n for line breaks
//   subline   supporting line (optional); |accent| + **bold** supported
//   badge     optional pill under the subline (e.g. a call to action / warning)
//   badgeStyle "accent" (default) | "warn" (amber)
//   items     checklist layout: array of strings (accent pipes allowed)
//   stat      stat layout: the big number/text (e.g. "0" or "3x")
//   statUnit  stat layout: unit/label under or beside the number
//   quoteBy   quote layout: attribution line
//   photo     optional image path for a top band (announcement/statement)
//   focus     CSS object-position for the photo (e.g. "50% 25%")
//   size      headline px override (else auto-fit by length)
//   logoPos   "top" (default) | "none"
//   footer    tagline override; set "" to hide (defaults to brand.footer)
//   out       output dir basename (default: slug of headline)
//   debug     draw safe-zone guides
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const specPath = process.argv[2];
if (!specPath) { console.error('usage: make-graphic.mjs <spec.json>'); process.exit(1); }
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const base = dirname(resolve(specPath));
const R = p => resolve(base, p);

const brandPath = R(spec.brand || 'graphic.brand.json');
const brandBase = dirname(brandPath);
const RB = p => resolve(brandBase, p);            // brand assets resolve next to the brand file
const brand = JSON.parse(readFileSync(brandPath, 'utf8'));
const C = brand.colors;
const FONTS = RB(brand.fontsDir);
const LOGO = brand.logoB64 && existsSync(RB(brand.logoB64))
  ? readFileSync(RB(brand.logoB64), 'utf8').trim() : null;

// --- helpers -----------------------------------------------------------------
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// |word| -> accent span ; **word** -> bold ; \n -> <br>
const rich = s => esc(s)
  .split('|').map((p,i)=> i%2 ? `<span class="hl">${p}</span>` : p).join('')
  .replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
  .replace(/\n/g,'<br>');
const plain = s => String(s ?? '').replace(/\|/g,'').replace(/\*\*/g,'');

// Embed each Inter weight as a base64 data URL so the HTML is fully portable.
const faces = [];
if (existsSync(FONTS)) {
  for (const w of [400,600,700,800,900]) {
    const f = `${FONTS}/inter-${w}.woff2`;
    if (existsSync(f)) {
      const b64 = readFileSync(f).toString('base64');
      faces.push(`@font-face{font-family:'Brand';font-weight:${w};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2')}`);
    }
  }
}

const CANVAS = { square:[1080,1080], portrait:[1080,1350], story:[1080,1920] };
const [CW,CH] = CANVAS[spec.canvas || 'square'] || CANVAS.square;
const PAD = Math.round(CW * 0.083);              // ~90px side gutters on 1080

// Auto-fit headline size by longest line length, unless overridden.
function autoSize() {
  const lines = String(spec.headline || '').split('\n');
  const longest = Math.max(...lines.map(l => plain(l).length), 1);
  const nLines = lines.length;
  let s = longest <= 14 ? 132 : longest <= 20 ? 112 : longest <= 28 ? 92 : longest <= 38 ? 76 : 64;
  if (nLines >= 4) s = Math.min(s, 76);
  if (CH >= 1350) s += 6;                          // a touch bigger on taller canvases
  return s;
}
const HSIZE = spec.size || autoSize();

const PHOTO = spec.photo && existsSync(R(spec.photo))
  ? { data: readFileSync(R(spec.photo)).toString('base64'),
      mime: (spec.photo.split('.').pop()||'jpg').toLowerCase()==='png' ? 'image/png' : 'image/jpeg' }
  : null;
const PHOTO_H = PHOTO ? Math.round(CH * 0.40) : 0;

// --- layout bodies -----------------------------------------------------------
const kickerHTML = spec.kicker
  ? `<span class="kick"><span class="dot"></span>${esc(spec.kicker)}</span>` : '';
const badgeHTML = spec.badge
  ? `<div class="badge ${spec.badgeStyle==='warn'?'warn':''}"><span class="bico">${spec.badgeStyle==='warn'?'&#9888;':'&#10003;'}</span>${rich(spec.badge)}</div>` : '';
const footerText = spec.footer !== undefined ? spec.footer : brand.footer;
const footerHTML = footerText ? `<div class="foot">${rich(footerText)}</div>` : '';
const logoHTML = (LOGO && spec.logoPos !== 'none') ? `<img class="logo" src="${LOGO}" alt="">` : '';

function body() {
  switch (spec.layout) {
    case 'stat':
      return `
        ${kickerHTML}
        <div class="statwrap">
          <div class="statnum">${rich(spec.stat || '')}</div>
          ${spec.statUnit ? `<div class="statunit">${esc(spec.statUnit)}</div>` : ''}
        </div>
        ${spec.headline ? `<div class="h stat-h">${rich(spec.headline)}</div>` : ''}
        ${spec.subline ? `<div class="sub">${rich(spec.subline)}</div>` : ''}
        ${badgeHTML}`;
    case 'checklist':
      return `
        ${kickerHTML}
        <div class="h">${rich(spec.headline)}</div>
        <ul class="checks">
          ${(spec.items||[]).map(it=>`<li><span class="ck">&#10003;</span><span>${rich(it)}</span></li>`).join('')}
        </ul>
        ${spec.subline ? `<div class="sub">${rich(spec.subline)}</div>` : ''}
        ${badgeHTML}`;
    case 'quote':
      return `
        <div class="quotemark">&#8220;</div>
        <div class="h quote-h">${rich(spec.headline)}</div>
        ${spec.quoteBy ? `<div class="by">${rich(spec.quoteBy)}</div>` : ''}
        ${badgeHTML}`;
    case 'statement':
      return `
        ${kickerHTML}
        <div class="h">${rich(spec.headline)}</div>
        ${spec.subline ? `<div class="sub">${rich(spec.subline)}</div>` : '<div class="rule"></div>'}
        ${badgeHTML}`;
    case 'announcement':
    default:
      return `
        ${kickerHTML}
        <div class="h">${rich(spec.headline)}</div>
        ${spec.subline ? `<div class="sub">${rich(spec.subline)}</div>` : ''}
        ${badgeHTML}
        ${!spec.subline && !spec.badge ? '<div class="rule"></div>' : ''}`;
  }
}

// text block vertically centered in the area below the photo band
const textTop = PHOTO ? PHOTO_H : 0;
const align = spec.layout === 'quote' || spec.layout === 'statement' ? 'center' : 'left';

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${faces.join('\n')}
:root{--navy:${C.bg};--navy2:${C.bg2};--cy:${C.accent};--cyg:${C.accent2};--tx:${C.text};--mut:${C.muted};--dim:${C.dim||C.muted};--warn:${C.warn||'#f4b73f'};--warnink:${C.warnInk||'#1a1204'}}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#000}
.stage{width:${CW}px;height:${CH}px;position:relative;overflow:hidden;
  font-family:'Brand',system-ui,-apple-system,sans-serif;color:var(--tx);
  background:
    radial-gradient(130% 90% at 50% 8%, rgba(20,195,235,.20), transparent 60%),
    radial-gradient(120% 60% at 50% 100%, rgba(26,213,255,.10), transparent 62%),
    linear-gradient(180deg,var(--navy) 0%,var(--navy2) 100%)}
.grid{position:absolute;inset:0;opacity:.05;
  background-image:linear-gradient(rgba(20,195,235,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(20,195,235,.6) 1px,transparent 1px);
  background-size:80px 80px}
${PHOTO ? `
.photo{position:absolute;left:0;right:0;top:0;height:${PHOTO_H}px;
  background:url('data:${PHOTO.mime};base64,${PHOTO.data}') ${spec.focus||'50% 22%'}/cover no-repeat}
.pveil{position:absolute;left:0;right:0;top:0;height:${PHOTO_H}px;
  background:linear-gradient(180deg,rgba(10,23,46,.30) 0%,rgba(10,23,46,0) 40%,rgba(7,15,29,.96) 100%)}
`:''}
.text{position:absolute;left:${PAD}px;right:${PAD}px;top:${textTop}px;bottom:0;
  display:flex;flex-direction:column;justify-content:center;${align==='center'?'align-items:center;text-align:center;':''}
  padding:${PHOTO?0:PAD}px 0 ${Math.round(PAD*1.15)}px}
.kick{display:inline-flex;align-items:center;gap:13px;font-weight:700;font-size:27px;letter-spacing:4px;
  text-transform:uppercase;color:var(--cy);padding:12px 24px;border:2px solid rgba(20,195,235,.5);
  border-radius:100px;background:rgba(10,23,46,.6);margin-bottom:30px;align-self:${align==='center'?'center':'flex-start'}}
.dot{width:14px;height:14px;border-radius:50%;background:var(--cy);box-shadow:0 0 16px var(--cy)}
.h{font-weight:900;font-size:${HSIZE}px;line-height:.99;letter-spacing:-2.5px;text-shadow:0 6px 40px rgba(0,0,0,.55)}
.h .hl{color:var(--cy);text-shadow:0 2px 18px rgba(0,0,0,.5)}
.h b{color:var(--tx)}
.rule{height:11px;width:230px;margin:34px 0 0;border-radius:8px;align-self:${align==='center'?'center':'flex-start'};
  background:linear-gradient(90deg,var(--cy),var(--cyg));box-shadow:0 0 26px rgba(26,213,255,.6)}
.sub{margin-top:28px;font-weight:700;font-size:40px;line-height:1.28;color:var(--mut);max-width:${align==='center'?'82%':'100%'}}
.sub b{color:var(--tx)}
.sub .hl{color:var(--cy)}
.badge{display:inline-flex;align-items:center;gap:14px;margin-top:34px;font-weight:800;font-size:30px;
  letter-spacing:.4px;color:var(--cy);padding:16px 30px;border-radius:16px;
  border:2px solid rgba(20,195,235,.55);background:rgba(20,195,235,.10);align-self:${align==='center'?'center':'flex-start'}}
.badge .bico{font-size:30px;line-height:1}
.badge.warn{color:var(--warn);border-color:rgba(244,183,63,.6);background:rgba(244,183,63,.12)}
.checks{list-style:none;margin-top:36px;display:flex;flex-direction:column;gap:24px;width:100%}
.checks li{display:flex;align-items:flex-start;gap:20px;font-weight:700;font-size:40px;line-height:1.2;color:var(--tx)}
.checks .ck{flex:0 0 auto;width:52px;height:52px;border-radius:12px;display:grid;place-items:center;
  font-size:32px;color:var(--navy);background:linear-gradient(180deg,var(--cy),var(--cyg));box-shadow:0 6px 20px rgba(20,195,235,.4)}
.checks .hl{color:var(--cy)}
.statwrap{display:flex;align-items:baseline;gap:22px;${align==='center'?'justify-content:center;':''}margin-bottom:8px}
.statnum{font-weight:900;font-size:${spec.canvas==='story'?360:300}px;line-height:.86;letter-spacing:-14px;
  background:linear-gradient(180deg,var(--tx),var(--cy));-webkit-background-clip:text;background-clip:text;color:transparent;
  text-shadow:0 10px 60px rgba(20,195,235,.25)}
.statunit{font-weight:900;font-size:80px;text-transform:uppercase;letter-spacing:5px;color:var(--cy)}
.stat-h{font-size:${Math.min(HSIZE,72)}px;margin-top:10px}
.quotemark{font-weight:900;font-size:200px;line-height:.7;color:var(--cy);opacity:.55;margin-bottom:6px}
.quote-h{font-size:${Math.min(HSIZE,84)}px;letter-spacing:-1.5px;line-height:1.08}
.by{margin-top:34px;font-weight:700;font-size:36px;letter-spacing:1px;color:var(--mut)}
.by .hl{color:var(--cy)}
.logo{position:absolute;left:${PAD}px;top:${Math.round(PAD*0.72)}px;width:330px;z-index:3;
  filter:drop-shadow(0 6px 22px rgba(0,0,0,.55))}
.foot{position:absolute;left:0;right:0;bottom:${Math.round(PAD*0.66)}px;text-align:center;
  font-weight:800;font-size:30px;letter-spacing:7px;text-transform:uppercase;color:var(--tx);opacity:.92}
.foot .hl{color:var(--cy)}
${spec.debug ? `.dbg{position:absolute;left:${PAD}px;right:${PAD}px;top:${Math.round(textTop+ (PHOTO?0:PAD))}px;bottom:${Math.round(PAD*1.15)}px;border:3px dashed rgba(255,90,90,.8);pointer-events:none}`:''}
</style></head><body>
<div class="stage" data-composition-id="graphic" data-fps="30" data-duration="0.5">
  <div class="grid"></div>
  ${PHOTO ? '<div class="photo"></div><div class="pveil"></div>' : ''}
  ${logoHTML}
  <div class="text">${body()}</div>
  ${footerHTML}
  ${spec.debug ? '<div class="dbg"></div>' : ''}
</div></body></html>`;

const slug = plain(spec.headline || spec.stat || 'graphic')
  .toLowerCase().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
const name = spec.out || slug;
const outDir = R(`graphics/${name}`);
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/index.html`, html);
writeFileSync(`${outDir}/.name`, name);
writeFileSync(`${outDir}/meta.json`, JSON.stringify({ name, width: CW, height: CH, layout: spec.layout||'announcement', headlineSize: HSIZE }, null, 2));
console.log(JSON.stringify({ name, dir: outDir, canvas: [CW,CH], layout: spec.layout||'announcement', headlineSize: HSIZE }));
