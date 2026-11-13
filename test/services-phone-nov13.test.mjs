import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Nov 13, 2026 (Mohamed): on phones the services stay pinned with their video, the four parts sit two by two,
// and the text scales down until the whole service fits the pinned screen
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('services scroll stays pinned on phones and its text fits', () => {
  const sys = read('src/components/System.tsx');
  assert.match(sys, /className="system--svc" fit /);
  assert.match(sys, /el\.scrollHeight > el\.clientHeight \+ 1 && f > 0\.6/);
  assert.doesNotMatch(sys, /system--list/);
  const css = read('src/app/globals.css');
  assert.match(css, /\.system--svc \.stage__grid \{ grid-template-columns: 1fr 1fr; gap: 0 14px; \}/);
  assert.match(css, /\.system--svc \.stage \{ font-size: calc\(16px \* var\(--fit, 1\)\)/);
});
