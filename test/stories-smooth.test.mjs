import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Mohamed, Nov 8 2026: «بدي الحركة في التنقل تكون اسهل واسلس» — the stories viewer moves like Instagram's.
const read = (p) => readFileSync(fileURLToPath(new URL('../' + p, import.meta.url)), 'utf8');
const comp = read('src/components/ClientStories.tsx');
const css = read('src/app/globals.css');

test('smooth stories: a sideways drag turns a cube that follows the finger (transform only, no React render per move)', () => {
  assert.match(comp, /className="sview__cube"/);
  assert.match(comp, /<Ghost c=\{clients\[pos\.c - 1\]\} side="prev" \/>/);
  assert.match(comp, /<Ghost c=\{clients\[pos\.c \+ 1\]\} side="next" \/>/);
  assert.match(comp, /translateZ\(\$\{-w \/ 2\}px\) rotateY\(\$\{p \* \(rtl \? 90 : -90\)\}deg\)/, 'cube turn mirrors in Arabic');
  assert.match(comp, /p \*= 0\.22/, 'rubber band where there is no neighbour');
  assert.match(comp, /v > 0\.35/, 'a flick turns even when short');
  assert.match(css, /\.sview__cube \{[^}]*transform-style: preserve-3d/);
  assert.match(css, /\.sview\[dir="rtl"\] \{ --gn: -90deg; --gp: 90deg; \}/);
  // keys, the peeks and the auto-advance at a client's end use the same turn
  assert.match(comp, /const nextClient = useCallback\(\(\) => \{ if \(pos\.c < clients\.length - 1\) turnTo\(1\); else close\(\); \}/);
});

test('smooth stories: no black flash, sound kept, next video buffered only while open', () => {
  assert.match(comp, /<img className="sview__under" src=\{poster\}/, 'the still frame sits under the video');
  assert.doesNotMatch(comp, /<video key=/, 'one <video> element for every story (src changes, sound permission stays)');
  assert.doesNotMatch(comp, /className=\{'sview__stage'[^>]*key=\{pos\.c\}/, 'the stage is not re-created per client');
  assert.match(comp, /const soundPref = \{ off: false \}/);
  assert.match(comp, /useState\(soundPref\.off\)/);
  assert.match(comp, /className="sview__pre" src=\{nextVideo\} preload="auto" muted/);
  assert.match(css, /\.sview__spin \{[^}]*sviewIn \.2s \.45s both/, 'the spinner only appears if loading is slow');
});

test('smooth stories: open grows from the tapped ring, close shrinks back; swipe down drags; page never scrolls behind', () => {
  assert.match(comp, /originOf\?: \(c: number\) => HTMLElement \| null/);
  assert.equal((comp.match(/originOf=\{/g) || []).length, 3, 'every caller passes its ring/tile (the single-video StoryVideo is gone: videos play in VideoPlayer, Nov 11 2026)');
  assert.match(comp, /paint\(0, Math\.max\(0, dy\)\)/, 'the story follows a downward drag');
  assert.match(comp, /addEventListener\('touchmove', still, \{ passive: false \}\)/);
  assert.match(comp, /body\.style\.overflow = 'hidden'/);
  assert.match(css, /\.sview \{[^}]*touch-action: none; overscroll-behavior: contain/);
  assert.match(comp, /prefers-reduced-motion: reduce/, 'reduced motion: no cube, no zoom');
});

test('smooth stories: a short press is still a tap; a hold pauses and release resumes', () => {
  assert.match(comp, /setHeld\(true\); \} \}, 200\)/);
  assert.match(comp, /if \(s0\.held\) \{ setHeld\(false\); if \(pressed > 320\) return; \}/);
  assert.match(comp, /fromStart < \(e\.pointerType === 'mouse' \? 0\.5 : 0\.3\)\) prev\(\); else next\(\)/);
});
