import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

// Nov 11, 2026 (the client's note via Mohamed): the hero becomes a landing hero — the animated logo is gone, the
// intro video is a 9:16 card beside the text, behind both the 9 Business Model Canvas blocks as photos under a dark
// purple layer; the numbers right after it are large cards that count up once in view.
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const css = read('../src/app/globals.css');
const hero = read('../src/components/Hero.tsx');
const clip = read('../src/components/ClipCard.tsx');
const strip = read('../src/components/StatsStrip.tsx');
const count = read('../src/components/StatCount.tsx');
const schema = JSON.parse(read('../src/admin/schema.json'));
const section = (n) => schema.sections.find((s) => s.name === n);

test('hero: no animated logo; the intro video is the one video component; 9 canvas blocks with placeholders', () => {
  assert.ok(!existsSync(new URL('../src/components/HeroMotion.tsx', import.meta.url)), 'HeroMotion is deleted');
  assert.doesNotMatch(hero, /mk__|HeroMotion|<video |<iframe /);
  assert.match(hero, /<ClipCard d=\{d\} \/>/);
  assert.match(clip, /<VideoPlayer variant="clip"/);
  const areas = [...hero.matchAll(/area: '(\w\w)', key: '(\w+)'/g)].map((m) => m[2]);
  assert.equal(areas.length, 9);
  for (const k of areas) for (const w of [400, 800]) assert.ok(existsSync(new URL(`../public/hero-canvas/${k}-${w}.webp`, import.meta.url)), k + w);
  assert.match(css, /grid-template-areas: "kp kp ka ka vp vp cr cr cs cs" "kp kp kr kr vp vp ch ch cs cs" "co co co co co re re re re re"/);
  assert.doesNotMatch(css, /\.mk__|\.hx__|hero__foot|clip__scrim/, 'the old hero CSS is gone');
});

test('hero admin: canvas photos and the poster frame are optional fields (placeholders stay the default)', () => {
  const h = section('heroSection');
  const canvas = h.fields.find((f) => f.name === 'canvas');
  assert.equal(canvas.type, 'array');
  assert.deepEqual(canvas.of[0].fields.map((f) => f.name), ['image']); // option A: no labels on the blocks
  const posterAt = h.fields.find((f) => f.name === 'clip').fields.find((f) => f.name === 'posterAt');
  assert.equal(posterAt.type, 'number');
  assert.match(clip, /export const POSTER_AT = 12\.6;/);
});

test('numbers: 4 big cards (2 × 2 on a phone), the 4th a pending placeholder the admin can replace or switch off', () => {
  assert.match(strip, /items\.length === 3 && s\.placeholder4 !== false/);
  assert.match(strip, /'نتائج تُقاس، لا وعود تُقال'/);
  assert.match(css, /\.xstats__grid \{ display: grid; grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 1080px\) \{ \.xstats__grid, \.xstats__grid--3 \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  const st = section('statsSection');
  assert.ok(st.fields.find((f) => f.name === 'placeholder4'));
  assert.ok(!st.fields.find((f) => f.name === 'items').of[0].fields.find((f) => f.name === 'icon'), 'option A: no icons');
});

test('count-up: once in view, never for reduced motion, the finished figure holds the width', () => {
  assert.match(count, /prefers-reduced-motion: reduce/);
  assert.match(count, /new IntersectionObserver/);
  assert.match(count, /className="cnt__w" aria-hidden="true"/);
  assert.match(count, /className="sr-only">\{value\}/);
  assert.match(css, /\.cnt__w \{ visibility: hidden; \}/);
});

test('count-up: figures split into signs and digits and come back formatted the same', async () => {
  const mod = await import('../src/lib/figures.ts');
  assert.deepEqual(mod.splitFigure('+1,200'), { pre: '+', num: 1200, dec: 0, comma: true, post: '' });
  assert.deepEqual(mod.splitFigure('164%'), { pre: '', num: 164, dec: 0, comma: false, post: '%' });
  assert.deepEqual(mod.splitFigure('$4.7M+'), { pre: '$', num: 4.7, dec: 1, comma: false, post: 'M+' });
  assert.equal(mod.formatFigure(1200, 0, true), '1,200');
  assert.equal(mod.formatFigure(37, 0, true), '37');
  assert.equal(mod.splitFigure('قريباً'), null);
});

test('the intro video card plays in place in the hero (it replaced the Nov 9 corner clip and its centred laptop player)', () => {
  assert.match(css, /\.clip \{ position: relative; margin: 0; width: clamp\(280px, 23vw, 330px\); \}/);
  assert.match(css, /\.clip__media \{ position: relative; display: block; width: 100%; aspect-ratio: 9 \/ 16;/);
  assert.doesNotMatch(css, /\.clip\.is-on \.clip__media \{ position: fixed;/);
});

// Nov 11, 2026: Mohamed picked option A («dark & calm») of three hero designs
test('option A: hero and numbers are always dark, whatever colour the admin gives the section', () => {
  assert.match(css, /\.hl\.hl \{[^}]*background: #0D0A18 !important;/);
  assert.match(css, /\.xstats\.xstats \{[^}]*background: #0D0A18 !important;/);
  assert.match(css, /\.hl__shade \{[^}]*rgba\(13, 10, 24, \.79\)/, 'near-black layer ~79 %');
  assert.match(css, /\.hl__b img \{[^}]*filter: grayscale\(1\) blur\(1\.5px\)/, 'photos grayscale + softly blurred (recognisable)');
  assert.match(css, /\.hl__lines \{[^}]*mask-image: radial-gradient/, 'outlines only around the edges');
  assert.match(hero, /className="hl__glow"/);
  assert.match(hero, /className="hl__wa"/, 'WhatsApp is a plain text link');
  assert.doesNotMatch(hero, /figcaption|btn--line|btn--light/);
  assert.doesNotMatch(strip, /xstat__ic|ICONS|<svg/, 'no icon cards');
  assert.match(css, /\.xstat \+ \.xstat \{ border-inline-start: 1px solid/, 'thin dividers');
  assert.match(clip, /<figcaption><b>\{c\.name\}<\/b>/, 'one caption under the card');
});

test('option A: the numbers follow the hero straight on when only the logo strip sits between them', () => {
  const sx = read('../src/components/Sections.tsx');
  assert.match(sx, /\{numbersAfterHero\(sections\)\.map\(/);
  const src = sx.slice(sx.indexOf('export function numbersAfterHero'), sx.indexOf('/** Renders the page'));
  const js = src.replace('export ', '').replace(/: SectionView\[\]/g, '');
  const fn = new Function(js + '; return numbersAfterHero;')();
  const s = (...t) => t.map((type) => ({ type }));
  const order = (x) => fn(x).map((y) => y.type).join(' ');
  assert.equal(order(s('heroSection', 'clientsSection', 'statsSection', 'problemSection')), 'heroSection statsSection clientsSection problemSection');
  assert.equal(order(s('heroSection', 'statsSection', 'clientsSection')), 'heroSection statsSection clientsSection');
  assert.equal(order(s('heroSection', 'problemSection', 'statsSection')), 'heroSection problemSection statsSection');
  assert.equal(order(s('clientsSection', 'statsSection')), 'clientsSection statsSection');
});

// Nov 11, 2026 (Mohamed): the top bar is white everywhere, over the dark hero too — no dark-bar script
test('the top bar stays white over the hero', () => {
  assert.ok(!existsSync(new URL('../src/components/NavTone.tsx', import.meta.url)));
  assert.ok(!/NavTone/.test(hero));
  assert.ok(!/data-nav/.test(css));
  assert.match(css, /\.nav \{ background: #fff;/);
});
