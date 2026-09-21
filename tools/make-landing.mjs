#!/usr/bin/env node
// On-brand, responsive LANDING PAGE generator — turns a spec into ONE
// self-contained HTML web page (no build step, no external assets except the
// Google Fonts stylesheet and the optional embedded logo data URI). Sibling to
// tools/make-graphic.mjs / make-carousel.mjs; those emit fixed-canvas PNG-bound
// posters, this one emits a real, fluid, responsive web page.
//
//   node tools/make-landing.mjs <spec.json>
//
// Spec fields:
//   brand      path to graphic.brand.json (rel to spec)   -> colors, name, footer, logoB64
//   out        output basename (default: slug of headline)
//   kicker     eyebrow label (optional)
//   headline   hero headline (required; |accent|, **bold**, \n)
//   subhead    hero sub-headline (optional; |accent|, **bold**, \n)
//   heroCtaText / heroCtaUrl   primary hero CTA (optional)
//   stats      optional array of { value, label } -> big-number stat tiles
//   sections   optional array of { h, p } and/or { h, bullets:[...] } -> content blocks
//   ctaText / ctaUrl   closing CTA band (optional)
//   footer     footer tagline (default brand.footer; |accent|, **bold**, \n)
//
// Output: <specdir>/landing/<out>.html
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const specPath = process.argv[2];
if (!specPath) { console.error('usage: make-landing.mjs <spec.json>'); process.exit(1); }
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const base = dirname(resolve(specPath));
const R = p => resolve(base, p);

// --- brand (resolved exactly like make-graphic) ------------------------------
const brandPath = R(spec.brand || 'graphic.brand.json');
const brandBase = dirname(brandPath);
const RB = p => resolve(brandBase, p);            // brand assets resolve next to the brand file
const brand = JSON.parse(readFileSync(brandPath, 'utf8'));
const C = brand.colors;
const LOGO = brand.logoB64 && existsSync(RB(brand.logoB64))
  ? readFileSync(RB(brand.logoB64), 'utf8').trim() : null;

if (!spec.headline) { console.error('Error: spec.headline is required.'); process.exit(1); }

// --- helpers -----------------------------------------------------------------
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// |word| -> accent span ; **word** -> bold ; \n -> <br>
const rich = s => esc(s)
  .split('|').map((p,i)=> i%2 ? `<span class="hl">${p}</span>` : p).join('')
  .replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
  .replace(/\n/g,'<br>');
const plain = s => String(s ?? '').replace(/\|/g,'').replace(/\*\*/g,'');
// href attribute — escape quotes/brackets so user URLs can't break out of the attr.
const escAttr = s => String(s ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;')
  .replace(/</g,'&lt;').replace(/>/g,'&gt;');

// --- sections ----------------------------------------------------------------
const kickerHTML = spec.kicker
  ? `<span class="kick"><span class="dot"></span>${esc(spec.kicker)}</span>` : '';

const heroCtaHTML = (spec.heroCtaText && spec.heroCtaUrl)
  ? `<a class="btn" href="${escAttr(spec.heroCtaUrl)}">${esc(spec.heroCtaText)}</a>` : '';

const statsHTML = Array.isArray(spec.stats) && spec.stats.length
  ? `<section class="stats"><div class="wrap statgrid">${
      spec.stats.map(s => `<div class="tile">
        <div class="tnum">${rich(s.value)}</div>
        <div class="tlab">${esc(s.label)}</div>
      </div>`).join('')
    }</div></section>` : '';

const sectionsHTML = Array.isArray(spec.sections) && spec.sections.length
  ? `<section class="sections"><div class="wrap secgrid">${
      spec.sections.map(sec => {
        const bullets = Array.isArray(sec.bullets) && sec.bullets.length
          ? `<ul class="bullets">${sec.bullets.map(b =>
              `<li><span class="ck">&#10003;</span><span>${rich(b)}</span></li>`).join('')}</ul>` : '';
        const para = sec.p ? `<p class="sp">${rich(sec.p)}</p>` : '';
        return `<article class="card">
          ${sec.h ? `<h2>${rich(sec.h)}</h2>` : ''}
          ${para}${bullets}
        </article>`;
      }).join('')
    }</div></section>` : '';

const ctaBandHTML = (spec.ctaText && spec.ctaUrl)
  ? `<section class="ctaband"><div class="wrap ctainner">
      <div class="ctatx">${rich(spec.ctaText)}</div>
      <a class="btn big" href="${escAttr(spec.ctaUrl)}">${esc(spec.ctaText)}</a>
    </div></section>` : '';

const footerText = spec.footer !== undefined ? spec.footer : brand.footer;
const brandName = esc(brand.name || 'Brand');
const brandMark = LOGO
  ? `<img class="logo" src="${LOGO}" alt="${escAttr(brand.name || '')}">`
  : `<span class="wordmark">${brandName}</span>`;

const pageTitle = plain(spec.headline).replace(/\n/g,' ').trim().slice(0,70) || brandName;

// --- document ----------------------------------------------------------------
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pageTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root{
  --bg:${C.bg};--bg2:${C.bg2};--accent:${C.accent};--accent2:${C.accent2};
  --text:${C.text};--muted:${C.muted};--dim:${C.dim||C.muted};
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{
  font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  color:var(--text);line-height:1.5;-webkit-font-smoothing:antialiased;
  background:
    radial-gradient(120% 70% at 50% -8%, rgba(20,195,235,.16), transparent 60%),
    radial-gradient(90% 60% at 100% 0%, rgba(26,213,255,.08), transparent 55%),
    linear-gradient(180deg,var(--bg) 0%,var(--bg2) 100%);
  background-attachment:fixed;background-color:var(--bg);
  min-height:100vh;overflow-x:hidden;
}
a{color:inherit;text-decoration:none}
.wrap{width:100%;max-width:1080px;margin:0 auto;padding:0 24px}
.hl{color:var(--accent)}
b{font-weight:800;color:var(--text)}

/* header */
.site{padding:26px 0}
.site .wrap{display:flex;align-items:center;justify-content:space-between}
.logo{height:38px;width:auto;display:block;filter:drop-shadow(0 4px 16px rgba(0,0,0,.5))}
.wordmark{font-weight:900;font-size:22px;letter-spacing:.4px;color:var(--text)}

/* buttons */
.btn{
  display:inline-block;font-weight:800;font-size:17px;letter-spacing:.2px;color:var(--bg);
  padding:15px 30px;border-radius:14px;
  background:linear-gradient(135deg,var(--accent),var(--accent2));
  box-shadow:0 10px 30px rgba(20,195,235,.35);transition:transform .15s ease,box-shadow .15s ease}
.btn:hover{transform:translateY(-2px);box-shadow:0 14px 38px rgba(20,195,235,.5)}
.btn.big{font-size:19px;padding:18px 40px}

/* hero */
.hero{padding:56px 0 64px}
.kick{display:inline-flex;align-items:center;gap:10px;font-weight:700;font-size:13px;
  letter-spacing:2.5px;text-transform:uppercase;color:var(--accent);
  padding:9px 18px;border:1.5px solid rgba(20,195,235,.4);border-radius:100px;
  background:rgba(10,23,46,.5);margin-bottom:26px}
.dot{width:9px;height:9px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px var(--accent)}
.hero h1{font-weight:900;font-size:clamp(38px,7vw,76px);line-height:1.02;letter-spacing:-1.5px;
  max-width:16ch}
.hero .sub{margin-top:24px;font-weight:500;font-size:clamp(18px,2.4vw,23px);line-height:1.55;
  color:var(--muted);max-width:56ch}
.hero .sub b{color:var(--text)}
.hero .cta{margin-top:38px}

/* stats */
.stats{padding:8px 0 40px}
.statgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:22px}
.tile{padding:34px 28px;border-radius:20px;border:1px solid rgba(20,195,235,.18);
  background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02))}
.tnum{font-weight:900;font-size:clamp(40px,5vw,58px);line-height:1;letter-spacing:-1.5px;
  background:linear-gradient(180deg,var(--text),var(--accent));
  -webkit-background-clip:text;background-clip:text;color:transparent}
.tlab{margin-top:12px;font-weight:600;font-size:15px;letter-spacing:.3px;color:var(--dim);
  text-transform:uppercase}

/* content sections */
.sections{padding:48px 0}
.secgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:26px}
.card{padding:38px 34px;border-radius:22px;border:1px solid rgba(255,255,255,.08);
  background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015));
  box-shadow:0 18px 50px rgba(3,8,20,.35)}
.card h2{font-weight:800;font-size:clamp(24px,3vw,30px);line-height:1.15;letter-spacing:-.5px}
.card .sp{margin-top:16px;font-size:17px;line-height:1.65;color:var(--muted)}
.bullets{list-style:none;margin-top:20px;display:flex;flex-direction:column;gap:14px}
.bullets li{display:flex;align-items:flex-start;gap:14px;font-size:17px;line-height:1.5;color:var(--muted)}
.bullets .ck{flex:0 0 auto;width:28px;height:28px;border-radius:8px;display:grid;place-items:center;
  font-size:15px;font-weight:900;color:var(--bg);
  background:linear-gradient(135deg,var(--accent),var(--accent2));box-shadow:0 4px 14px rgba(20,195,235,.4)}

/* closing cta */
.ctaband{padding:40px 0 64px}
.ctainner{border-radius:26px;padding:56px 44px;text-align:center;
  border:1px solid rgba(20,195,235,.35);
  background:
    radial-gradient(120% 140% at 50% 0%, rgba(20,195,235,.18), transparent 60%),
    linear-gradient(180deg,rgba(10,23,46,.7),rgba(7,15,29,.7))}
.ctatx{font-weight:900;font-size:clamp(26px,4vw,42px);line-height:1.1;letter-spacing:-1px;
  max-width:20ch;margin:0 auto 30px}

/* footer */
.foot{padding:34px 0 48px;border-top:1px solid rgba(255,255,255,.07)}
.foot .wrap{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
.foot .name{font-weight:800;font-size:15px;color:var(--dim)}
.foot .tag{font-weight:800;font-size:14px;letter-spacing:3px;text-transform:uppercase;color:var(--text);opacity:.9}
.foot .tag .hl{color:var(--accent)}

@media (max-width:720px){
  .wrap{padding:0 16px}
  .hero{padding:40px 0 48px}
  .card{padding:30px 24px}
  .ctainner{padding:44px 24px}
  .foot .wrap{flex-direction:column;align-items:flex-start}
}
</style>
</head>
<body>
<header class="site"><div class="wrap">
  ${brandMark}
  ${heroCtaHTML ? `<a class="btn" href="${escAttr(spec.heroCtaUrl)}">${esc(spec.heroCtaText)}</a>` : ''}
</div></header>

<main>
  <section class="hero"><div class="wrap">
    ${kickerHTML}
    <h1>${rich(spec.headline)}</h1>
    ${spec.subhead ? `<p class="sub">${rich(spec.subhead)}</p>` : ''}
    ${heroCtaHTML ? `<div class="cta">${heroCtaHTML}</div>` : ''}
  </div></section>

  ${statsHTML}
  ${sectionsHTML}
  ${ctaBandHTML}
</main>

<footer class="foot"><div class="wrap">
  <span class="name">&copy; ${new Date().getFullYear()} ${brandName}</span>
  ${footerText ? `<span class="tag">${rich(footerText)}</span>` : ''}
</div></footer>
</body>
</html>`;

// --- write -------------------------------------------------------------------
const slug = plain(spec.headline).toLowerCase()
  .replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60) || 'landing';
const name = spec.out || slug;
const outDir = R('landing');
mkdirSync(outDir, { recursive: true });
const outFile = `${outDir}/${name}.html`;
writeFileSync(outFile, html);
console.log(JSON.stringify({ name, file: outFile, bytes: Buffer.byteLength(html) }));
