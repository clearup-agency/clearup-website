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

test('growth path (Nov 17, proposal 2): a level line with growth bars; the steps light up in order, 1 → n', () => {
  const p = src('src/components/Process.tsx');
  assert.doesNotMatch(p, /proc--pin|padding-top: calc\(/, 'no pinned section, no staircase');
  assert.match(p, /className="gp__bar"/);
  assert.match(p, /if \(shown >= seen\.current\) return;\s*shown \+= 1;/, 'one step at a time, never past the furthest seen');
  const css = src('src/app/globals.css');
  assert.match(css, /\.gp__bar b \{[^}]*height: calc\(\(var\(--k\) \+ 1\) \/ var\(--n\) \* 100%\)/, 'bars rise from the first step to the last');
  assert.match(css, /\.gp\.is-armed \.gp__item:not\(\.is-lit\) \.gp__card \{ opacity: 0;/, 'a step not reached yet does not show (only with JS on)');
  assert.doesNotMatch(css, /\.proc--pin/);
});

// the hero clip's centred laptop player was replaced on Nov 11, 2026 by the big 9:16 intro card (hero-landing-nov11.test.mjs)
