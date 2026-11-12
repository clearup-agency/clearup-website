import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';

// Nov 8, 2026 batch (ClearUp's content file + Mohamed: «قم بتعديل كل اشي دفعة واحدة»): the five services (one source,
// Home shows them short), «أدوات نستخدمها» (one source), «من شغلنا» stories, testimonials as video + challenge/solution,
// the stats, «لا تناسبك إذا / تناسبك إذا», the real logo. Each new section: in the admin schema, drawn by one
// component, and the admin preview = the visitors' page.
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/');
// inside the repo (node_modules/.cache) so the bundles resolve react / next from the project's own packages
mkdirSync(root + 'node_modules/.cache', { recursive: true });
const dir = mkdtempSync(root + 'node_modules/.cache/cu-batch-');
const bundle = (entry, name, extra = {}) => {
  const out = path.join(dir, name);
  buildSync({ entryPoints: [entry.startsWith('/') ? entry : root + entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, logLevel: 'silent', jsx: 'automatic', loader: { '.tsx': 'tsx' }, ...extra });
  return import(pathToFileURL(out).href);
};
const read = (p) => readFileSync(root + p, 'utf8');
const P = await bundle('src/lib/pages.ts', 'pages.mjs');
const { buildView, snapshotToRaw } = await bundle('src/lib/view.ts', 'view.mjs');
const seed = JSON.parse(read('seed/content.json'));
const ls = (ar, en) => ({ ar, en, _type: 'localeString' });
const lt = (ar, en) => ({ ar, en, _type: 'localeText' });
const NEW_TYPES = ['workStoriesSection', 'offeringsSection', 'toolsSection', 'fitSection'];

function site() {
  const s = P.fromLegacy({ settings: seed.settings, sections: seed.sections });
  const row = (id, page, type, data) => ({ id, page, type, hidden: false, data });
  const offers = { title: ls('خمس خدمات', 'Five services'), items: [
    { _key: 'o1', id: 'innovation', title: ls('الابتكار', 'Innovation'), en: 'Innovation', desc: lt('وصف', 'Desc'), includes: [ls('بند', 'Item')], fits: lt('تناسب', 'Fits'), videos: [{ _key: 'v1', label: ls('شاهد', 'Watch'), video: { _type: 'file', url: '/media/story-alnoon.mp4' }, poster: { _type: 'image', url: '/media/story-alnoon.webp', width: 432, height: 768 } }] },
    { _key: 'o2', id: 'analysis', title: ls('التحليل', 'Analysis'), desc: lt('وصف', 'Desc'), includes: [], videos: [] },
  ] };
  const tools = { title: ls('أدوات نستخدمها', 'Tools we use'), items: [{ _key: 't1', name: ls('نموذج العمل', 'Business Model Canvas'), en: 'Business Model Canvas', desc: lt('خريطة', 'A map'), image: { _type: 'image', url: '/tools/business-model-canvas.svg', width: 400, height: 260 } }] };
  s.sections.push(
    row('kofferhome', 'home', 'offeringsSection', { compact: true }),
    row('ktoolshome', 'home', 'toolsSection', {}),
    row('kworkhome', 'home', 'workStoriesSection', { title: ls('من شغلنا', 'Our work'), groups: [{ _key: 'g1', name: ls('من محاضراتنا', 'From our lectures'), items: [{ _key: 'i1', video: { _type: 'file', url: '/media/story-emmar.mp4' }, caption: ls('سطر', 'Line') }] }] }),
    row('kfithome', 'home', 'fitSection', { noTitle: ls('لا تناسبك إذا…', 'Not for you if…'), no: [ls('أ', 'A')], yesTitle: ls('وتناسبك إذا…', 'For you if…'), yes: [ls('ب', 'B')] }),
    row('kstatshome', 'home', 'statsSection', { items: [{ v: ls('164%', '164%'), l: ls('نمو إيرادات لشركة حلول رقمية (خلال 3 أشهر)', 'revenue growth'), src: 'none' }] }),
    row('koffers', 'services', 'offeringsSection', offers),
    row('ktools', 'services', 'toolsSection', tools),
  );
  return s;
}
const json = (v) => JSON.stringify(v);

test('the new sections are in the admin schema and each is drawn by one component', () => {
  const schema = JSON.parse(read('src/admin/schema.json'));
  const names = schema.sections.map((x) => x.name);
  for (const t of NEW_TYPES) assert.ok(names.includes(t), t + ' in the admin');
  const secs = read('src/components/Sections.tsx');
  for (const t of NEW_TYPES) assert.equal((secs.match(new RegExp(`case '${t}'`, 'g')) || []).length, 1, t + ' rendered once');
  assert.ok(schema.settings.fields.some((f) => f.name === 'tagline'), 'the tagline under the logo is editable');
});

test('admin preview = visitors’ page with the new sections (ar + en, every page)', () => {
  const s = site();
  for (const lang of ['ar', 'en']) for (const page of ['home', 'services', 'work', 'about', 'contact']) {
    assert.equal(json(buildView(snapshotToRaw(s), lang, page, { editor: true, showHidden: null })), json(buildView(snapshotToRaw(s), lang, page)), `${lang}/${page}`);
  }
});

test('one source: Home’s short services and tools read the Services page’s sections', () => {
  const s = site();
  const home = buildView(snapshotToRaw(s), 'ar', 'home');
  const svc = buildView(snapshotToRaw(s), 'ar', 'services');
  const o = home.sections.find((x) => x.type === 'offeringsSection');
  const of = svc.sections.find((x) => x.type === 'offeringsSection');
  assert.equal(o.data.compact, true, 'Home keeps its own short layout');
  assert.ok(!of.data.compact);
  assert.deepEqual(o.data.items.map((i) => i.title), of.data.items.map((i) => i.title));
  const t = home.sections.find((x) => x.type === 'toolsSection');
  assert.equal(t.data.items[0].name, 'نموذج العمل');
  assert.equal(home.sections.find((x) => x.type === 'statsSection').data.items[0].l, 'نمو إيرادات لشركة حلول رقمية (خلال 3 أشهر)');
});

test('the components render: services (full + short), tools, fit, works stories — nothing empty shows', async () => {
  const entry = path.join(dir, 'entry.tsx');
  writeFileSync(entry, `import { renderToStaticMarkup } from 'react-dom/server';
import Offerings from '${root}src/components/Offerings';
import Tools from '${root}src/components/Tools';
import Fit from '${root}src/components/Fit';
import WorkStories from '${root}src/components/WorkStories';
export const html = (el) => renderToStaticMarkup(el);
export { Offerings, Tools, Fit, WorkStories };`);
  const R = await bundle(entry, 'render.mjs', { external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/server'] });
  const { createElement: h } = await import('react');
  const s = site();
  const svc = buildView(snapshotToRaw(s), 'ar', 'services');
  const home = buildView(snapshotToRaw(s), 'ar', 'home');
  const full = R.html(h(R.Offerings, { s: svc.sections.find((x) => x.type === 'offeringsSection').data, lang: 'ar' }));
  assert.match(full, /id="innovation"/);
  assert.match(full, /تشمل/);
  assert.match(full, /oserv--novid/, 'a service without a pinned video hides the video slot');
  const short = R.html(h(R.Offerings, { s: home.sections.find((x) => x.type === 'offeringsSection').data, lang: 'ar', servicesHref: '/ar/services/' }));
  assert.match(short, /href="\/ar\/services\/#innovation"/);
  const tools = R.html(h(R.Tools, { s: home.sections.find((x) => x.type === 'toolsSection').data, lang: 'ar' }));
  assert.match(tools, /loading="lazy"/);
  assert.match(tools, /<dialog/);
  assert.match(tools, /Business Model Canvas/);
  const fit = R.html(h(R.Fit, { s: home.sections.find((x) => x.type === 'fitSection').data }));
  assert.match(fit, /لا تناسبك إذا/);
  assert.equal(R.html(h(R.Fit, { s: {} })), '');
  const ws = R.html(h(R.WorkStories, { s: home.sections.find((x) => x.type === 'workStoriesSection').data, lang: 'ar' }));
  assert.match(ws, /class="sring tring/);
  assert.match(ws, /من محاضراتنا/);
});

test('testimonials: a client shows with its video and a challenge or solution; nothing invented', async () => {
  const { testimonialCards } = await bundle('src/lib/testimonials.ts', 'testimonials.mjs');
  assert.match(read('src/components/pages/Proof.tsx'), /testimonialCards\(ctx\.cases, s\.order\)/);
  const mk = (key, data) => ({ key, slug: key, href: '/ar/work/' + key + '/', data: { client: key, featured: true, ...data } });
  const cards = testimonialCards([
    mk('a', { tvideo: { video: '/a.mp4' }, problem: 'تحدي', did: ['حل'] }),
    mk('b', { tvideo: { video: '/b.mp4' } }), // an ad with no challenge/solution: not a testimonial card
    mk('c', { problem: 'تحدي' }), // no video
  ]);
  assert.deepEqual(cards.map((c) => c.key), ['a']);
  assert.equal(cards[0].challenge, 'تحدي');
  assert.equal(cards[0].solution, 'حل');
});

test('the real vector logo in header, footer and favicon; no «200 ألف» anywhere in the code', () => {
  const brand = read('src/components/Brand.tsx');
  assert.match(brand, /\/brand\/clearup-logo\.svg/);
  assert.match(brand, /\/brand\/clearup-logo-white\.svg/);
  for (const f of ['public/brand/clearup-logo.svg', 'public/brand/clearup-logo-white.svg', 'public/brand/mark.svg']) {
    const svg = read(f);
    assert.match(svg, /^<svg /);
    assert.ok(svg.length < 12000, f + ' stays small');
  }
  assert.match(read('public/brand/clearup-logo.svg'), /#5C2096/);
  for (const t of ['business-model-canvas', 'value-proposition-canvas', 'portfolio-programs-culture', 'culture-map']) assert.match(read(`public/tools/${t}.svg`), /#5C2096/);
  for (const f of ['src/components/WorkStories.tsx', 'src/components/Offerings.tsx', 'src/components/pages/Proof.tsx']) assert.doesNotMatch(read(f), /200 ألف|200k|200,000/);
});

test('batch 2 (Mohamed, 3:47 PM): «كيف نعمل» and «منتجاتنا» are admin sections drawn once; section numbers off by default', async () => {
  const schema = JSON.parse(read('src/admin/schema.json'));
  const names = schema.sections.map((x) => x.name);
  for (const t of ['processSection', 'productsSection']) {
    assert.ok(names.includes(t), t);
    assert.equal((read('src/components/Sections.tsx').match(new RegExp(`case '${t}'`, 'g')) || []).length, 1);
  }
  assert.ok(schema.settings.fields.some((f) => f.name === 'showNumbers'));
  const s = site();
  s.sections.push({ id: 'kproc', page: 'services', type: 'processSection', hidden: false, data: { path: [ls('الفرصة', 'Opportunity')], steps: [{ _key: 'a', t: ls('مكالمة وضوح', 'Clarity call') }] } },
    { id: 'kproch', page: 'home', type: 'processSection', hidden: false, data: {} });
  const home = buildView(snapshotToRaw(s), 'ar', 'home');
  assert.equal(home.sections.find((x) => x.type === 'processSection').data.steps[0].t, 'مكالمة وضوح', 'Home reads the Services process');
  for (const x of home.sections) assert.ok(!x.data.index, `${x.type}: no number badge`);
  s.settings = { ...s.settings, showNumbers: true };
  assert.ok(buildView(snapshotToRaw(s), 'ar', 'home').sections.some((x) => x.data.index === '01'), 'the setting turns them back on');
});

test('batch 2: the chatbot says only what ClearUp’s file says — no 8×, no 30-minute call, no guarantee, the doc’s WhatsApp', () => {
  const kb = read('src/content/chatbot.ts');
  assert.doesNotMatch(kb, /8×|8 أضعاف|60 يوم|30 دقيقة|30-minute|نعيد الرسوم|refund/);
  assert.match(kb, /164%/);
  assert.match(read('src/content/index.ts'), /wa\.me\/905824005288/);
  assert.doesNotMatch(read('src/lib/chat-ai.ts'), /30-minute/);
});
