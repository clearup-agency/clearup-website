import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// AR and EN dictionaries must keep the same keys (cheap guard against a missing translation).
const keys = (src) => [...src.matchAll(/^\s{2,6}([a-zA-Z]+):/gm)].map((m) => m[1]).sort().join(',');
test('ar and en have the same top-level shape', () => {
  const ar = readFileSync(new URL('../src/content/ar.ts', import.meta.url), 'utf8');
  const en = readFileSync(new URL('../src/content/en.ts', import.meta.url), 'utf8');
  assert.equal(keys(en), keys(ar));
});
