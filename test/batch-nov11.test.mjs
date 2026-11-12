import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Nov 11, 2026 — Mohamed's batch (voice note 2:46 PM)
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('testimonial videos open true full screen inside the click (iPhone: webkitEnterFullscreen), one VideoPlayer', () => {
  const vp = read('src/components/VideoPlayer.tsx');
  assert.match(vp, /requestFullscreen/);
  assert.match(vp, /webkitEnterFullscreen/);
  assert.match(read('src/components/pages/TestimonialCard.tsx'), /<VideoPlayer[^>]*\bfullscreen\b/);
});

test('the five services reuse the ONE sticky scroll (StageScroll) — no copy of the six-stage component', () => {
  const sys = read('src/components/System.tsx');
  assert.match(sys, /export function StageScroll/);
  assert.match(sys, /export function ServicesScroll[\s\S]*<StageScroll/);
  assert.match(sys, /export default function System[\s\S]*<StageScroll/);
  assert.match(read('src/components/Offerings.tsx'), /s\.scroll\) return <ServicesScroll/);
});

test('admin: the new switches and the booking link are fields', () => {
  const sch = JSON.parse(read('src/admin/schema.json'));
  const sec = (n) => sch.sections.find((s) => s.name === n).fields.map((f) => f.name);
  assert.ok(sec('offeringsSection').includes('scroll'));
  assert.ok(sec('problemSection').includes('turnHidden'));
  assert.ok(sch.settings.fields.some((f) => f.name === 'bookingUrl'));
  assert.match(read('src/lib/view.ts'), /bookingUrl[\s\S]*nav\.ctaHref = links\.book = bookingUrl/);
  assert.match(read('src/components/Pain.tsx'), /turnHidden/);
});

test('data script hides, never deletes', () => {
  const s = read('scripts/batch-nov11.mjs');
  assert.doesNotMatch(s, /\bdelete from\b/i);
  assert.match(s, /hidden = \$2/);
});
