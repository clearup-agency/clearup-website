import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';
// The contact form: validation, per-visitor limits, the email the admin receives, the Resend call (mocked),
// and the whole request flow (honeypot, missing key, failed send → the visitor is sent to WhatsApp).
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/'); // not URL.pathname: that is /D:/... on Windows
const out = path.join(mkdtempSync(path.join(tmpdir(), 'cu-contact-')), 'contact.mjs');
buildSync({ stdin: { contents: "export * from './src/lib/contact.ts';", resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, logLevel: 'silent' });
const C = await import(pathToFileURL(out).href);

const good = { name: 'أحمد سالم', phone: '+970 59 123 4567', email: 'Ahmad@Example.com', company: 'شركة النور', message: 'بدنا نحكي عن التسويق\nشكراً' };
const T0 = Date.parse('2026-11-01T18:00:00Z');

function mockFetch(responses) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const r = responses.shift() ?? { status: 200, body: '{"id":"em_1"}' };
    if (r.throw) throw Object.assign(new Error(r.throw), { name: r.throw });
    return { ok: r.status >= 200 && r.status < 300, status: r.status, text: async () => r.body };
  };
  fn.calls = calls;
  return fn;
}
const silent = () => {};

test('validation: required name + phone; email, company and message are optional (a typed email must be valid)', () => {
  const ok = C.validateContact(good);
  assert.equal(ok.ok, true);
  assert.equal(ok.value.email, 'ahmad@example.com');
  assert.equal(C.validateContact({ ...good, company: '', message: '' }).ok, true);
  assert.deepEqual(C.validateContact({}).errors, { name: 'required', phone: 'required' });
  assert.equal(C.validateContact({ ...good, email: '' }).ok, true);
  assert.equal(C.validateContact({ ...good, email: '' }).value.email, '');
  assert.equal(C.validateContact({ ...good, email: 'ahmad@' }).errors.email, 'email');
  assert.equal(C.validateContact({ ...good, email: 'a b@x.com' }).errors.email, 'email');
  assert.equal(C.validateContact({ ...good, phone: '12345' }).errors.phone, 'phone');
  assert.equal(C.validateContact({ ...good, phone: 'call me' }).errors.phone, 'phone');
  assert.equal(C.validateContact({ ...good, phone: '059-710-1439' }).ok, true);
  assert.equal(C.validateContact({ ...good, name: 'A' }).errors.name, 'short');
  assert.equal(C.validateContact({ ...good, message: 'x'.repeat(2001) }).errors.message, 'long');
  assert.equal(C.validateContact({ ...good, name: 'x'.repeat(101) }).errors.name, 'long');
  // control characters and header-injection newlines in one-line fields are gone
  const v = C.validateContact({ ...good, name: 'Ali\r\nBcc: x@y.com\u0007' }).value;
  assert.equal(v.name, 'Ali Bcc: x@y.com');
  assert.equal(C.validateContact(null).ok, false);
});

test('every validation message exists in Arabic and English', () => {
  for (const k of ['required', 'short', 'long', 'email', 'phone', 'optional']) {
    assert.ok(C.FORM_TEXT.ar[k] && C.FORM_TEXT.en[k], k);
  }
  for (const k of Object.keys(C.FORM_DEFAULTS.ar)) assert.ok(C.FORM_DEFAULTS.en[k], k);
});

test('limits: 5 an hour and 10 a day per visitor, and a ceiling for the whole site', () => {
  const lim = C.makeLimiter(5, 10, 12);
  for (let i = 0; i < 5; i++) assert.equal(lim('a', T0 + i).ok, true);
  assert.deepEqual(lim('a', T0 + 10), { ok: false, reason: 'hour' });
  assert.equal(lim('b', T0 + 10).ok, true); // someone else isn't affected
  for (let i = 0; i < 5; i++) assert.equal(lim('a', T0 + 3_600_001 + i).ok, true);
  assert.deepEqual(lim('a', T0 + 7_300_000), { ok: false, reason: 'day' });
  assert.equal(lim('c', T0 + 7_300_000).ok, true);
  assert.deepEqual(lim('d', T0 + 7_300_001), { ok: false, reason: 'global' }); // 12 sent today
  assert.equal(lim('d', T0 + 86_400_000).ok, true); // a new day
});

test('the email: Arabic subject with the name, RTL HTML with everything escaped, plain text', () => {
  const v = C.validateContact({ ...good, message: '<script>alert(1)</script>\nسطر 2' }).value;
  const m = C.buildContactEmail(v, { lang: 'en', page: '/en/', when: new Date(T0) });
  assert.equal(m.subject, 'رسالة جديدة من موقع ClearUp — أحمد سالم');
  assert.match(m.html, /<html lang="ar" dir="rtl">/);
  assert.ok(!m.html.includes('<script>alert'));
  assert.match(m.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;<br>سطر 2/);
  assert.match(m.html, /mailto:ahmad@example\.com/);
  assert.match(m.html, /https:\/\/wa\.me\/970591234567/); // an international number gets a WhatsApp reply button
  assert.match(m.html, /الإنجليزية/);
  for (const s of ['الاسم: أحمد سالم', 'الهاتف / واتساب: +970 59 123 4567', 'الإيميل: ahmad@example.com', 'الشركة: شركة النور', '<script>alert(1)</script>\nسطر 2']) assert.ok(m.text.includes(s), s);
  const local = C.buildContactEmail({ ...v, phone: '0597101439', company: '', message: '' }, { lang: 'ar', when: new Date(T0) });
  assert.ok(!local.html.includes('wa.me')); // a local number: no guessed country code, a call button instead
  assert.match(local.html, /tel:0597101439/);
  assert.match(local.text, /الشركة: —/);
  assert.match(local.text, /\(بدون رسالة\)/);
  assert.equal(C.buildContactEmail({ ...v, name: 'A\nB' }, { lang: 'ar' }).subject.includes('\n'), false);
});

test('Resend call: right URL, bearer key, reply_to the visitor, from/to/subject/html/text', async () => {
  const f = mockFetch([{ status: 200, body: '{"id":"em_123"}' }]);
  const mail = C.buildContactEmail(C.validateContact(good).value, { lang: 'ar' });
  const r = await C.sendViaResend({ apiKey: 're_test', from: C.DEFAULT_FROM, to: 'admin@clearup.ps', replyTo: 'ahmad@example.com', mail, idempotencyKey: 'k1', fetchImpl: f });
  assert.deepEqual(r, { ok: true, id: 'em_123' });
  const c = f.calls[0];
  assert.equal(c.url, 'https://api.resend.com/emails');
  assert.equal(c.init.method, 'POST');
  assert.equal(c.init.headers.authorization, 'Bearer re_test');
  assert.equal(c.init.headers['idempotency-key'], 'k1');
  assert.deepEqual(c.body.to, ['admin@clearup.ps']);
  assert.equal(c.body.reply_to, 'ahmad@example.com');
  assert.equal(c.body.from, 'ClearUp Website <onboarding@resend.dev>');
  assert.equal(c.body.subject, mail.subject);
  assert.ok(c.body.html && c.body.text);
  const bad = await C.sendViaResend({ apiKey: 'x', from: 'a', to: 'b', replyTo: 'c', mail, fetchImpl: mockFetch([{ status: 403, body: '{"message":"You can only send testing emails to your own email address"}' }]) });
  assert.equal(bad.ok, false); assert.equal(bad.status, 403); assert.match(bad.error, /own email address/);
  const down = await C.sendViaResend({ apiKey: 'x', from: 'a', to: 'b', replyTo: 'c', mail, fetchImpl: mockFetch([{ throw: 'AbortError' }]) });
  assert.deepEqual(down, { ok: false, status: 0, error: 'timeout' });
});

test('flow: sends to the address from settings, else CONTACT_TO; CONTACT_FROM when set', async () => {
  const f = mockFetch([]);
  const env = { RESEND_API_KEY: 're_x', CONTACT_TO: 'env@clearup.ps', CONTACT_FROM: 'ClearUp <hello@clearupagency.com>' };
  const r = await C.handleContact({ ...good, t: 9000, lang: 'ar' }, { ip: '1.1.1.1', env, contactTo: 'Admin@ClearUp.ps', limiter: C.makeLimiter(), fetchImpl: f, now: T0, log: silent });
  assert.deepEqual(r, { status: 200, body: { ok: true } });
  assert.deepEqual(f.calls[0].body.to, ['Admin@ClearUp.ps']);
  assert.equal(f.calls[0].body.from, 'ClearUp <hello@clearupagency.com>');
  const f2 = mockFetch([]);
  await C.handleContact({ ...good, t: 9000 }, { ip: '1.1.1.2', env: { RESEND_API_KEY: 're_x', CONTACT_TO: 'env@clearup.ps' }, contactTo: '', limiter: C.makeLimiter(), fetchImpl: f2, now: T0, log: silent });
  assert.deepEqual(f2.calls[0].body.to, ['env@clearup.ps']);
  assert.equal(f2.calls[0].body.from, C.DEFAULT_FROM);
  // a broken settings value doesn't win over a good CONTACT_TO
  const f3 = mockFetch([]);
  await C.handleContact({ ...good, t: 9000 }, { ip: '1.1.1.3', env: { RESEND_API_KEY: 're_x', CONTACT_TO: 'env@clearup.ps' }, contactTo: 'not-an-email', limiter: C.makeLimiter(), fetchImpl: f3, now: T0, log: silent });
  assert.deepEqual(f3.calls[0].body.to, ['env@clearup.ps']);
});

test('flow: no key or no address → not_configured, and the submission is in the server log', async () => {
  const logs = [];
  const f = mockFetch([]);
  const r = await C.handleContact({ ...good, t: 9000 }, { ip: '2.2.2.2', env: {}, contactTo: 'admin@clearup.ps', limiter: C.makeLimiter(), fetchImpl: f, log: (m, d) => logs.push([m, d]) });
  assert.deepEqual(r, { status: 503, body: { ok: false, reason: 'not_configured' } });
  assert.equal(f.calls.length, 0);
  assert.match(logs[0][0], /RESEND_API_KEY missing/);
  assert.equal(logs[0][1].phone, '+970 59 123 4567');
  assert.match(logs[0][1].message, /بدنا نحكي/);
  const r2 = await C.handleContact({ ...good, t: 9000 }, { ip: '2.2.2.3', env: { RESEND_API_KEY: 're_x' }, limiter: C.makeLimiter(), fetchImpl: f, log: (m, d) => logs.push([m, d]) });
  assert.equal(r2.body.reason, 'not_configured');
  assert.match(logs[1][0], /no receiving address/);
});

test('flow: Resend refuses → send_failed (visitor gets WhatsApp), message kept in the log', async () => {
  const logs = [];
  const f = mockFetch([{ status: 403, body: '{"name":"validation_error","message":"You can only send testing emails to your own email address"}' }]);
  const r = await C.handleContact({ ...good, t: 9000 }, { ip: '3.3.3.3', env: { RESEND_API_KEY: 're_x' }, contactTo: 'admin@clearup.ps', limiter: C.makeLimiter(), fetchImpl: f, log: (m, d) => logs.push([m, d]) });
  assert.deepEqual(r, { status: 502, body: { ok: false, reason: 'send_failed' } });
  assert.match(logs[0][0], /403.*own email address/);
  assert.equal(logs[0][1].email, 'ahmad@example.com');
});

test('flow: bots (hidden field, or sent in under 1.5 s) get a fake success and nothing is sent', async () => {
  const f = mockFetch([]);
  const ctx = { ip: '4.4.4.4', env: { RESEND_API_KEY: 're_x' }, contactTo: 'admin@clearup.ps', limiter: C.makeLimiter(), fetchImpl: f, log: silent };
  assert.deepEqual(await C.handleContact({ ...good, website: 'http://spam', t: 9000 }, ctx), { status: 200, body: { ok: true } });
  assert.deepEqual(await C.handleContact({ ...good, t: 300 }, ctx), { status: 200, body: { ok: true } });
  assert.equal(f.calls.length, 0);
});

test('flow: invalid input → 400 with the field errors; the 6th message in an hour → 429', async () => {
  const f = mockFetch([]);
  const ctx = { ip: '5.5.5.5', env: { RESEND_API_KEY: 're_x' }, contactTo: 'admin@clearup.ps', limiter: C.makeLimiter(5, 10, 90), fetchImpl: f, now: T0, log: silent };
  const bad = await C.handleContact({ ...good, email: 'nope', t: 9000 }, ctx);
  assert.equal(bad.status, 400); assert.deepEqual(bad.body.errors, { email: 'email' });
  for (let i = 0; i < 5; i++) assert.equal((await C.handleContact({ ...good, message: 'm' + i, t: 9000 }, ctx)).status, 200); // the invalid one didn't count
  assert.deepEqual(await C.handleContact({ ...good, t: 9000 }, ctx), { status: 429, body: { ok: false, reason: 'rate' } });
  assert.equal(f.calls.length, 5);
  // the same message twice in the same minute carries the same idempotency key (Resend sends it once)
  assert.equal(f.calls[0].init.headers['idempotency-key'].startsWith('cu-'), true);
});

test('the admin schema has «إيميل استقبال الرسائل» in the contact group and the form texts', () => {
  const schema = JSON.parse(readFileSync(new URL('../src/admin/schema.json', import.meta.url), 'utf8'));
  const f = schema.settings.fields.find((x) => x.name === 'contactTo');
  assert.equal(f.title, 'إيميل استقبال الرسائل');
  assert.equal(f.group, 'contact');
  const fin = schema.sections.find((s) => s.name === 'finalCtaSection');
  const names = fin.fields.map((x) => x.name);
  for (const n of ['sending', 'success', 'error', 'errorWhatsapp']) assert.ok(names.includes(n), n);
  assert.ok(!names.includes('demo') && !names.includes('thanks'));
  assert.deepEqual(fin.fields.find((x) => x.name === 'fields').fields.map((x) => x.name), ['name', 'phone', 'email', 'company', 'message']);
});
