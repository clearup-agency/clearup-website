import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Nov 12, 2026 speed pass (Lighthouse): the first big picture of a page is fetched first and at the size the
// phone needs; the Cloudinary connection opens early; the small source line on the dark stats band passes 4.5:1.
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('hero clip poster: high priority + responsive sizes', () => {
  const clip = read('../src/components/ClipCard.tsx');
  assert.match(clip, /priority=\{\{ sizes: /);
  const vp = read('../src/components/VideoPlayer.tsx');
  assert.match(vp, /fetchPriority: 'high'/);
  assert.match(vp, /\[360, 480, w\]/);
  // without `priority` nothing changes: cards stay lazy, the clip stays eager
  assert.match(vp, /loading: \(variant === 'clip' \? 'eager' : 'lazy'\)/);
});

test('case page top video / cover: high priority + srcset', () => {
  const cp = read('../src/components/pages/CasePage.tsx');
  assert.match(cp, /className="vf--big"\s+priority=/);
  assert.match(cp, /cs__cover[^>]*srcSet=/);
});

test('Cloudinary preconnect in the site layout', () => {
  assert.match(read('../src/app/[lang]/layout.shared.tsx'), /preconnect\('https:\/\/res\.cloudinary\.com'\)/);
});

test('stats source line contrast (opacity .8 on rgba(255,255,255,.6) over #0d0a18 ≥ 4.5:1)', () => {
  assert.match(read('../src/app/globals.css'), /\.xstat__l em \{[^}]*opacity: \.8;/);
  // the colour the browser paints: 255·0.48 + 13·0.52 ≈ 129 → contrast vs #0d0a18
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const a = 0.6 * 0.8, fg = [13, 10, 24].map((c) => Math.round(255 * a + c * (1 - a)));
  const ratio = (L(...fg) + 0.05) / (L(13, 10, 24) + 0.05);
  assert.ok(ratio >= 4.5, `contrast ${ratio.toFixed(2)}`);
});
