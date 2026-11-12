import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lockoutAfterFailure, LOCK_MS, WINDOW_MS } from '../src/admin/lockout.ts';
import { readSession, signSession } from '../src/admin/session.ts';
import { blocksToText, textToBlocks } from '../src/admin/blocks.ts';

test('lockout: 5 wrong passwords within 15 minutes lock sign-in for 15 minutes', () => {
  let st = null;
  const t0 = 1_000_000;
  for (let i = 1; i <= 4; i++) { st = lockoutAfterFailure(st, t0 + i * 1000); assert.equal(st.lockedUntil, null, 'try ' + i); }
  st = lockoutAfterFailure(st, t0 + 5000);
  assert.equal(st.fails, 5);
  assert.equal(st.lockedUntil, t0 + 5000 + LOCK_MS);
});
test('lockout: old failures expire after the window, and after a lock the count restarts', () => {
  const a = lockoutAfterFailure({ fails: 4, firstFailAt: 0, lockedUntil: null }, WINDOW_MS + 1);
  assert.deepEqual(a, { fails: 1, firstFailAt: WINDOW_MS + 1, lockedUntil: null });
  const b = lockoutAfterFailure({ fails: 5, firstFailAt: 0, lockedUntil: 100 }, 200);
  assert.equal(b.fails, 1);
});
test('session cookie: valid round trip, rejects tampering, wrong secret and expiry', () => {
  const secret = 'x'.repeat(40);
  const c = signSession(7, 2, secret, 60_000, 1000);
  assert.deepEqual(readSession(c, secret, 2000), { uid: 7, sv: 2 });
  assert.equal(readSession(c, 'y'.repeat(40), 2000), null);
  assert.equal(readSession(c, secret, 70_000), null);
  const [body, sig] = c.split('.');
  const forged = Buffer.from(JSON.stringify({ uid: 1, sv: 2, exp: 9e15 })).toString('base64url') + '.' + sig;
  assert.equal(readSession(forged, secret, 2000), null);
  assert.equal(readSession(body, secret, 2000), null);
  assert.equal(readSession(undefined, secret), null);
});
test('rich text: paragraphs, headings, bullets survive a round trip', () => {
  const text = 'فقرة أولى\nسطر ثانٍ\n\n## عنوان\n\n- نقطة 1\n- نقطة 2\n\n1. أول\n2. ثاني';
  const blocks = textToBlocks(text);
  assert.deepEqual(blocks.map((b) => b.style + (b.listItem ? ':' + b.listItem : '')), ['normal', 'h3', 'normal:bullet', 'normal:bullet', 'normal:number', 'normal:number']);
  assert.equal(blocksToText(blocks), text);
});
