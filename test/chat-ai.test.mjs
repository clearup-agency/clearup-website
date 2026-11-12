import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';
// The chatbot's optional AI mode: grounded prompt, per-visitor limits, answer clean-up, provider choice.
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/'); // not URL.pathname: that is /D:/... on Windows
const out = path.join(mkdtempSync(path.join(tmpdir(), 'cu-ai-')), 'ai.mjs');
buildSync({ stdin: { contents: "export * from './src/lib/chat-ai.ts';", resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, logLevel: 'silent' });
const { systemPrompt, makeLimiter, cleanAnswer, provider, HANDOFF } = await import(pathToFileURL(out).href);

test('the prompt grounds the model on the site only, in the page language', () => {
  const ar = systemPrompt('ar', 'CTX-TEXT');
  assert.match(ar, /ONLY from the CONTEXT/);
  assert.match(ar, /Arabic/);
  assert.match(ar, new RegExp(HANDOFF));
  assert.ok(ar.endsWith('CTX-TEXT'));
  assert.match(systemPrompt('en', ''), /Reply in English/);
});

test('limiter: 10 a minute and 100 a day per visitor, and a daily ceiling for everyone', () => {
  const lim = makeLimiter(10, 100, 150);
  const t0 = Date.parse('2026-11-01T10:00:00Z');
  for (let i = 0; i < 10; i++) assert.equal(lim('a', t0 + i).ok, true);
  assert.deepEqual(lim('a', t0 + 20), { ok: false, reason: 'minute' });
  assert.equal(lim('b', t0 + 20).ok, true); // someone else isn't affected
  let t = t0 + 61_000;
  for (let i = 0; i < 90; i++) { assert.equal(lim('a', t).ok, true); t += 7_000; }
  assert.deepEqual(lim('a', t + 61_000), { ok: false, reason: 'day' });
  for (let i = 0; i < 49; i++) lim('ip' + i, t);
  assert.deepEqual(lim('new', t), { ok: false, reason: 'global' });
  assert.equal(lim('new', Date.parse('2026-11-02T00:00:01Z')).ok, true); // a new day
});

test('answers: plain text; a hand-off or a [placeholder] means "use the WhatsApp fallback"', () => {
  assert.equal(cleanAnswer('**Yes** — we do.'), 'Yes — we do.');
  assert.equal(cleanAnswer('HANDOFF'), null);
  assert.equal(cleanAnswer('Sorry. HANDOFF'), null);
  assert.equal(cleanAnswer('Our price is [price range].'), null);
  assert.equal(cleanAnswer(''), null);
  assert.equal(cleanAnswer(undefined), null);
});

test('no key → no AI; Gemini preferred over Groq', () => {
  assert.equal(provider({}), null);
  assert.equal(provider({ GROQ_API_KEY: 'x' }).name, 'groq');
  assert.equal(provider({ GEMINI_API_KEY: 'x', GROQ_API_KEY: 'y' }).name, 'gemini');
});
