#!/usr/bin/env node
// Reel/feed cover generator: real photo + brand overlay + hook text.
//
//   node tools/make-cover.mjs <spec.json>
//
// Spec fields:
//   photo     path to a real photo or a frame grabbed from the video
//   layout    "scrim" | "band" | "split"
//   kicker    small uppercase label (optional)
//   headline  hook text; wrap the accent words in |pipes|
//   subline   supporting line (optional)
//   focus     CSS object-position for the photo, e.g. "50% 18%"
//   brand     path to brand.json (colors, fonts dir, logo b64)
//   out       output basename
//
// GRID-SAFE ZONE: Instagram crops a 9:16 cover to its centre square for the
// profile grid — y 420..1500 on a 1080x1920 canvas. Every layout keeps the
// headline inside that band so the hook survives both views.
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';

const specPath = process.argv[2];
if (!specPath) { console.error('usage: make-cover.mjs <spec.json>'); process.exit(1); }
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const base = dirname(resolve(specPath));
const R = p => resolve(base, p);

const brand = JSON.parse(readFileSync(R(spec.brand || 'brand.json'), 'utf8'));
const C = brand.colors, FONTS = R(brand.fontsDir);
const LOGO = brand.logoB64 ? readFileSync(R(brand.logoB64), 'utf8').trim() : null;
const PHOTO = readFileSync(R(spec.photo)).toString('base64');
const ext = (spec.photo.split('.').pop() || 'jpg').toLowerCase();
const mime = ext === 'png' ? 'image/png' : 'image/jpeg';

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// |word| -> accent span
const hl = s => esc(s).split('|').map((p,i)=> i%2 ? `<span class="hl">${p}</span>` : p).join('').replace(/\n/g,'<br>');
const face = w => `@font-face{font-family:'Brand';font-weight:${w};src:url('fonts/inter-${w}.woff2') format('woff2');font-display:block}`;

const CANVAS = { reel:[1080,1920], square:[1080,1080], portrait:[1080,1350] };
const [CW,CH] = CANVAS[spec.canvas || 'reel'] || CANVAS.reel;
const T = spec.textTop;   // optional override: px from top
// INSTAGRAM REEL SAFE ZONES on a 1080x1920 canvas:
//   right  210px  action rail (like / comment / share / more)
//   bottom 430px  caption, username, audio ticker
//   top    140px  header strip
// The profile-grid crop (y 420..1500) overlaps this almost exactly, so content
// that clears the rail and the caption also survives the grid crop.
const K = CH/1920;                       // vertical scale for non-reel canvases
const px = v => Math.round(v*K);
const SAFE = { top:px(140), right:210, bottom:spec.canvas && spec.canvas!=='reel' ? px(120) : 430, left:72 };
const LAYOUTS = {
  // photo full-bleed, gradient scrim rising from the bottom
  scrim: `
    .photo{position:absolute;inset:0;background:url('data:${mime};base64,${PHOTO}') ${spec.focus||'50% 18%'}/cover no-repeat}
    .veil{position:absolute;inset:0;background:linear-gradient(180deg,
      rgba(10,23,46,.62) 0%, rgba(10,23,46,.10) 22%, rgba(7,15,29,.80) 56%, rgba(7,15,29,.97) 100%)}
    .text{position:absolute;left:${SAFE.left}px;right:${SAFE.right}px;top:${T||px(660)}px}`,
  // solid brand band across the grid-safe middle
  band: `
    .photo{position:absolute;inset:0;background:url('data:${mime};base64,${PHOTO}') ${spec.focus||'50% 26%'}/cover no-repeat}
    .veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,15,29,.45),rgba(7,15,29,.62))}
    .text{position:absolute;left:0;right:0;top:${T||px(700)}px;padding:52px ${SAFE.right}px 52px ${SAFE.left}px;
      background:linear-gradient(180deg,rgba(10,23,46,.0),rgba(10,23,46,.96) 14%,rgba(10,23,46,.96) 86%,rgba(10,23,46,0));
      border-top:3px solid ${C.accent};border-bottom:3px solid ${C.accent}}`,
  // photo on top, solid brand block beneath — most legible, best for long hooks
  split: `
    .stage{background:
      radial-gradient(130% 55% at 50% 100%,${C.accent}22,transparent 62%),
      linear-gradient(180deg,${C.bg} 0%,${C.bg2} 100%)}
    .photo{position:absolute;left:0;right:0;top:0;height:${px(1120)}px;
      background:url('data:${mime};base64,${PHOTO}') ${spec.focus||'50% 22%'}/cover no-repeat}
    .veil{position:absolute;left:0;right:0;top:0;height:${px(1120)}px;
      background:linear-gradient(180deg,rgba(10,23,46,.35) 0%,rgba(10,23,46,0) 34%,rgba(10,23,46,.92) 100%)}
    .grid{height:${px(1120)}px;bottom:auto}
    .text{position:absolute;left:${SAFE.left}px;right:${SAFE.right}px;top:${T||px(980)}px}`
};

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${[400,600,700,800,900].map(face).join('\n')}
:root{--navy:${C.bg};--navy2:${C.bg2};--cy:${C.accent};--cyg:${C.accent2};--tx:${C.text};--mut:${C.muted}}
html,body{margin:0;background:#000}*{box-sizing:border-box}
.stage{width:${CW}px;height:${CH}px;position:relative;overflow:hidden;font-family:'Brand',system-ui,sans-serif;color:var(--tx);background:var(--navy2)}
${LAYOUTS[spec.layout || 'scrim']}
.grid{position:absolute;inset:0;opacity:.05;
  background-image:linear-gradient(rgba(20,195,235,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(20,195,235,.6) 1px,transparent 1px);
  background-size:80px 80px}
.kick{display:inline-flex;align-items:center;gap:13px;font-weight:700;font-size:28px;letter-spacing:4.5px;
  text-transform:uppercase;color:var(--cy);padding:12px 24px;border:2px solid rgba(20,195,235,.5);
  border-radius:100px;background:rgba(10,23,46,.6);margin-bottom:26px}
.dot{width:15px;height:15px;border-radius:50%;background:var(--cy);box-shadow:0 0 16px var(--cy)}
.h{font-weight:900;font-size:${spec.size || 108}px;line-height:.97;letter-spacing:-3px;text-shadow:0 6px 40px rgba(0,0,0,.6)}
.h .hl{color:var(--cy);text-shadow:0 2px 18px rgba(0,0,0,.55)}
.rule{height:11px;width:230px;margin:30px 0 0;border-radius:8px;
  background:linear-gradient(90deg,var(--cy),var(--cyg));box-shadow:0 0 26px rgba(26,213,255,.65)}
.sub{margin-top:26px;font-weight:700;font-size:44px;line-height:1.22;color:var(--mut)}
.sub b{color:var(--tx)}
.logo{position:absolute;left:${SAFE.left}px;${spec.logoPos==='top' ? `top:${SAFE.top}px` : `bottom:${SAFE.bottom}px`};width:330px;filter:drop-shadow(0 6px 22px rgba(0,0,0,.6))}
${spec.debug ? `
.safe{position:absolute;left:0;right:0;top:${px(420)}px;height:${px(1080)}px;border:4px dashed rgba(255,80,80,.8);pointer-events:none}
.safe::after{content:"GRID CROP";position:absolute;top:8px;left:12px;font:700 24px 'Brand';color:rgba(255,80,80,.95);letter-spacing:3px}
.reel{position:absolute;left:${SAFE.left}px;right:${SAFE.right}px;top:${SAFE.top}px;bottom:${SAFE.bottom}px;
  border:4px dashed rgba(80,255,140,.85);pointer-events:none}
.reel::after{content:"REEL-SAFE";position:absolute;bottom:8px;left:12px;font:700 24px 'Brand';color:rgba(80,255,140,.95);letter-spacing:3px}` : ''}
</style></head><body>
<div class="stage" data-composition-id="cover" data-fps="30" data-duration="0.5">
  <div class="photo"></div><div class="veil"></div><div class="grid"></div>
  <div class="text">
    ${spec.kicker ? `<span class="kick"><span class="dot"></span>${esc(spec.kicker)}</span>` : ''}
    <div class="h">${hl(spec.headline)}</div>
    ${spec.subline ? `<div class="sub">${hl(spec.subline)}</div>` : '<div class="rule"></div>'}
  </div>
  ${LOGO ? `<img class="logo" src="${LOGO}" alt="">` : ''}
  ${spec.debug ? '<div class="safe"></div><div class="reel"></div>' : ''}
</div></body></html>`;

// Name the output after the headline so files are findable by what they say.
const slug = String(spec.headline)
  .replace(/\|/g,'').toLowerCase()
  .replace(/['’]/g,'')
  .replace(/[^a-z0-9]+/g,'-')
  .replace(/^-+|-+$/g,'')
  .slice(0,60);
const name = spec.out || slug;
const outDir = R(`covers/${name}`);
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/index.html`, html);
writeFileSync(`${outDir}/.name`, name);
if (existsSync(FONTS)) cpSync(FONTS, `${outDir}/fonts`, { recursive: true });
console.log(`${name}  (${spec.layout || 'scrim'})`);
