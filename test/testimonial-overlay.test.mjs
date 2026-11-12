import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Nov 9, 2026 — Mohamed: on a phone the testimonial video card filled the whole screen, so the «عملاؤنا يحكون»
// heading was never on screen with it. The name/role/line now sit over the bottom of the video, and the phone card is smaller.
const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
const proof = readFileSync(new URL('../src/components/pages/Proof.tsx', import.meta.url), 'utf8') + readFileSync(new URL('../src/components/pages/TestimonialCard.tsx', import.meta.url), 'utf8');

test('testimonial card: client info is an overlay on the bottom of the video', () => {
  assert.match(css, /\.tvcard \{[^}]*position: relative/);
  assert.match(css, /\.tvcard__body \{[^}]*position: absolute[^}]*bottom: 0[^}]*linear-gradient\(to top/);
  assert.match(proof, /className="tvcard__vid"/);
  assert.match(proof, /className="tvcard__body"/);
});

test('the overlay never blocks the video: only its link/button take taps', () => {
  assert.match(css, /\.tvcard__body \{[^}]*pointer-events: none/);
  assert.match(css, /\.tvcard__body :is\(a, button\), \.tvcard \.tstory \{ pointer-events: auto; \}/);
});

test('phones: a smaller 3:4 card about two thirds of the screen wide', () => {
  const m = css.match(/@media \(max-width: 760px\) \{\n  \.tvcards \{[\s\S]*?\n\}/);
  assert.ok(m, 'phone block for testimonial cards');
  assert.match(m[0], /grid-auto-columns: min\(64%, 250px\)/);
  assert.match(m[0], /\.tvcard__vid \{ aspect-ratio: 3 \/ 4; \}/);
  assert.doesNotMatch(css, /grid-auto-columns: 84%/);
});
