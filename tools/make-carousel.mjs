#!/usr/bin/env node
// On-brand multi-slide CAROUSEL generator — a SUPERSET of tools/make-graphic.mjs.
// Emits one render-ready dir per slide (index.html + meta.json + .name) plus a
// carousel.json manifest, all sharing ONE canvas/aspect ratio, ONE brand, and a
// consistent chrome layer (progress indicator, cover swipe chip, logo, footer).
//
//   node tools/make-carousel.mjs <spec.json>
//   for d in graphics/<out>/slide-*; do bash tools/render-graphic.sh "$d"; done
//
// Top-level spec fields:
//   brand     path to graphic.brand.json (colors, fontsDir, logoB64)
//   canvas    "portrait" (1080x1350, default) | "square" (1080x1080)   -- "story" is REJECTED
//   progress  "dots" (default) | "count"      -- auto-forced to "count" when slides > 8
//   footer    default footer, inherited by body/cta slides (slide.footer overrides)
//   out       output dir basename (default: slug of first headline)
//   slides    array of slide objects
//
// Each slide object:
//   role      "cover" | "body" | "cta"  (inferred: idx0=cover, last=cta, else body)
//   type      "announcement" | "statement" | "stat" | "number" | "checklist" | "quote" | "image"
//   plus make-graphic fields: kicker, headline, subline, items, stat, statUnit, number,
//        statStyle, quoteBy, photo, focus, badge, badgeStyle, link, size,
//        bg (full-bleed background image), bgScrim (light|medium|strong), bgFocus
//   NOTE: a per-slide `canvas` is REJECTED — the aspect ratio is declared once at top level.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const specPath = process.argv[2];
if (!specPath) { console.error('usage: make-carousel.mjs <spec.json>'); process.exit(1); }
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const base = dirname(resolve(specPath));
const R = p => resolve(base, p);

// --- brand (resolved exactly like make-graphic) ------------------------------
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
const clamp = (v,lo,hi) => Math.max(lo, Math.min(hi, v));

// Embed each Inter weight as a base64 data URL so every slide HTML is portable.
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
const FACES = faces.join('\n');

// --- canvas (declared ONCE, applied to every slide) --------------------------
const CANVAS = { square:[1080,1080], portrait:[1080,1350] };
const canvasKey = spec.canvas || 'portrait';
if (canvasKey === 'story') {
  console.error('Error: canvas "story" (1080x1920) is not a carousel format. Use "portrait" (1080x1350) or "square" (1080x1080).');
  process.exit(1);
}
if (!CANVAS[canvasKey]) {
  console.error(`Error: unknown canvas "${canvasKey}". Use "portrait" or "square".`);
  process.exit(1);
}
const [CW, CH] = CANVAS[canvasKey];
const PAD = Math.round(CW * 0.083);              // ~90px side gutters on 1080
const SF = CH / 1350;                            // scale factor vs the portrait baseline

const slides = Array.isArray(spec.slides) ? spec.slides : [];
if (!slides.length) { console.error('Error: spec.slides must be a non-empty array.'); process.exit(1); }
const TOTAL = slides.length;

// Reject any per-slide canvas override — one aspect ratio for the whole set.
slides.forEach((s, i) => {
  if (s && s.canvas !== undefined) {
    console.error(`Error: slide ${i} declares its own "canvas" — the carousel canvas is set once at the top level. Remove it.`);
    process.exit(1);
  }
});

// progress mode: dots default, forced to count when there are more than 8 slides.
let progressMode = spec.progress === 'count' ? 'count' : 'dots';
if (TOTAL > 8) progressMode = 'count';

// Auto-fit headline size by longest line length (same heuristic as make-graphic).
function autoSize(headline) {
  const lines = String(headline || '').split('\n');
  const longest = Math.max(...lines.map(l => plain(l).length), 1);
  const nLines = lines.length;
  let s = longest <= 14 ? 132 : longest <= 20 ? 112 : longest <= 28 ? 92 : longest <= 38 ? 76 : 64;
  if (nLines >= 4) s = Math.min(s, 76);
  if (CH >= 1350) s += 6;                          // a touch bigger on taller canvases
  return s;
}

// --- per-slide renderer (superset of make-graphic's body() + a chrome layer) --
function renderSlide(slide, index) {
  const role = slide.role || (index === 0 ? 'cover' : index === TOTAL - 1 ? 'cta' : 'body');
  const accentIndex = index;                       // 0-based position drives the accent rhythm

  // type -> layout mapping (with the two parameterized variants)
  const type = slide.type || (slide.items ? 'checklist' : slide.stat != null || slide.number != null ? 'stat' : 'announcement');
  let layout = 'announcement';
  let statStyle = slide.statStyle;
  let statValue = slide.stat;
  switch (type) {
    case 'statement':    layout = 'statement'; break;
    case 'stat':         layout = 'stat'; break;
    case 'number':       layout = 'stat'; statStyle = 'index';
                         statValue = slide.number != null ? slide.number : slide.stat; break;
    case 'checklist':    layout = 'checklist'; break;
    case 'quote':        layout = 'quote'; break;
    case 'image':        layout = slide.subline ? 'statement' : 'announcement'; break;
    case 'announcement':
    default:             layout = 'announcement'; break;
  }

  // photo band (image slides, or any slide with a photo)
  const PHOTO = slide.photo && existsSync(R(slide.photo))
    ? { data: readFileSync(R(slide.photo)).toString('base64'),
        mime: (slide.photo.split('.').pop()||'jpg').toLowerCase()==='png' ? 'image/png' : 'image/jpeg' }
    : null;
  const PHOTO_H = PHOTO ? Math.round(CH * 0.40) : 0;

  // Full-bleed background image (behind the whole slide) + brand scrim.
  const BG = slide.bg && existsSync(R(slide.bg))
    ? { data: readFileSync(R(slide.bg)).toString('base64'),
        mime: (slide.bg.split('.').pop()||'jpg').toLowerCase()==='png' ? 'image/png' : 'image/jpeg' }
    : null;
  const SCRIMS = {
    light:  'linear-gradient(180deg, rgba(10,23,46,.45), rgba(7,15,29,.68))',
    medium: 'linear-gradient(180deg, rgba(10,23,46,.66), rgba(7,15,29,.85))',
    strong: 'linear-gradient(180deg, rgba(10,23,46,.80), rgba(7,15,29,.93))',
  };
  const BG_SCRIM = SCRIMS[slide.bgScrim] || SCRIMS.medium;

  // headline size clamps by role (scaled for the active canvas)
  const auto = autoSize(slide.headline);
  let hs;
  if (role === 'cover')    hs = clamp(auto + 8, Math.round(92*SF),  Math.round(148*SF));
  else if (role === 'cta') hs = clamp(auto,     Math.round(76*SF),  Math.round(120*SF));
  else                     hs = clamp(auto,     Math.round(64*SF),  Math.round(108*SF));
  if (slide.size) hs = slide.size;
  hs = Math.round(hs);

  // alignment: cta + quote are centered; everything else is left (so the kicker /
  // rule accent rhythm reads flush-left on body announcement/statement slides).
  const align = (role === 'cta' || layout === 'quote') ? 'center' : 'left';

  // chrome-safe text band
  let textTop = PHOTO ? PHOTO_H : Math.round(150 * SF);
  if (role === 'cta' && !PHOTO) textTop = Math.round(CH * 0.24);   // room for the centered end-card logo
  const textBottom = Math.round(120 * SF);

  // --- shared components -----------------------------------------------------
  const kickHTML = slide.kicker
    ? `<span class="kick"><span class="dot"></span>${esc(slide.kicker)}</span>` : '';
  // Accent badges (e.g. CTA buttons) carry no leading icon — the arrow in the
  // label is the affordance. Only warning badges show the ⚠ glyph.
  const badgeHTML = slide.badge
    ? `<div class="badge ${slide.badgeStyle==='warn'?'warn':''}">${slide.badgeStyle==='warn'?'<span class="bico">&#9888;</span>':''}${rich(slide.badge)}</div>` : '';
  const subHTML = slide.subline ? `<div class="sub">${rich(slide.subline)}</div>` : '';
  const linkHTML = (role === 'cta' && slide.link) ? `<div class="link">${esc(slide.link)}</div>` : '';

  // --- text-block inner content ---------------------------------------------
  let inner;
  if (layout === 'stat' && statStyle === 'index') {
    // number variant: a big FLAT cyan numeral inline-left of the headline.
    inner = `
      <div class="numrow">
        <div class="statnum idx">${rich(String(statValue ?? ''))}</div>
        <div class="numbody">
          ${kickHTML}
          ${slide.headline ? `<div class="h">${rich(slide.headline)}</div>` : ''}
          ${subHTML}${badgeHTML}
        </div>
      </div>`;
  } else if (layout === 'stat') {
    inner = `
      ${kickHTML}
      <div class="statwrap">
        <div class="statnum">${rich(String(statValue ?? ''))}</div>
        ${slide.statUnit ? `<div class="statunit">${esc(slide.statUnit)}</div>` : ''}
      </div>
      ${slide.headline ? `<div class="h stat-h">${rich(slide.headline)}</div>` : ''}
      ${subHTML}${badgeHTML}`;
  } else if (layout === 'checklist') {
    inner = `
      ${kickHTML}
      <div class="h">${rich(slide.headline)}</div>
      <ul class="checks">
        ${(slide.items||[]).map(it=>`<li><span class="ck">&#10003;</span><span>${rich(it)}</span></li>`).join('')}
      </ul>
      ${subHTML}${badgeHTML}`;
  } else if (layout === 'quote') {
    inner = `
      <div class="quotemark">&#8220;</div>
      <div class="h quote-h">${rich(slide.headline)}</div>
      ${slide.quoteBy ? `<div class="by">${rich(slide.quoteBy)}</div>` : ''}
      ${badgeHTML}`;
  } else if (role === 'cta') {
    // announcement/statement as a centered end card
    inner = `
      ${kickHTML}
      <div class="h">${rich(slide.headline)}</div>
      ${subHTML}${badgeHTML}${linkHTML}`;
  } else {
    // announcement / statement body (or cover) with the accent rhythm.
    const isBody = role === 'body';
    const ruleLead = isBody && (accentIndex % 2 === 1);   // odd body: rule bar under headline, no kicker
    const leadKicker = ruleLead ? '' : kickHTML;          // even body / cover: cyan kicker pill leads
    const underRule = ruleLead ? '<div class="rule"></div>' : '';
    const tailRule = (!subHTML && !badgeHTML && !underRule) ? '<div class="rule"></div>' : '';
    inner = `
      ${leadKicker}
      <div class="h">${rich(slide.headline)}</div>
      ${underRule}${subHTML}${badgeHTML}${tailRule}`;
  }

  // --- chrome layer (z-index 4): progress + cover swipe chip -----------------
  let progHTML;
  if (progressMode === 'count') {
    const cur = String(index + 1).padStart(2, '0');
    const tot = String(TOTAL).padStart(2, '0');
    progHTML = `<div class="prog count"><span class="pc-cur">${cur}</span><span class="pc-tot">/${tot}</span></div>`;
  } else {
    let dots = '';
    for (let i = 0; i < TOTAL; i++) dots += `<span class="pd${i===index?' on':''}"></span>`;
    progHTML = `<div class="prog dots">${dots}</div>`;
  }
  const swipeHTML = (role === 'cover' && TOTAL > 1)
    ? `<div class="swipe"><span class="sw">SWIPE</span><span class="ar">&#8594;</span></div>` : '';

  // logo: small top-left on cover+body; centered end-card on cta.
  const logoHTML = LOGO
    ? `<img class="logo${role==='cta'?' end':''}" src="${LOGO}" alt="">` : '';

  // footer: "" on cover; body/cta inherit slide -> carousel -> brand.
  const footerText = role === 'cover' ? '' : (slide.footer ?? spec.footer ?? brand.footer);
  const footerHTML = footerText ? `<div class="foot">${rich(footerText)}</div>` : '';

  const statNumPx  = Math.round(300 * SF);
  const statUnitPx = Math.round(80 * SF);
  const idxNumPx   = Math.round(220 * SF);

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${FACES}
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
${BG ? `
.bgphoto{position:absolute;inset:0;background:url('data:${BG.mime};base64,${BG.data}') ${slide.bgFocus||'50% 50%'}/cover no-repeat}
.bgscrim{position:absolute;inset:0;background:${BG_SCRIM}}` : ''}
${PHOTO ? `
.photo{position:absolute;left:0;right:0;top:0;height:${PHOTO_H}px;
  background:url('data:${PHOTO.mime};base64,${PHOTO.data}') ${slide.focus||'50% 22%'}/cover no-repeat}
.pveil{position:absolute;left:0;right:0;top:0;height:${PHOTO_H}px;
  background:linear-gradient(180deg,rgba(10,23,46,.30) 0%,rgba(10,23,46,0) 40%,rgba(7,15,29,.96) 100%)}
`:''}
.text{position:absolute;left:${PAD}px;right:${PAD}px;top:${textTop}px;bottom:${textBottom}px;
  display:flex;flex-direction:column;justify-content:center;${align==='center'?'align-items:center;text-align:center;':''}}
.kick{display:inline-flex;align-items:center;gap:13px;font-weight:700;font-size:27px;letter-spacing:4px;
  text-transform:uppercase;color:var(--cy);padding:12px 24px;border:2px solid rgba(20,195,235,.5);
  border-radius:100px;background:rgba(10,23,46,.6);margin-bottom:30px;align-self:${align==='center'?'center':'flex-start'}}
.dot{width:14px;height:14px;border-radius:50%;background:var(--cy);box-shadow:0 0 16px var(--cy)}
.h{font-weight:900;font-size:${hs}px;line-height:.99;letter-spacing:-2.5px;text-shadow:0 6px 40px rgba(0,0,0,.55)}
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
.link{margin-top:30px;font-weight:800;font-size:44px;letter-spacing:.5px;color:var(--cy)}
.checks{list-style:none;margin-top:36px;display:flex;flex-direction:column;gap:24px;width:100%}
.checks li{display:flex;align-items:flex-start;gap:20px;font-weight:700;font-size:40px;line-height:1.2;color:var(--tx)}
.checks .ck{flex:0 0 auto;width:52px;height:52px;border-radius:12px;display:grid;place-items:center;
  font-size:32px;color:var(--navy);background:linear-gradient(180deg,var(--cy),var(--cyg));box-shadow:0 6px 20px rgba(20,195,235,.4)}
.checks .hl{color:var(--cy)}
.statwrap{display:flex;align-items:baseline;gap:22px;${align==='center'?'justify-content:center;':''}margin-bottom:${Math.round(36*SF)}px}
.statnum{font-weight:900;font-size:${statNumPx}px;line-height:.86;letter-spacing:-14px;
  background:linear-gradient(180deg,var(--tx),var(--cy));-webkit-background-clip:text;background-clip:text;color:transparent;
  text-shadow:0 10px 60px rgba(20,195,235,.25)}
.statunit{font-weight:900;font-size:${statUnitPx}px;text-transform:uppercase;letter-spacing:5px;color:var(--cy)}
.stat-h{font-size:${Math.min(hs,72)}px;margin-top:${Math.round(24*SF)}px}
.numrow{display:flex;align-items:center;gap:40px}
.numrow .numbody{display:flex;flex-direction:column}
.statnum.idx{font-size:${idxNumPx}px;line-height:.9;letter-spacing:-8px;flex:0 0 auto;
  background:none;-webkit-background-clip:border-box;background-clip:border-box;-webkit-text-fill-color:var(--cy);
  color:var(--cy);text-shadow:0 8px 40px rgba(20,195,235,.35)}
.numrow .kick{margin-bottom:20px}
.quotemark{font-weight:900;font-size:200px;line-height:.7;color:var(--cy);opacity:.55;margin-bottom:6px}
.quote-h{font-size:${Math.min(hs,84)}px;letter-spacing:-1.5px;line-height:1.08}
.by{margin-top:34px;font-weight:700;font-size:36px;letter-spacing:1px;color:var(--mut)}
.by .hl{color:var(--cy)}
.logo{position:absolute;left:${PAD}px;top:${Math.round(PAD*0.72)}px;width:280px;z-index:3;
  filter:drop-shadow(0 6px 22px rgba(0,0,0,.55))}
.logo.end{left:50%;top:${Math.round(CH*0.10)}px;transform:translateX(-50%);width:560px;max-width:64%}
.foot{position:absolute;left:0;right:0;bottom:${Math.round(PAD*0.66)}px;text-align:center;
  font-weight:800;font-size:30px;letter-spacing:7px;text-transform:uppercase;color:var(--tx);opacity:.92}
.foot .hl{color:var(--cy)}
.chrome{position:absolute;inset:0;z-index:4;pointer-events:none}
.prog{position:absolute;top:78px;right:90px;display:flex;align-items:center}
.prog.dots{gap:18px}
.pd{width:14px;height:14px;border-radius:100px;background:rgba(201,215,232,.28)}
.pd.on{width:28px;background:linear-gradient(180deg,var(--cy),var(--cyg));box-shadow:0 0 16px var(--cy)}
.prog.count{font-size:34px;font-variant-numeric:tabular-nums;letter-spacing:1px}
.pc-cur{color:var(--cy);font-weight:900}
.pc-tot{color:var(--mut);font-weight:700}
.swipe{position:absolute;right:90px;bottom:120px;display:inline-flex;align-items:center;gap:12px;
  padding:14px 26px;border:2px solid rgba(20,195,235,.5);border-radius:100px;background:rgba(10,23,46,.6)}
.swipe .sw{font-weight:800;font-size:28px;letter-spacing:4px;text-transform:uppercase;color:var(--cy)}
.swipe .ar{font-size:36px;line-height:1;color:var(--cy)}
</style></head><body>
<div class="stage" data-composition-id="carousel-slide" data-fps="30" data-duration="0.5">
  ${BG ? '<div class="bgphoto"></div><div class="bgscrim"></div>' : ''}
  <div class="grid"></div>
  ${PHOTO ? '<div class="photo"></div><div class="pveil"></div>' : ''}
  ${logoHTML}
  <div class="text">${inner}</div>
  ${footerHTML}
  <div class="chrome">${progHTML}${swipeHTML}</div>
</div></body></html>`;

  return { html, role, type, layout, headlineSize: hs };
}

// --- write every slide dir + the carousel manifest ---------------------------
const firstSlug = plain(slides[0].headline || slides[0].stat || slides[0].number || 'carousel')
  .toLowerCase().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
const name = spec.out || firstSlug;
const outDir = R(`graphics/${name}`);
mkdirSync(outDir, { recursive: true });

const manifestSlides = [];
slides.forEach((slide, index) => {
  const nn = String(index + 1).padStart(2, '0');
  const { html, role, type, layout, headlineSize } = renderSlide(slide, index);
  const slideDirName = `slide-${nn}`;
  const slideName = `${name}-${nn}`;
  const slideDir = `${outDir}/${slideDirName}`;
  mkdirSync(slideDir, { recursive: true });
  writeFileSync(`${slideDir}/index.html`, html);
  writeFileSync(`${slideDir}/.name`, slideName);
  writeFileSync(`${slideDir}/meta.json`, JSON.stringify({
    name: slideName, width: CW, height: CH, layout, headlineSize,
    index, total: TOTAL, role
  }, null, 2));
  manifestSlides.push({ index, role, type, dir: slideDirName, name: slideName });
});

const manifest = {
  name, canvas: canvasKey, width: CW, height: CH,
  total: TOTAL, progress: progressMode, slides: manifestSlides
};
writeFileSync(`${outDir}/carousel.json`, JSON.stringify(manifest, null, 2));

console.log(JSON.stringify({ name, dir: outDir, canvas: [CW,CH], total: TOTAL, progress: progressMode }));
