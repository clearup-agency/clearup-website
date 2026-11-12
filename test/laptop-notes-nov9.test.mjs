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

test('growth path: on a laptop every step is lit while the title is still on screen', () => {
  assert.match(src('src/components/Process.tsx'), /vh \* 0\.92/);
});

// the hero clip's centred laptop player was replaced on Nov 11, 2026 by the big 9:16 intro card (hero-landing-nov11.test.mjs)
