import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';

// Nov 9, 2026 (Mohamed: «بدي أضيف فيديو رابع، خامس، عاشر… وكم واحد بيظهر بالرئيسية، وأعيد ترتيبهم»): the
// testimonial videos have one admin order (drag), a «يظهر بالرئيسية» switch each and «عدد الفيديوهات بالرئيسية»
// (default 3); «أعمالنا» shows them all (up to 50) in the same order; Home links to them («شوف كل الآراء») when
// it shows fewer than there are. With nothing set, the site shows exactly what it showed before.
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/');
mkdirSync(root + 'node_modules/.cache', { recursive: true });
const dir = mkdtempSync(root + 'node_modules/.cache/cu-tadmin-');
const bundle = (entry, name) => {
  const out = path.join(dir, name);
  buildSync({ entryPoints: [root + entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, logLevel: 'silent', jsx: 'automatic', loader: { '.tsx': 'tsx' } });
  return import(pathToFileURL(out).href);
};
const read = (p) => readFileSync(root + p, 'utf8');
const T = await bundle('src/lib/testimonials.ts', 'testimonials.mjs');
const { buildView, snapshotToRaw } = await bundle('src/lib/view.ts', 'view.mjs');
const seed = JSON.parse(read('seed/content.json'));
const ls = (ar, en = '') => ({ ar, en, _type: 'localeString' });
const lt = (ar, en = '') => ({ ar, en, _type: 'localeText' });

const caseRow = (id, name, extra = {}) => ({ id, page: 'cases', type: 'caseStudy', hidden: false, data: {
  client: ls(name, name), slug: id, featured: true, problem: lt('تحدي ' + name, 'challenge'),
  videos: [{ _key: 'v' + id, _type: 'video', url: 'https://www.instagram.com/reel/' + id + '/', file: { _type: 'file', url: '/media/' + id + '.mp4' } }], ...extra } });
function snap(homeProof = {}, more = []) {
  return snapshotToRaw({ settings: seed.settings, sections: [
    { id: 'hp', page: 'home', type: 'proofSection', hidden: false, data: { title: ls('عملاؤنا يحكون'), all: ls('كل الأعمال'), limit: 3, ...homeProof } },
    { id: 'wp', page: 'work', type: 'proofSection', hidden: false, data: { title: ls('عملاؤنا يحكون') } },
    caseRow('c1', 'مساحات'), caseRow('c2', 'ثوب وطرحة'), caseRow('c3', 'النون'),
    // an ad with placeholder words only: not a testimonial (as today)
    caseRow('c4', 'إعمار كلين', { problem: lt('[المشكلة]'), summary: ls('إعلان من إنتاجنا') }),
    ...more,
  ] });
}
const proofOf = (v) => v.sections.find((s) => s.type === 'proofSection');
const names = (cards) => cards.map((c) => c.client);
function shown(raw, page) {
  const v = buildView(raw, 'ar', page);
  const s = proofOf(v).data;
  const all = T.testimonialCards(v.ctx.cases, s.order);
  return page === 'home' ? T.homeCards(all, s) : all;
}

test('nothing set: Home and «أعمالنا» show exactly what they showed before (first 3, the clients order)', () => {
  assert.deepEqual(names(shown(snap(), 'home')), ['مساحات', 'ثوب وطرحة', 'النون']);
  assert.deepEqual(names(shown(snap(), 'work')), ['مساحات', 'ثوب وطرحة', 'النون']);
  assert.equal(T.homeCount(undefined), 3);
  assert.equal(T.homeCount(0), 3);
  assert.equal(T.homeCount(5), 5);
});

test('a 4th and 5th video: «أعمالنا» shows all; Home keeps its 3 until switched on; the count caps Home', () => {
  const more = [caseRow('c5', 'عميل خامس'), caseRow('c6', 'عميل سادس', { problem: lt(''), testimonial: { quote: lt('جملة قصيرة'), name: ls('سارة') } })];
  assert.deepEqual(names(shown(snap({}, more), 'work')), ['مساحات', 'ثوب وطرحة', 'النون', 'عميل خامس', 'عميل سادس']);
  assert.deepEqual(names(shown(snap({}, more), 'home')), ['مساحات', 'ثوب وطرحة', 'النون']);
  // a quote-only testimonial (video + one short line) is a card; its short line is the quote
  const six = shown(snap({}, more), 'work').find((c) => c.client === 'عميل سادس');
  assert.equal(six.short, 'جملة قصيرة');
  // switches: Home shows the switched-on ones in order, up to the count
  const on = { onHome: ['c2', 'c6'], limit: 3 };
  assert.deepEqual(names(shown(snap(on, more), 'home')), ['ثوب وطرحة', 'عميل سادس']);
  assert.deepEqual(names(shown(snap({ onHome: ['c1', 'c2', 'c3', 'c5'], limit: 3 }, more), 'home')), ['مساحات', 'ثوب وطرحة', 'النون']);
  assert.deepEqual(names(shown(snap({ onHome: ['c1', 'c2', 'c3', 'c5'], limit: 4 }, more), 'home')), ['مساحات', 'ثوب وطرحة', 'النون', 'عميل خامس']);
});

test('drag order = the order on Home and on «أعمالنا» (stored on Home\'s section, read by both)', () => {
  const raw = snap({ order: ['c3', 'c1', 'c2'] });
  assert.deepEqual(names(shown(raw, 'home')), ['النون', 'مساحات', 'ثوب وطرحة']);
  assert.deepEqual(names(shown(raw, 'work')), ['النون', 'مساحات', 'ثوب وطرحة']);
  // ids not in the order keep their place after it; a story that moved into «العملاء» keeps its case id
  assert.deepEqual(T.sortByOrder([{ ids: ['x'] }, { ids: ['y'] }, { ids: ['z', 'kcz'] }], ['kcz']).map((c) => c.ids[0]), ['z', 'x', 'y']);
});

test('«شوف كل الآراء» on Home only when there are more videos than it shows, linking to «أعمالنا»#testimonials', () => {
  const p = read('src/components/pages/Proof.tsx') + read('src/components/pages/TestimonialCard.tsx');
  assert.match(p, /شوف كل الآراء/);
  assert.match(p, /ctx\.links\.work \+ '#testimonials'/);
  assert.match(p, /const more = home && all\.length > cards\.length/);
  assert.match(p, /id="testimonials"/);
  assert.equal(T.TESTIMONIALS_MAX, 50);
});

test('admin: the testimonials section has the videos card (drag, «يظهر بالرئيسية», «عدد الفيديوهات بالرئيسية», add)', () => {
  const m = read('src/admin/ui/TestimonialsManager.tsx');
  for (const s of ['عدد الفيديوهات بالرئيسية', 'يظهر بالرئيسية', 'إضافة فيديو جديد', 'useSortable', '/admin/stories/']) assert.ok(m.includes(s), s);
  // the same list as the site: built with the public buildView + testimonialCards
  assert.match(m, /buildView\(snapshotToRaw\(content\)/);
  assert.match(m, /testimonialCards\(view\.ctx\.cases, d\.order\)/);
  const le = read('src/admin/ui/LiveEditor.tsx');
  assert.match(le, /<TestimonialsManager/);
  const schema = JSON.parse(read('src/admin/schema.json'));
  const f = schema.sections.find((x) => x.name === 'proofSection').fields.map((x) => x.name);
  for (const k of ['limit', 'order', 'onHome', 'allTestimonials']) assert.ok(f.includes(k), k);
  const sm = read('src/admin/ui/StoriesManager.tsx');
  assert.match(sm, /فيديو العميل وهو بيحكي/);
  assert.match(sm, /جملة قصيرة تظهر على الفيديو/);
});
