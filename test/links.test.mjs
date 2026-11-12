import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitLinks, linkSource, youtubeId, instagramPost, driveLink, normalizeLink } from '../src/lib/links.ts';

// «ضيف أعمال»: every common form of a pasted link is recognised (the admin rejected YouTube links before).
test('links: YouTube in every common form', () => {
  for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ?si=AbC123', 'youtube.com/shorts/dQw4w9WgXcQ?si=x', 'https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=12s',
    'https://www.youtube.com/embed/dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'https://www.youtube.com/live/dQw4w9WgXcQ?si=1', 'http://music.youtube.com/watch?v=dQw4w9WgXcQ&list=x']) {
    assert.equal(youtubeId(normalizeLink(u)), 'dQw4w9WgXcQ', u);
    assert.equal(linkSource(normalizeLink(u)), 'youtube', u);
  }
});
test('links: Instagram reel / reels / p / tv, with ?igsh= and a username', () => {
  assert.deepEqual(instagramPost('https://www.instagram.com/reel/DeblRPHNL4W/?igsh=MTc4'), { type: 'reel', code: 'DeblRPHNL4W' });
  assert.deepEqual(instagramPost('https://www.instagram.com/reels/Del5aadglDH/'), { type: 'reel', code: 'Del5aadglDH' });
  assert.deepEqual(instagramPost('instagram.com/p/DfCdu7QuFKf/?img_index=1'), { type: 'p', code: 'DfCdu7QuFKf' });
  assert.deepEqual(instagramPost('https://www.instagram.com/clearup.agency/reel/DfCdu7QuFKf/'), { type: 'reel', code: 'DfCdu7QuFKf' });
});
test('links: Google Drive file, folder, open?id=, uc?id=', () => {
  const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
  assert.deepEqual(driveLink(`https://drive.google.com/file/d/${id}/view?usp=sharing`), { kind: 'file', id });
  assert.deepEqual(driveLink(`https://drive.google.com/uc?export=download&id=${id}`), { kind: 'file', id });
  assert.deepEqual(driveLink(`https://drive.google.com/drive/folders/${id}?usp=drive_link`), { kind: 'folder', id });
  assert.deepEqual(driveLink(`https://drive.google.com/drive/u/0/folders/${id}`), { kind: 'folder', id });
  assert.deepEqual(driveLink(`https://drive.google.com/open?id=${id}`), { kind: 'open', id });
});
test('links: several pasted at once (one per line or inside a message), no duplicates', () => {
  const t = 'شوف هذا https://youtu.be/dQw4w9WgXcQ?si=a.\nwww.instagram.com/reel/DeblRPHNL4W/\n\nhttps://youtu.be/dQw4w9WgXcQ?si=a';
  assert.deepEqual(splitLinks(t), ['https://youtu.be/dQw4w9WgXcQ?si=a', 'https://www.instagram.com/reel/DeblRPHNL4W/']);
  assert.deepEqual(splitLinks('مرحبا'), []);
});
