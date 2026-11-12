// «أعمال العملاء (ستوري)» — the Instagram-style client works section (Nov 7, 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const schema = JSON.parse(read('src/admin/schema.json'));
const css = read('src/app/globals.css');
const comp = read('src/components/ClientStories.tsx');
const sample = read('src/lib/stories-sample.ts');
const pages = read('src/lib/pages.ts');

test('stories: the admin can add clients (name + logo) and ordered works (image, video or link)', () => {
  const t = schema.sections.find((s) => s.name === 'clientStoriesSection');
  assert.ok(t, 'section type exists');
  const clients = t.fields.find((f) => f.name === 'clients');
  assert.equal(clients.type, 'array');
  const client = clients.of[0];
  assert.deepEqual(client.fields.map((f) => f.name).slice(0, 3), ['name', 'logo', 'items']);
  for (const n of ['slug', 'testimonial', 'story']) assert.ok(client.fields.some((f) => f.name === n), n);
  assert.equal(client.fields.find((f) => f.name === 'logo').options.compress, 'logo');
  const item = client.fields.find((f) => f.name === 'items');
  assert.equal(item.options.bulk, 'story');
  const names = item.of[0].fields.map((f) => f.name);
  for (const n of ['image', 'video', 'link', 'caption', 'duration']) assert.ok(names.includes(n), n);
  assert.ok(t.fields.some((f) => f.name === 'mirror'), 'the Work page can mirror the Home clients');
  assert.match(read('src/admin/ui/LiveEditor.tsx'), /'clientStoriesSection'/, 'offered under «إضافة قسم»');
});

test('stories: rendered on Home (after the results) and on Work, from the same clients', () => {
  assert.match(read('src/components/Sections.tsx'), /case 'clientStoriesSection'/);
  assert.match(pages, /row\('home', 'clientStoriesSection'/);
  assert.match(pages, /row\('work', 'clientStoriesSection', \{[^}]*mirror: true/);
  assert.ok(pages.indexOf("'proofSection'") < pages.indexOf("row('home', 'clientStoriesSection'"));
});

test('stories: placeholders are clearly samples, hosted on Cloudinary (no media in the repo, no real brands)', () => {
  const urls = sample.match(/https:\/\/[^'"]+/g) ?? [];
  assert.ok(urls.length >= 15);
  for (const u of urls) assert.match(u, /^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/.*\/clearup\/stories-sample\//);
  const names = [...sample.matchAll(/name: ls\('([^']+)', '([^']+)'\)/g)];
  assert.equal(names.length, 5);
  for (const [, ar, en] of names) { assert.match(ar, /تجريبي/); assert.match(en, /^Sample client/); }
});

test('stories viewer: IG controls — bars, 5 s images, tap zones, hold, swipe, keyboard, close, RTL-aware', () => {
  assert.match(comp, /const IMAGE_MS = 5000/);
  assert.match(comp, /sview__bars/);
  assert.match(comp, /fromStart < \(e\.pointerType === 'mouse' \? 0\.5 : 0\.3\)\) prev\(\); else next\(\)/, 'finger: start third back; mouse: halves');
  assert.match(comp, /setHeld\(true\)/, 'hold pauses');
  assert.match(comp, /tr\.dy > 110/, 'swipe down closes');
  assert.match(comp, /\(rtl \? dx : -dx\) \/ w/, 'swipe direction mirrors in Arabic');
  assert.match(comp, /e\.key === 'Escape'/);
  assert.match(comp, /rtl \? 'ArrowLeft' : 'ArrowRight'/);
  assert.match(comp, /aria-modal="true"/);
  assert.match(comp, /onEnded=\{next\}/, 'videos play their own length');
  for (const k of ['close', 'next', 'prev', 'pause', 'mute']) assert.ok((comp.match(new RegExp(`\\b${k}: '`, 'g')) ?? []).length >= 2, `${k} labelled in ar + en`);
});

test('stories viewer: desktop arrows step works of the same client (like Instagram); neighbour rings jump clients', () => {
  assert.match(comp, /className="sview__side sview__side--prev" onClick=\{prev\} disabled=\{pos\.c === 0 && pos\.i === 0\} aria-label=\{t\.prev\}/);
  assert.match(comp, /className="sview__side sview__side--next" onClick=\{next\} aria-label=\{t\.next\}/);
  assert.match(comp, /<Peek c=\{clients\[pos\.c - 1\]\} side="prev" label=\{t\.prevClient\} onClick=\{prevClient\}/);
  assert.match(comp, /<Peek c=\{clients\[pos\.c \+ 1\]\} side="next" label=\{t\.nextClient\} onClick=\{nextClient\}/);
  // the last work of a client rolls on to the next client; the first work goes back to the previous client's last work
  assert.match(comp, /if \(pos\.i < items\.length - 1\) go\(pos\.c, pos\.i \+ 1\); else nextClient\(\)/);
  assert.match(comp, /else if \(pos\.c > 0\) turnTo\(-1, clients\[pos\.c - 1\]\.items\.length - 1\)/);
  assert.match(css, /\.sview__side, \.sview__peek \{ display: none; \}/, 'phones keep tap/swipe only');
});

test('stories: page weight — only small lazy logos load with the page; media only once a story opens', () => {
  assert.match(comp, /cdnImage\(c\.logo\.src, 160, true\)/);
  assert.match(comp, /loading="lazy"/);
  assert.match(comp, /\{open && createPortal\(/, 'the viewer (and its media) exists only while open');
  assert.match(comp, /preload\(items\[pos\.i \+ 1\]/, 'only the next item is preloaded');
});

test('stories: imports are compressed by Cloudinary before storing (incoming transformations)', () => {
  const media = read('src/admin/media.ts');
  assert.match(media, /'story-image': \{ transformation: 'c_limit,w_1080,h_1920\/q_75', format: 'webp' \}/);
  assert.match(media, /'story-video': \{ transformation: 'c_limit,w_720,h_1280\/vc_h264:main:3\.1,ac_aac,br_1200k', format: 'mp4', async: 'true'/);
  assert.match(media, /driveDownloadUrl/);
  assert.match(read('src/app/api/admin/import/route.dyn.ts'), /currentAdmin\(\)/, 'import is admin-only');
});

test('stories: yellow and the gradient ring stay on the dark band', () => {
  assert.match(css, /\.cstories \{ background: var\(--ink\)/);
  assert.match(css, /\.sring__ring \{[^}]*conic-gradient\(from 210deg, var\(--purple\), var\(--violet\), var\(--lav\), var\(--yellow\)/);
});
