import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Nov 14, 2026 (Mohamed): the hero video, «عملاؤنا يحكون» and the services' videos open like a story —
// laptop: centred 9:16 window with × on top (not full screen); phone: full screen with × on top
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('the three video places open the story-like window', () => {
  assert.match(read('src/components/ClipCard.tsx'), /<VideoPlayer variant="clip"[\s\S]*\bmodal\b/);
  assert.match(read('src/components/pages/TestimonialCard.tsx'), /<VideoPlayer[^>]*\bmodal\b/);
  assert.match(read('src/components/System.tsx'), /<VideoPlayer[\s\S]*?\bmodal \/>/);
  const vp = read('src/components/VideoPlayer.tsx');
  assert.match(vp, /\{!ig && x\}/); // × inside the video window, at its top
});

test('laptop: a centred window; phone: the whole screen', () => {
  const css = read('src/app/globals.css');
  assert.match(css, /\.tvmodal--video \.tvmodal__box \{ height: min\(88vh, 820px\)/);
  assert.match(css, /\.tvmodal--video \.tvmodal__box \{ width: 100vw; height: 100vh; height: 100dvh;/);
});
