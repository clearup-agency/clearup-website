import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Nov 11, 2026 — Mohamed: «عملاؤنا يحكون» videos were huge (2 cards stretched to half the width each) and a click
// opened a story that stopped/closed at the end. Fixed-size cards in one sideways row; a click plays in the card.
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const css = read('../src/app/globals.css');
const proof = read('../src/components/pages/Proof.tsx');
const card = read('../src/components/pages/TestimonialCard.tsx');
const player = read('../src/components/VideoPlayer.tsx');
const rail = read('../src/components/pages/TestimonialRail.tsx');

test('the section is one row of fixed-size cards: 4 on a laptop, 3 on a tablet, ~1.4 on a phone', () => {
  assert.match(proof, /<TestimonialRail /);
  assert.match(rail, /className="tvcards tvrail__track"/);
  assert.match(css, /\.tvcards\.tvrail__track \{[^}]*grid-auto-flow: column[^}]*grid-auto-columns: calc\(\(100% - 3 \* var\(--gap-card\)\) \/ 4\)[^}]*overflow-x: auto[^}]*scroll-snap-type: x mandatory/);
  assert.match(css, /@media \(max-width: 1100px\) \{ \.tvcards\.tvrail__track \{ grid-auto-columns: calc\(\(100% - 2 \* var\(--gap-card\)\) \/ 3\); \} \}/);
  assert.match(css, /\.tvcards\.tvrail__track \{ grid-auto-columns: min\(70%, 280px\)/);
  // never the old stretch-to-fill grid for this row
  assert.doesNotMatch(css, /\.tvrail__track \{[^}]*1fr/);
});

test('arrows on a laptop (RTL-aware), hidden on touch; they only show when the row overflows', () => {
  assert.match(rail, /st\.over &&/);
  assert.match(rail, /direction === 'rtl'/);
  assert.match(css, /@media \(hover: none\) \{ \.tvrail__btn \{ display: none; \} \}/);
});

test('a click plays the video in the card with controls; no story viewer for a video or YouTube link', () => {
  assert.match(card, /<VideoPlayer /);
  assert.doesNotMatch(card, /<StoryVideo /);
  assert.match(player, /<video [^>]*controls autoPlay playsInline/);
  assert.doesNotMatch(player, /onEnded/);
  assert.match(css, /\.tvcard\.is-playing \.tvcard__body \{ display: none; \}/);
  // an Instagram reel (the live testimonials are reels): its own player in a plain modal, no 15 s story clock
  assert.match(player, /on && ig && createPortal/);
  assert.doesNotMatch(player, /setTimeout|EMBED_MS/);
});

// Nov 11, 2026 (later) — Mohamed: «أول ما يفتح الفيديو بدي يشتغل مباشرة». The reels are now stored as mp4 files
// next to their Instagram link; a click starts the file inside the tap, with sound, muted only if the browser says no.
test('a click starts the stored video inside the tap, with sound; muted only as a fallback; Instagram stays the fallback', () => {
  const schema = JSON.parse(read('../src/admin/schema.json'));
  const cs = schema.sections.find((s) => s.name === 'caseStudy');
  const vids = cs.fields.find((f) => f.name === 'videos');
  const sub = vids.of[0].fields.map((f) => f.name);
  assert.ok(sub.includes('url') && sub.includes('file'), 'the admin edits both the link and the mp4 file');
  assert.match(player, /flushSync\(\(\) => setOn\(true\)\)/);
  assert.match(player, /v\.muted = false;\s*pauseOthers\(v\);\s*(?:if \(fullscreen\) goFullscreen\(v as FsVideo\);\s*)?v\.play\(\)\?\.catch\(\(\) => \{ v\.muted = true; v\.play\(\)/);
  assert.match(player, /storyEmbed\(item\?\.link\)/);
  const clients = read('../src/lib/clients.ts');
  assert.match(clients, /typeof v\.file\?\.url === 'string' && v\.file\.url \? v\.file\.url/);
});

// Nov 11, 2026 (Mohamed: «ما بدي تكرار في العناصر، بدي أشغل component واحد»): ONE video component everywhere
test('one video component: every video card and player on the site is VideoPlayer; the copies are gone', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
  for (const f of ['src/components/pages/TestimonialPlayer.tsx', 'src/components/pages/VideoFacade.tsx']) assert.ok(!fs.existsSync(path.join(root, f)), f + ' is deleted');
  const users = { 'src/components/pages/TestimonialCard.tsx': 1, 'src/components/pages/CasePage.tsx': 3, 'src/components/Offerings.tsx': 1, 'src/components/ClipCard.tsx': 1, 'src/components/Stories.tsx': 2 };
  for (const [f, n] of Object.entries(users)) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    assert.equal((src.match(/<VideoPlayer /g) || []).length, n, f);
    assert.doesNotMatch(src, /<video |<iframe |StoryVideo|VideoFacade|TestimonialPlayer|createPortal|<dialog/, f + ' has no player of its own');
  }
  const stories = fs.readFileSync(path.join(root, 'src/components/ClientStories.tsx'), 'utf8');
  assert.doesNotMatch(stories, /export function StoryVideo/);
  // only VideoPlayer (and the works story viewer) put a <video> on the public pages
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const withVideo = walk(path.join(root, 'src/components')).filter((f) => /\.tsx$/.test(f) && /<video /.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(root, f)).sort();
  assert.deepEqual(withVideo, ['src/components/ClientStories.tsx', 'src/components/VideoPlayer.tsx']);
  const vp = fs.readFileSync(path.join(root, 'src/components/VideoPlayer.tsx'), 'utf8');
  assert.match(vp, /variant\?: 'card' \| 'clip'/);
  assert.match(vp, /target="_blank" rel="noopener"/, 'a plain link opens in a new tab');
});
