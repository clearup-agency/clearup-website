import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
// cdn.ts imports links.ts: bundled first (Node can't follow extensionless imports between .ts files)
const out = path.join(mkdtempSync(path.join(tmpdir(), 'cu-cdn-')), 'cdn.mjs');
buildSync({ entryPoints: [fileURLToPath(new URL('../src/lib/cdn.ts', import.meta.url))], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent' });
const { cdnImage, cdnPoster, cdnVideo, storyEmbed } = await import(pathToFileURL(out).href);

const IMG = 'https://res.cloudinary.com/demo/image/upload/v1/clearup/stories/a.webp';
const VID = 'https://res.cloudinary.com/demo/video/upload/v1/clearup/stories/b.mp4';

test('cdn: Cloudinary images get resized + auto format; others untouched', () => {
  assert.equal(cdnImage(IMG, 1080), 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_1080/v1/clearup/stories/a.webp');
  assert.equal(cdnImage(IMG, 160, true), 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_fill,g_center,w_160,h_160/v1/clearup/stories/a.webp');
  assert.equal(cdnImage('/media-db/k1/x.png', 1080), '/media-db/k1/x.png');
  assert.equal(cdnImage('https://res.cloudinary.com/demo/image/upload/c_fill,w_10/v1/a.png', 1080), 'https://res.cloudinary.com/demo/image/upload/c_fill,w_10/v1/a.png');
});

test('cdn: videos are served as stored (already compressed at import), poster = the eager frame', () => {
  assert.equal(cdnVideo(VID), VID);
  assert.equal(cdnPoster(VID), 'https://res.cloudinary.com/demo/video/upload/so_0,q_auto,c_limit,w_720/v1/clearup/stories/b.jpg');
  assert.equal(cdnPoster(IMG), undefined);
});

test('cdn: YouTube (watch, shorts, youtu.be) and Instagram (p, reel) links embed', () => {
  for (const u of ['https://www.youtube.com/watch?v=jNQXAC9IVRw', 'https://youtube.com/shorts/jNQXAC9IVRw?feature=share', 'https://youtu.be/jNQXAC9IVRw']) {
    const e = storyEmbed(u); assert.equal(e?.kind, 'youtube'); assert.equal(e?.id, 'jNQXAC9IVRw'); assert.match(e.src, /enablejsapi=1/);
  }
  assert.equal(storyEmbed('https://www.instagram.com/reel/C0abcDEF/')?.src, 'https://www.instagram.com/reel/C0abcDEF/embed/');
  assert.equal(storyEmbed('https://www.instagram.com/clearup/p/XyZ123/')?.src, 'https://www.instagram.com/p/XyZ123/embed/');
  assert.equal(storyEmbed('https://drive.google.com/file/d/abc/view'), null);
});
