import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Nov 12, 2026 phone declutter (Mohamed: «مش عاجباني على الجوال حاسسها فوضى»): phones only, desktop untouched.
const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
const reveal = readFileSync(new URL('../src/components/Reveal.tsx', import.meta.url), 'utf8');
const i = css.indexOf('Phone declutter (Nov 12, 2026');
const block = css.slice(css.lastIndexOf('/*', i), css.indexOf('/* ---------- «بالأرقام»', i));

test('declutter rules live only inside phone media queries', () => {
  assert.ok(i > 0);
  const outside = block.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media \(max-width: 760px\)[^{]*\{([^{}]*\{[^{}]*\})*[^{}]*\}/g, '').trim();
  assert.equal(outside, '');
});

test('bottom bar waits for the hero buttons to scroll away, without a flash', () => {
  assert.match(block, /body:has\(\.hl__cta\) \.mbar \{[^}]*visibility: hidden/);
  assert.match(block, /html\[data-mbar-on\] body:has\(\.hl__cta\) \.mbar \{[^}]*visibility: visible/);
  assert.match(reveal, /querySelector(<HTMLElement>)?\('\.hl__cta'\)/);
  assert.match(reveal, /addEventListener\('scroll', onScroll, \{ passive: true \}\)/);
  assert.match(reveal, /data-mbar-on/);
});

test('the helper line is hidden on phones by CSS, not removed', () => {
  assert.match(block, /\.hl__note \{ display: none; \}/);
  const hero = readFileSync(new URL('../src/components/Hero.tsx', import.meta.url), 'utf8');
  assert.match(hero, /hl__note/);
});

test('v2: the bar glides and fades (transform + opacity), with hysteresis and a reduced-motion fallback', () => {
  assert.match(block, /body:has\(\.hl__cta\) \.mbar \{[^}]*opacity: 0;[^}]*transition: transform \.4s/);
  assert.match(block, /html\[data-mbar-on\] body:has\(\.hl__cta\) \.mbar \{[^}]*opacity: 1;[^}]*cubic-bezier\(\.22, 1, \.36, 1\)/);
  assert.match(block, /prefers-reduced-motion: reduce\)[\s\S]*transform: none; translate: none;/);
  assert.match(reveal, /const ON_PX = \d+;/);
  assert.match(reveal, /const OFF_PX = \d+;/);
  assert.match(reveal, /on \? bottom < OFF_PX : bottom < -ON_PX/);
});

test('v2: behind the words only the section colour, behind the video the canvas, a fade between (phones)', () => {
  assert.match(block, /\.hl__bg \{ -webkit-mask-image: linear-gradient\(to top, #000 0, #000 \d+px[^;]*transparent \d+px\);/);
  assert.match(block, /\.hl__shade \{ background: rgba\(13, 10, 24, \.79\) !important; \}/);
  assert.doesNotMatch(block, /\.hl__photos \{ opacity/);
});
