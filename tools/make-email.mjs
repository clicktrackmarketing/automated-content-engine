#!/usr/bin/env node
// Email-safe HTML email generator — turns a spec into an on-brand marketing
// email (HTML + plain-text). Sibling to make-graphic.mjs, but built for the
// reality of email clients (Outlook incl.): TABLE-based layout, all CSS inline,
// no web fonts, no flex/grid, dark-on-white body copy, bulletproof CTA button.
//
//   node tools/make-email.mjs <spec.json>
//
// Spec fields:
//   brand      path to graphic.brand.json (rel to the spec; colors/name/footer)
//   out        output basename
//   subject    email subject line (required)
//   preheader  preview text (optional; the snippet inboxes show)
//   kicker     small eyebrow label (optional)
//   headline   main headline (required; |accent|, **bold**, \n)
//   body       array of paragraph strings (**bold**, \n supported)
//   bullets    optional array of short strings (checkmark list)
//   ctaText    button label (optional)
//   ctaUrl     button link (optional)
//   footerName brand/sender name (default brand.name)
//   footerNote optional small print (address / unsubscribe placeholder text)
//
// Output (both written under <specdir>/email/):
//   <out>.html   — email-safe HTML
//   <out>.txt    — plain-text version
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const specPath = process.argv[2];
if (!specPath) { console.error('usage: make-email.mjs <spec.json>'); process.exit(1); }
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const base = dirname(resolve(specPath));
const R = p => resolve(base, p);

// Brand loader: resolve spec.brand relative to the spec file (mirrors make-graphic.mjs).
const brandPath = R(spec.brand || 'graphic.brand.json');
const brand = JSON.parse(readFileSync(brandPath, 'utf8'));
const C = brand.colors;

if (!spec.subject) { console.error('spec.subject is required'); process.exit(1); }
if (!spec.headline) { console.error('spec.headline is required'); process.exit(1); }

// --- helpers -----------------------------------------------------------------
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// |word| -> accent span ; **word** -> bold ; \n -> <br> (colors inline for email)
const ACCENT = C.accent;
const rich = s => esc(s)
  .split('|').map((p,i)=> i%2 ? `<span style="color:${ACCENT}">${p}</span>` : p).join('')
  .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
  .replace(/\n/g,'<br>');
// plain-text: strip |pipes| and **bold** markers, keep line breaks
const plain = s => String(s ?? '').replace(/\|/g,'').replace(/\*\*/g,'');

// Body copy is intentionally dark-on-white for readability. Brand navy is used
// only for the header bar; the accent for the headline highlight + CTA button.
const NAVY = C.bg;            // #0a172e header bar
const INK  = '#1a2b47';       // primary body ink
const INK2 = '#333333';       // secondary body ink
const PAGE = '#f4f6f9';       // light page background
const CARD = '#ffffff';       // white content card
const FONT = "Arial, Helvetica, sans-serif";

const senderName = spec.footerName || brand.name || 'Newsletter';
// Header: brand name as styled text (no webp logo — fails in Outlook). Accent 2nd word.
const nameParts = String(senderName).trim().split(/\s+/);
const headerNameHTML = nameParts.length > 1
  ? `${esc(nameParts[0])} <span style="color:${ACCENT}">${esc(nameParts.slice(1).join(' '))}</span>`
  : esc(senderName);

// --- body blocks -------------------------------------------------------------
const kickerHTML = spec.kicker ? `
              <tr>
                <td style="padding:0 0 12px 0;font-family:${FONT};font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${ACCENT};">${esc(spec.kicker)}</td>
              </tr>` : '';

const headlineHTML = `
              <tr>
                <td style="padding:0 0 20px 0;font-family:${FONT};font-size:28px;line-height:1.25;font-weight:bold;color:${INK};">${rich(spec.headline)}</td>
              </tr>`;

const bodyParas = Array.isArray(spec.body) ? spec.body : (spec.body ? [spec.body] : []);
const bodyHTML = bodyParas.map(p => `
              <tr>
                <td style="padding:0 0 16px 0;font-family:${FONT};font-size:16px;line-height:1.6;color:${INK2};">${rich(p)}</td>
              </tr>`).join('');

const bullets = Array.isArray(spec.bullets) ? spec.bullets : [];
const bulletsHTML = bullets.length ? `
              <tr>
                <td style="padding:4px 0 8px 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                    ${bullets.map(b => `<tr>
                      <td valign="top" width="28" style="padding:0 0 12px 0;font-family:${FONT};font-size:16px;line-height:1.5;color:${ACCENT};font-weight:bold;">&#10003;</td>
                      <td valign="top" style="padding:0 0 12px 0;font-family:${FONT};font-size:16px;line-height:1.5;color:${INK2};">${rich(b)}</td>
                    </tr>`).join('\n                    ')}
                  </table>
                </td>
              </tr>` : '';

// Bulletproof CTA: padded <a> with inline background (works without bg images).
const ctaHTML = (spec.ctaText && spec.ctaUrl) ? `
              <tr>
                <td style="padding:14px 0 6px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
                    <tr>
                      <td align="center" bgcolor="${ACCENT}" style="border-radius:6px;background-color:${ACCENT};">
                        <a href="${esc(spec.ctaUrl)}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:${FONT};font-size:16px;font-weight:bold;line-height:1;color:#ffffff;text-decoration:none;border-radius:6px;background-color:${ACCENT};">${esc(spec.ctaText)}</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>` : '';

const footerNoteHTML = spec.footerNote ? `
              <tr>
                <td style="padding:8px 0 0 0;font-family:${FONT};font-size:12px;line-height:1.5;color:#8a97a8;">${rich(spec.footerNote)}</td>
              </tr>` : '';

// Preheader: hidden preview-text span at the very top of the body.
const preheaderHTML = spec.preheader
  ? `<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${PAGE};opacity:0;">${esc(spec.preheader)}</span>`
  : '';

// --- assemble HTML -----------------------------------------------------------
const html = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${esc(spec.subject)}</title>
<style>
  @media only screen and (max-width:620px){
    .container{width:100% !important;}
    .px{padding-left:24px !important;padding-right:24px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${PAGE};">
${preheaderHTML}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:${PAGE};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;border-collapse:collapse;background-color:${CARD};border-radius:10px;overflow:hidden;">
        <!-- header bar -->
        <tr>
          <td align="center" bgcolor="${NAVY}" style="background-color:${NAVY};padding:26px 24px;font-family:${FONT};font-size:22px;font-weight:bold;letter-spacing:1px;color:#ffffff;text-transform:uppercase;">${headerNameHTML}</td>
        </tr>
        <!-- accent divider -->
        <tr><td style="height:4px;line-height:4px;font-size:4px;background-color:${ACCENT};">&nbsp;</td></tr>
        <!-- content -->
        <tr>
          <td class="px" style="padding:36px 40px 32px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${kickerHTML}${headlineHTML}${bodyHTML}${bulletsHTML}${ctaHTML}
            </table>
          </td>
        </tr>
        <!-- footer -->
        <tr>
          <td class="px" bgcolor="${PAGE}" style="background-color:${PAGE};padding:24px 40px;border-top:1px solid #e3e8ef;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td style="font-family:${FONT};font-size:13px;line-height:1.5;color:${INK};font-weight:bold;">${esc(senderName)}</td>
              </tr>${footerNoteHTML}
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

// --- assemble plain text -----------------------------------------------------
const txtLines = [];
if (spec.preheader) txtLines.push(plain(spec.preheader), '');
if (spec.kicker) txtLines.push(plain(spec.kicker).toUpperCase());
txtLines.push(plain(spec.headline));
txtLines.push('');
for (const p of bodyParas) { txtLines.push(plain(p)); txtLines.push(''); }
if (bullets.length) { for (const b of bullets) txtLines.push(`- ${plain(b)}`); txtLines.push(''); }
if (spec.ctaText && spec.ctaUrl) { txtLines.push(`${plain(spec.ctaText)}: ${spec.ctaUrl}`); txtLines.push(''); }
txtLines.push('--');
txtLines.push(senderName);
if (spec.footerNote) txtLines.push(plain(spec.footerNote));
const txt = txtLines.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';

// --- write -------------------------------------------------------------------
const name = spec.out || 'email';
const outDir = R('email');
mkdirSync(outDir, { recursive: true });
const htmlPath = `${outDir}/${name}.html`;
const txtPath = `${outDir}/${name}.txt`;
writeFileSync(htmlPath, html);
writeFileSync(txtPath, txt);
console.log(JSON.stringify({ name, html: htmlPath, txt: txtPath, subject: spec.subject }));
