import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Mohamed, Nov 11, 3:41 PM: no automatic colour rhythm — each section shows its own «لون القسم»
test('each section keeps its own colour: the band comes from its «لون القسم», no page-wide rule', () => {
  const sx = read('../src/components/Sections.tsx');
  assert.match(sx, /const tone = toneOf\(data\.design\);/);
  assert.doesNotMatch(sx, /rhythm|pageTones/);
  assert.equal(existsSync(new URL('../src/lib/rhythm.ts', import.meta.url)), false);
});

test('publish script sets the colours Mohamed listed, idempotently', () => {
  const s = read('../scripts/batch-nov11.mjs');
  for (const want of ["['home', 'problemSection', { tone: 'light' }]", "['home', 'toolsSection', { tone: 'light' }]",
    "['services', 'auditSection', { tone: 'light' }]", "['services', 'toolsSection', { tone: 'light', bg: '#F1EAF8' }]"]) assert.ok(s.includes(want), want);
  assert.match(s, /every\(\(\[k, v\]\) => d\[k\] === v\)\) continue;/);
});

test('Services growth path: the whole line is purple', () => {
  assert.match(read('../src/app/globals.css'), /\.pg--services \.proc[^{]*\.gp__rail \{ stroke: color-mix\(in srgb, var\(--purple\)/);
});
