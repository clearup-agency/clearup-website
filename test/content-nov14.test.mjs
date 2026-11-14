import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { patch, HERO_TITLE, AI_TITLE, INNOV_LINE } from '../scripts/content-nov14.mjs';

// Nov 14, 2026 — ClearUp's content file: new hero headline + lead, service 03 «…والحوكمة» with its 3 parts, a line in 01
const L = (ar, en = '') => ({ _type: 'localeString', ar, en });
const T = (ar, en = '') => ({ _type: 'localeText', ar, en });
const before = () => ({
  settings: {},
  sections: [
    { id: 'h', page: 'home', type: 'heroSection', data: { title: [{ _key: 'a', ...L('لا نبيع تصاميم.') }, { _key: 'b', ...L('نبني أنظمة أرباح.') }], strike: L('تصاميم'), lead: T('قديم') } },
    { id: 'o', page: 'services', type: 'offeringsSection', data: { items: [
      { title: L('الابتكار وتطوير المنتجات والخدمات'), gets: T('سطر') },
      { title: L('التسويق الابتكاري'), desc: T('كما هو') },
      { title: L('التحول بالذكاء الاصطناعي والأتمتة'), en: 'AI Transformation & Automation', desc: T('قديم') },
    ] } },
  ],
});
// Postgres jsonb hands keys back in its own order
const reorder = (v) => (Array.isArray(v) ? v.map(reorder) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).reverse().map((k) => [k, reorder(v[k])])) : v);

test('applies the content file once; a second run (keys reordered) changes nothing', () => {
  const { content, changes } = patch(before());
  assert.ok(changes.length > 0);
  const h = content.sections[0].data;
  assert.deepEqual(h.title.map((x) => x.ar), HERO_TITLE.map((x) => x.ar));
  assert.equal(h.title[0]._key, 'a', 'keeps the line keys');
  assert.equal(h.strike.ar, '');
  const [s1, s2, s3] = content.sections[1].data.items;
  assert.equal(s3.title.ar, AI_TITLE.ar);
  assert.match(s3.desc.ar, /• إعادة تصميم العمل[\s\S]*• نموذج التشغيل[\s\S]*• بناء ونشر الأنظمة/);
  assert.equal(s1.gets.ar, 'سطر\n' + INNOV_LINE.ar);
  assert.equal(s2.desc.ar, 'كما هو', 'other services untouched');
  assert.equal(patch(reorder(content)).changes.length, 0);
});

test('a headline the admin rewrote afterwards is kept', () => {
  const b = before();
  b.sections[0].data.title = [L('عنوان كتبه الأدمن')];
  assert.equal(patch(b).content.sections[0].data.title[0].ar, 'عنوان كتبه الأدمن');
});

test('Netlify runs it before the build and it never fails the build', () => {
  assert.match(readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8'), /command = "node scripts\/content-nov14\.mjs --apply --soft && npm run build"/);
});
