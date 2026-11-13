import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Nov 13, 2026 — on phones the services' full text was cut off by the pinned (100svh) screen
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('phones get every service one under the other (not pinned), desktop keeps the sticky scroll', () => {
  const sys = read('src/components/System.tsx');
  assert.match(sys, /matchMedia\('\(max-width: 760px\)'\)/);
  assert.match(sys, /if \(phone\) return \([\s\S]*system--list[\s\S]*items\.map\(\(it, k\) => <div className="stage" id=\{ids\[k\]\}/);
  assert.match(sys, /export function ServicesScroll[\s\S]*<StageScroll/);
  const css = read('src/app/globals.css');
  assert.match(css, /\.system--list \{ height: auto;/);
});
