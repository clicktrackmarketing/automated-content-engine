#!/usr/bin/env node
// Topic engine — dequeue the next N topics for a client and hand them to the
// batch flow. Reads the client's ranked queue, skips anything already used,
// marks the picks as used, and writes a topic-plan.json that /graphic-machine
// turns into a full batch (specs + captions).
//
//   node tools/topic-next.mjs <client> [--count N] [--start YYYY-MM-DD] [--batch NAME]
//
// Files (in brand/clients/<client>/):
//   topics.queue.json  { client, generatedAt, topics:[{id,title,angle,format,pillar,hook,link,priority,status}] }
//   topics.used.json   { used:[{id,title,usedAt,batch}] }   (created/updated here)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const slug = args[0];
if (!slug || slug.startsWith('--')) { console.error('usage: topic-next.mjs <client> [--count N] [--start YYYY-MM-DD] [--batch NAME]'); process.exit(1); }
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i+1] ? args[i+1] : def; };
const COUNT = parseInt(opt('count', '5'), 10);

const CLIENT_DIR = resolve(REPO, 'brand/clients', slug);
const cfgPath = join(CLIENT_DIR, 'client.json');
if (!existsSync(cfgPath)) { console.error(`client not found: ${cfgPath} (run tools/init-client.sh ${slug})`); process.exit(1); }
const client = JSON.parse(readFileSync(cfgPath, 'utf8'));

const queuePath = join(CLIENT_DIR, 'topics.queue.json');
if (!existsSync(queuePath)) { console.error(`no topic queue: ${queuePath}\nRun /topic-queue --client ${slug} to generate one first.`); process.exit(1); }
const queue = JSON.parse(readFileSync(queuePath, 'utf8'));

const usedPath = join(CLIENT_DIR, 'topics.used.json');
const usedLog = existsSync(usedPath) ? JSON.parse(readFileSync(usedPath, 'utf8')) : { used: [] };
const usedIds = new Set((usedLog.used || []).map(u => u.id));

// Eligible = not used and not already marked used in the queue. Order by
// priority (desc), then original queue order (stable).
const topics = (queue.topics || []);
const eligible = topics
  .map((t, i) => ({ t, i }))
  .filter(({ t }) => t.status !== 'used' && !usedIds.has(t.id))
  .sort((a, b) => (Number(b.t.priority || 0) - Number(a.t.priority || 0)) || (a.i - b.i))
  .slice(0, COUNT)
  .map(({ t }) => t);

if (eligible.length === 0) {
  console.error(`No unused topics left in the queue for "${slug}". Run /topic-queue --client ${slug} to refresh it.`);
  process.exit(2);
}

const today = new Date().toISOString().slice(0, 10);
const startDate = opt('start', '');
const batchName = opt('batch', `graphics-batch-${today}`);

// Mark picks used: in the queue and in the used log.
const pickedIds = new Set(eligible.map(t => t.id));
for (const t of topics) if (pickedIds.has(t.id)) t.status = 'used';
writeFileSync(queuePath, JSON.stringify(queue, null, 2));
for (const t of eligible) usedLog.used.push({ id: t.id, title: t.title, usedAt: new Date().toISOString(), batch: batchName });
writeFileSync(usedPath, JSON.stringify(usedLog, null, 2));

// Write the plan for /graphic-machine to author specs + captions from.
const planItems = eligible.map(t => ({
  id: t.id,
  title: t.title,
  format: t.format === 'carousel' ? 'carousel' : 'graphic',
  pillar: t.pillar || '',
  angle: t.angle || '',
  hook: t.hook || '',
  link: t.link || client.defaultLink || '',
}));
const plan = {
  client: slug,
  batch: batchName,
  startDate: startDate || null,
  timezone: client.timezone || 'America/Los_Angeles',
  platforms: client.platforms || ['instagram', 'facebook', 'linkedin', 'gbp'],
  topics: planItems,
};
const outDir = join(REPO, 'output', `gm-${today}`);
mkdirSync(outDir, { recursive: true });
const planPath = join(outDir, 'topic-plan.json');
writeFileSync(planPath, JSON.stringify(plan, null, 2));

console.log(JSON.stringify({ client: slug, picked: planItems.length, remaining: topics.filter(t => t.status !== 'used').length, plan: planPath }, null, 2));
for (const t of planItems) console.log(`  • [${t.format}] ${t.title}  (${t.pillar || t.angle})`);
