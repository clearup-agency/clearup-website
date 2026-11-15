import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/* Mohamed's laptop notes + decisions, Nov 9, 2026 */
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('service cards and the marketing groups show no 01–05 numbers', () => {
  assert.doesNotMatch(src('src/components/Offerings.tsx'), /0\{i \+ 1\}/);
  assert.doesNotMatch(src('src/components/Services.tsx'), /0\{i \+ 1\}/);
});

test('«احجز مكالمة وضوح» lands on the booking form (#book) when it points at the Contact page', () => {
  assert.match(src('src/lib/view.ts'), /links\.contact \+ '#book'/);
  assert.match(src('src/components/pages/CtaBand.tsx'), /d\.links\?\.book/);
});

test('growth path (Nov 15): on a laptop the steps appear in order, 1 → 5, while the section is held on screen', () => {
  const p = src('src/components/Process.tsx');
  assert.match(p, /proc--pin/);
  assert.match(p, /-r\.top \/ Math\.max\(1, r\.height - vh\)/);
  assert.match(p, /el\.scrollHeight <= window\.innerHeight - 96/, 'held only when the whole section fits the screen');
  const css = src('src/app/globals.css');
  assert.match(css, /\.proc--pin \.proc__pin \{ position: sticky; top: 0;/);
  assert.match(css, /\.gp\.is-drawn \.gp__item:not\(\.is-lit\) \.gp__card,[\s\S]*?\{ opacity: 0;/, 'a step not reached yet does not show');
});

// the hero clip's centred laptop player was replaced on Nov 11, 2026 by the big 9:16 intro card (hero-landing-nov11.test.mjs)
