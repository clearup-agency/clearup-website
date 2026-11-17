import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Nov 17, 2026: the Home services cards (01–05) follow the reading direction — Arabic right → left, English left → right
test('services cards and their little step bars follow the page direction', () => {
  const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /html\[dir="rtl"\] \.offer--steps \.offer__grid \{ direction: ltr; \}/);
  assert.doesNotMatch(css, /html\[dir="ltr"\] \.offer--steps \.offer__grid \{ direction: rtl; \}/);
  assert.doesNotMatch(css, /\.ocard__steps \{[^}]*direction: ltr/);
});
