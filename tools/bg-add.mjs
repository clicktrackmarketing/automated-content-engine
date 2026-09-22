#!/usr/bin/env node
// bg-add.mjs — register a background image into a client's curated library.
//
// Enforces the rule that makes this a LIBRARY and not a dumping folder: an
// image cannot be added without a license and a source. It appends a tagged
// entry to brand/clients/<slug>/media/backgrounds/backgrounds.json.
//
//   node tools/bg-add.mjs --client ctm --file media/backgrounds/sd-dusk.jpg \
//     --license "Unsplash License" --source https://unsplash.com/photos/xyz \
//     [--mood local] [--pillars "SEO (technical & local),AEO / AI search"] \
//     [--orientation portrait] [--scrim strong] [--focus "50% 40%"] [--credit "Jane Doe"]
//
// The image itself must already sit in brand/clients/<slug>/media/backgrounds/.
// (Images are gitignored — they stay local and out of the public repo.)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..');
const a = process.argv.slice(2);
const opt = (n, d) => { const i = a.indexOf(`--${n}`); return i >= 0 && a[i + 1] !== undefined && !String(a[i + 1]).startsWith('--') ? a[i + 1] : d; };
const die = m => { console.error(`bg-add: ${m}`); process.exit(1); };

const client = opt('client'); if (!client) die('need --client <slug>');
const file = opt('file'); if (!file) die('need --file media/backgrounds/<name> (relative to the client pack)');
const license = opt('license'); const source = opt('source');
if (!license) die('need --license (every background must be licensed — e.g. "Unsplash License", "Owned/original", "Shutterstock #123")');
if (!source) die('need --source (URL or where it came from, for an auditable trail)');

const clientDir = join(REPO, 'brand/clients', client);
if (!existsSync(join(clientDir, 'client.json'))) die(`client not found: ${clientDir}`);
const abs = resolve(clientDir, file);
if (!existsSync(abs)) die(`image not found on disk: ${abs}\n       Put the file in brand/clients/${client}/media/backgrounds/ first.`);

const manifestPath = join(clientDir, 'media/backgrounds/backgrounds.json');
let doc = { _comment: 'Curated, LICENSED background library for this client. Every entry needs license + source. Managed by tools/bg-add.mjs; selected by tools/bg-lib.mjs.', backgrounds: [] };
if (existsSync(manifestPath)) {
  try { const d = JSON.parse(readFileSync(manifestPath, 'utf8')); doc = Array.isArray(d) ? { backgrounds: d } : d; doc.backgrounds = doc.backgrounds || []; }
  catch (e) { die(`existing manifest is invalid JSON: ${e.message}`); }
}
if (doc.backgrounds.some(e => e.file === file)) die(`"${file}" is already in the library.`);

const pillars = (opt('pillars', '') || '').split(',').map(s => s.trim()).filter(Boolean);
const entry = {
  file,
  mood: opt('mood', 'texture'),
  pillars,
  orientation: opt('orientation', 'any'),
  scrim: opt('scrim', 'medium'),
  ...(opt('focus') ? { focus: opt('focus') } : {}),
  license,
  source,
  ...(opt('credit') ? { credit: opt('credit') } : {}),
  addedAt: new Date().toISOString().slice(0, 10),
};
doc.backgrounds.push(entry);
writeFileSync(manifestPath, JSON.stringify(doc, null, 2) + '\n');
console.log(`✓ Added "${file}" to ${client}'s background library (${doc.backgrounds.length} total).`);
console.log(`  ${entry.orientation} · ${entry.mood} · scrim ${entry.scrim}${pillars.length ? ' · pillars: ' + pillars.join(', ') : ''} · ${license}`);
