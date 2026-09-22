#!/usr/bin/env node
// notebook-topics.mjs — pull grounded topic ideas from a Google NotebookLM
// (Gemini Notebook) notebook via the `nlm` CLI, and emit them as structured
// candidates the Topics engine can rank and queue.
//
// This is the "client research docs" source for /topic-queue. It is an OPTIONAL
// feed: `nlm` is an unofficial, cookie-authed tool (see the notebooklm-mcp
// memory) that breaks when its Google cookies expire, so this script fails
// soft — it prints a clear notice and exits non-zero WITHOUT throwing, and
// /topic-queue carries on with its other sources (past winners, brand, SEO).
//
//   node tools/notebook-topics.mjs --client ctm [--n 8] [--json]
//   node tools/notebook-topics.mjs --notebook <id> [--n 8] [--json] [--prompt "..."]
//
// Resolves the notebook id from brand/clients/<slug>/client.json ("notebookLM")
// when --client is given. Auth/setup: `nlm login` (the user's Google login).

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const has = (n) => args.includes(`--${n}`);

const client = opt('client', null);
let notebook = opt('notebook', null);
const n = parseInt(opt('n', '8'), 10);
const asJson = has('json');

// nlm installs to ~/.local/bin; make sure a spawned process can find it.
const PATH = `${process.env.HOME}/.local/bin:/opt/homebrew/bin:${process.env.PATH || ''}`;
const env = { ...process.env, PATH };

function fail(msg, soft = true) {
  process.stderr.write(`\n[notebook-topics] ${msg}\n`);
  process.exit(soft ? 2 : 1);   // 2 = soft (feed unavailable), caller continues
}

// Resolve notebook id from the client pack when --client is used.
let clientName = null;
if (client && !notebook) {
  const cfg = join(REPO, 'brand/clients', client, 'client.json');
  if (!existsSync(cfg)) fail(`client not found: ${cfg}`, false);
  const c = JSON.parse(readFileSync(cfg, 'utf8'));
  clientName = c.name || client;
  notebook = c.notebookLM || (c.notebookLM && c.notebookLM.id) || null;
  if (!notebook) fail(`client "${client}" has no "notebookLM" notebook id in client.json — add one (nlm notebook list) or pass --notebook <id>.`);
}
if (!notebook) fail('need --client <slug> (with notebookLM set) or --notebook <id>', false);

const prompt = opt('prompt',
  `Based ONLY on the sources in this notebook, propose ${n} specific, non-overlapping content topic ideas a marketing team could turn into social posts. ` +
  `Favor concrete angles tied to real details, offers, proof points, and audience pains found in the sources. ` +
  `Return ONLY a fenced \`\`\`json code block containing an array of objects with keys: ` +
  `"title" (punchy, <=70 chars), "angle" (one sentence), "pillar" (one of: education, proof, offer, story, news), "support" (the source detail that grounds it). No prose outside the code block.`);

// Run the query via the nlm CLI.
let out;
try {
  out = execFileSync('nlm', ['notebook', 'query', notebook, prompt, '--json', '--timeout', '180'], { env, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
} catch (e) {
  const stderr = (e.stderr || '').toString();
  if (/auth|login|cookie|credential|profile not found/i.test(stderr)) fail('NotebookLM auth invalid/expired. Run `nlm login` to re-authenticate, then retry.');
  fail(`nlm query failed: ${stderr.slice(-400) || e.message}`);
}

let payload;
try { payload = JSON.parse(out); } catch { fail('could not parse nlm JSON output'); }
const answer = payload.answer || '';

// Extract the fenced JSON array of topics; fall back to raw answer.
function extractTopics(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1] : text;
  try {
    const arr = JSON.parse(raw.trim());
    if (Array.isArray(arr)) return arr;
  } catch {}
  // Fallback: pull a bracketed array substring.
  const b = raw.indexOf('['), e = raw.lastIndexOf(']');
  if (b >= 0 && e > b) { try { const arr = JSON.parse(raw.slice(b, e + 1)); if (Array.isArray(arr)) return arr; } catch {} }
  return null;
}

const topics = extractTopics(answer);
const result = {
  source: 'notebooklm',
  notebook,
  client: client || null,
  clientName,
  count: topics ? topics.length : 0,
  topics: topics || [],
  citations: payload.sources_used || [],
  rawAnswer: topics ? undefined : answer,   // keep raw only if parsing failed
};

if (asJson) { process.stdout.write(JSON.stringify(result, null, 2) + '\n'); process.exit(0); }

// Human-readable.
if (!topics) { process.stdout.write(`\nNotebookLM returned an answer but not parseable JSON. Raw:\n\n${answer}\n`); process.exit(0); }
process.stdout.write(`\n${topics.length} topic idea(s) from NotebookLM${clientName ? ` for ${clientName}` : ''} (notebook ${notebook.slice(0, 8)}…):\n\n`);
topics.forEach((t, i) => {
  process.stdout.write(`${i + 1}. ${t.title}${t.pillar ? `  [${t.pillar}]` : ''}\n   ${t.angle || ''}\n${t.support ? `   ↳ ${t.support}\n` : ''}\n`);
});
