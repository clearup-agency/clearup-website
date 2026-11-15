import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Nov 15, 2026: the free-plan «Powered by Netlify» badge frame stays hidden (only the frame; Netlify's script untouched)
test('the Netlify badge frame is hidden', () => {
  const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /#nl-badge-frame, iframe\[id\^="nl-badge"\] \{ display: none !important; \}/);
});
