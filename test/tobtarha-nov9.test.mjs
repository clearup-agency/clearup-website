import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';

// Nov 9, 2026 (ClearUp via Munim, Mohamed: «شيلهم حالياً وحالياً حط لمشوار بس للاسم»): ClearUp never worked for
// Tob & Tarha. Everything of theirs is HIDDEN, not deleted, and comes back from the admin: their story row
// («قصص العملاء» → 👁: page, testimonial card, «قصص أخرى», sitemap, llms), their name in the clients strip (👁 on the
// line) and their video pinned on a service («إخفاء هذا الفيديو عن الزوار»). «مشوار» is a name in the strip.
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/');
mkdirSync(root + 'node_modules/.cache', { recursive: true });
const dir = mkdtempSync(root + 'node_modules/.cache/cu-tobtarha-');
const bundle = (entry, name) => {
  const out = path.join(dir, name);
  buildSync({ entryPoints: [root + entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, logLevel: 'silent', jsx: 'automatic', loader: { '.tsx': 'tsx', '.json': 'json' } });
  return import(pathToFileURL(out).href);
};
const read = (p) => readFileSync(root + p, 'utf8');
const T = await bundle('src/lib/testimonials.ts', 'testimonials.mjs');
const { buildView, snapshotToRaw, withoutHiddenItems } = await bundle('src/lib/view.ts', 'view.mjs');
const { cleanSection } = await bundle('src/admin/validate.ts', 'validate.mjs');
const { otherClientCards, testimonialStories } = await bundle('src/lib/tstories.ts', 'tstories.mjs');
const seed = JSON.parse(read('seed/content.json'));
const ls = (ar, en = '') => ({ ar, en, _type: 'localeString' });
const lt = (ar, en = '') => ({ ar, en, _type: 'localeText' });
const caseRow = (id, name, extra = {}, hidden = false) => ({ id, page: 'cases', type: 'caseStudy', hidden, data: {
  client: ls(name, name), slug: id, featured: true, problem: lt('تحدي ' + name, 'challenge'),
  videos: [{ _key: 'v' + id, _type: 'video', url: 'https://www.instagram.com/reel/' + id + '/', file: { _type: 'file', url: '/media/' + id + '.mp4' } }], ...extra } });
const names = [ls('مساحات', 'Masahat'), { ...ls('ثوب وطرحة', 'Tob & Tarha'), _key: 'kt', hidden: true }, { ...ls('مشوار', 'Mishwar'), _key: 'km' }, ls('النون', 'Al-Noon')];
const offers = { items: [{ _key: 'o1', _type: 'offer', title: ls('التدريب', 'Training'), videos: [
  { _key: 'v1', _type: 'pinVideo', name: ls('مساحات', 'Masahat'), video: { _type: 'file', url: '/media/story-masahat.mp4' } },
  { _key: 'v2', _type: 'pinVideo', name: ls('ثوب وطرحة', 'Tob & Tarha'), label: ls('نهى · ثوب وطرحة', 'Noha · Tob & Tarha'), hide: true, video: { _type: 'file', url: '/media/story-tobtarha.mp4' } },
] }] };
function snap(tobHidden = true, extra = []) {
  return snapshotToRaw({ settings: seed.settings, sections: [
    { id: 'cl', page: 'home', type: 'clientsSection', hidden: false, data: { label: ls('شركات وثقت بنا', 'Companies that trusted us'), names } },
    { id: 'of', page: 'services', type: 'offeringsSection', hidden: false, data: offers },
    { id: 'hp', page: 'home', type: 'proofSection', hidden: false, data: { title: ls('عملاؤنا يحكون'), limit: 3 } },
    caseRow('masahat', 'مساحات'), caseRow('tob-tarha', 'ثوب وطرحة', {}, tobHidden), caseRow('al-noon', 'النون'),
    ...extra,
  ] });
}

test('the strip\'s names can be hidden one by one (👁), and a pinned video has «إخفاء هذا الفيديو عن الزوار»', () => {
  const schema = JSON.parse(read('src/admin/schema.json'));
  const cs = schema.sections.find((s) => s.name === 'clientsSection');
  assert.equal(cs.fields.find((f) => f.name === 'names').options?.hideable, true);
  const off = schema.sections.find((s) => s.name === 'offeringsSection');
  const pin = off.fields.find((f) => f.name === 'items').of[0].fields.find((f) => f.name === 'videos').of[0];
  const hide = pin.fields.find((f) => f.name === 'hide');
  assert.equal(hide?.type, 'boolean');
  const ui = read('src/admin/ui/Fields.tsx');
  assert.match(ui, /HideButton/);
  assert.match(ui, /f\.options\?\.hideable/);
});

test('saving keeps a hidden name hidden (not deleted) and a hidden video hidden', () => {
  const c = cleanSection('clientsSection', { names });
  assert.equal(c.names.length, 4);
  assert.equal(c.names[1].hidden, true);
  assert.equal(c.names[1].en, 'Tob & Tarha');
  assert.equal(c.names[2].hidden, undefined);
  const o = cleanSection('offeringsSection', offers);
  assert.equal(o.items[0].videos.length, 2);
  assert.equal(o.items[0].videos[1].hide, true);
  assert.equal(o.items[0].videos[0].hide, undefined);
});

test('visitors (and the admin preview, the same page) never get a hidden name or video', () => {
  for (const lang of ['ar', 'en']) {
    const home = buildView(snap(), lang, 'home');
    const strip = home.sections.find((s) => s.type === 'clientsSection');
    assert.deepEqual(strip.data.names, lang === 'ar' ? ['مساحات', 'مشوار', 'النون'] : ['Masahat', 'Mishwar', 'Al-Noon']);
    const ed = buildView(snap(), lang, 'home', { editor: true });
    assert.deepEqual(ed.sections.find((s) => s.type === 'clientsSection').data.names, strip.data.names);
    const svc = buildView(snap(), lang, 'services');
    const vids = svc.sections.find((s) => s.type === 'offeringsSection').data.items[0].videos;
    assert.equal(vids.length, 1);
    assert.doesNotMatch(JSON.stringify(svc.sections), /Tob & Tarha|ثوب وطرحة|tobtarha/);
  }
  assert.equal(withoutHiddenItems({ _type: 'heroSection', x: 1 }).x, 1);
});

test('a hidden story row hides the client everywhere: no page, no testimonial card, not in «قصص أخرى»', () => {
  for (const lang of ['ar', 'en']) {
    const v = buildView(snap(), lang, 'home');
    assert.deepEqual(v.ctx.cases.map((c) => c.slug), ['masahat', 'al-noon']);
    assert.deepEqual(T.testimonialCards(v.ctx.cases).map((c) => c.client), ['مساحات', 'النون']);
    assert.equal(buildView(snap(), lang, 'work', { caseSlug: 'tob-tarha' }).caseView, null);
    const others = otherClientCards(v.ctx.cases, 'masahat', []);
    assert.ok(!others.some((c) => /ثوب|Tob/.test(JSON.stringify(c))));
    assert.ok(!testimonialStories(v.ctx.cases).some((s) => /ثوب|Tob/.test(s.name)));
    // shown again: everything comes back
    const back = buildView(snap(false), lang, 'home');
    assert.deepEqual(back.ctx.cases.map((c) => c.slug), ['masahat', 'tob-tarha', 'al-noon']);
    assert.ok(buildView(snap(false), lang, 'work', { caseSlug: 'tob-tarha' }).caseView);
  }
});

test('a client of the «العملاء» list whose story row is hidden is hidden with it (not a client without its story)', () => {
  const stories = { id: 'st', page: 'home', type: 'clientStoriesSection', hidden: false, data: { clients: [
    { _key: 'kctob', _type: 'storyClient', caseKey: 'tob-tarha', name: ls('ثوب وطرحة', 'Tob & Tarha'), slug: 'tob-tarha', items: [], testimonial: { quote: lt('رأي', 'quote') } },
  ] } };
  const v = buildView(snap(true, [stories]), 'ar', 'home');
  assert.ok(!v.ctx.cases.some((c) => c.slug === 'tob-tarha'));
  // the admin selects the hidden row to edit it: it shows (dimmed) there
  const ed = buildView(snap(true, [stories]), 'ar', 'work', { editor: true, showHidden: 'tob-tarha', caseSlug: 'tob-tarha' });
  assert.ok(ed.caseView);
});
