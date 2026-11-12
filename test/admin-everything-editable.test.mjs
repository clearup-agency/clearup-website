import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';
/* Nov 9, 2026 — Mohamed: «بدي تعديل لكل اشي حرفياً من لوحة الادمن، زي ال inspect» (the newest sections first). */
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/');
const out = path.join(mkdtempSync(path.join(tmpdir(), 'cu-all-')), 'all.mjs');
buildSync({ stdin: { contents: "export * from './src/admin/inspect.ts'; export * from './src/admin/shared.ts'; export * from './src/content/defaults.ts'; export { SECTION_TYPES, SCHEMA } from './src/admin/content.ts'; export { sharedSource } from './src/lib/view.ts';", resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, external: ['next/*', 'pg', 'drizzle-orm', 'drizzle-orm/*'], loader: { '.json': 'json' }, logLevel: 'silent' });
const M = await import(pathToFileURL(out).href);
const ls = (ar, en = '') => ({ _type: 'localeString', ar, en });

test('a list shown on one line «a · b · c» is found as the whole list field', () => {
  const c = M.candidates({ items: [ls('أ'), ls('ب'), ls('ج')] }, 'ar');
  assert.ok(c.some((x) => x.path === 'items' && x.text === 'أ · ب · ج'));
});
test('a paragraph of a longer text finds its field; an English name on the Arabic page too', () => {
  const c = M.candidates({ body: { _type: 'localeText', ar: 'سطر أول\n\nسطر ثاني', en: '' }, name: ls('أداة', 'Canvas') }, 'ar');
  assert.ok(c.some((x) => x.path === 'body' && x.text === 'سطر ثاني'));
  assert.ok(c.some((x) => x.path === 'name' && x.text === 'Canvas'));
});
test('a Cloudinary image is the same asset whatever size the page asked for', () => {
  const a = 'https://res.cloudinary.com/x/image/upload/v1794145735/clearup/site/intro_poster.jpg';
  const b = 'https://res.cloudinary.com/x/image/upload/f_auto,c_limit,w_432/v1794145735/clearup/site/intro_poster.jpg';
  assert.equal(M.assetKey(a), M.assetKey(b));
  assert.equal(M.assetKey('/media/a.webp'), '/media/a.webp');
});
test('a shared section edited on Home writes its text to the source and keeps its own design', () => {
  const src = { id: 'svc', type: 'offeringsSection', page: 'services', hidden: false, data: { anchor: 'our-services', title: ls('خمس خدمات'), items: [] } };
  const home = { id: 'home', type: 'offeringsSection', page: 'home', hidden: false, data: { anchor: 'our-services', compact: true, design: { tone: 'dark' } } };
  const all = [home, src];
  assert.equal(M.sourceRow(home, all)?.id, 'svc');
  assert.equal(M.sourceRow(src, all), null);
  const shown = M.readerData(home, src);
  assert.equal(shown.title.ar, 'خمس خدمات');
  assert.equal(shown.compact, true);
  assert.deepEqual(shown.design, { tone: 'dark' });
  const sp = M.splitChange(home, src, { ...shown, title: ls('عنوان جديد'), design: { tone: 'purple' } });
  assert.equal(sp.source.title.ar, 'عنوان جديد');
  assert.equal(sp.source.anchor, 'our-services');
  assert.equal(sp.source.compact, undefined);
  assert.deepEqual(sp.reader.design, { tone: 'purple' });
  assert.equal(sp.reader.title, undefined);
});
test('the editor and the site pick the same source for a shared section', () => {
  const rows = [
    { id: 'a', type: 'processSection', page: 'home', hidden: false, data: {} },
    { id: 'b', type: 'processSection', page: 'services', hidden: false, data: { title: ls('x') } },
  ];
  const raw = rows.map((r) => ({ ...r.data, _type: r.type, _key: r.id, _page: r.page, hidden: r.hidden }));
  assert.equal(M.sharedSource(raw[0], raw).title.ar, 'x');
  assert.equal(M.sourceRow(rows[0], rows).id, 'b');
});
test('defaults fill only what was never written, and every default is a field of the panel', () => {
  const d = M.fillDefaults({ fullStory: ls('اقرأ'), lblClose: ls('', '') }, M.SECTION_DEFAULTS.proofSection);
  assert.equal(d.fullStory.ar, 'اقرأ');
  assert.equal(d.lblClose.ar, 'إغلاق');
  for (const [type, defs] of Object.entries(M.SECTION_DEFAULTS)) {
    for (const p of Object.keys(defs)) assert.equal(M.fieldTrail(M.SECTION_TYPES[type].fields, p).pop()?.path, p, `${type}.${p}`);
  }
  for (const p of Object.keys(M.SETTINGS_DEFAULTS)) assert.equal(M.fieldTrail(M.SCHEMA.settings.fields, p).pop()?.path, p, p);
});
test('the components keep the same words as the defaults (no visible change until edited)', () => {
  const src = (p) => readFileSync(root + p, 'utf8');
  for (const w of ['القصة كاملة', 'التحدي', 'الحل', 'النتيجة', 'صفحة العميل', 'شوف كل الآراء']) assert.ok(src('src/components/pages/TestimonialCard.tsx').includes(`'${w}'`), w);
  for (const w of ['احجز مكالمة مجانية', 'تواصل على واتساب']) assert.ok(src('src/components/Footer.tsx').includes(`'${w}'`), w);
});
