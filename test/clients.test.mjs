import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';
// One record per client: stories = works only (avatar → its page), «آراء العملاء» = quote + video (+ link),
// the client page = challenge / solution / results / works / testimonial. Older case studies keep showing.
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/');
const dir = mkdtempSync(path.join(tmpdir(), 'cu-clients-'));
const bundle = (entry, name) => {
  const out = path.join(dir, name);
  buildSync({ entryPoints: [root + entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, logLevel: 'silent' });
  return import(pathToFileURL(out).href);
};
const P = await bundle('src/lib/pages.ts', 'pages.mjs');
const C = await bundle('src/lib/clients.ts', 'clients.mjs');
const { buildView, snapshotToRaw } = await bundle('src/lib/view.ts', 'view.mjs');
const seed = JSON.parse(readFileSync(root + 'seed/content.json', 'utf8'));
const read = (f) => readFileSync(root + f, 'utf8');
const ls = (ar, en = '') => ({ _type: 'localeString', ar, en });
const lt = (ar, en = '') => ({ _type: 'localeText', ar, en });
const site = () => structuredClone(P.fromLegacy({ settings: seed.settings, sections: seed.sections }));
const view = (c, lang, page, opts) => buildView(snapshotToRaw(c), lang, page, opts);
const home = (c) => c.sections.find((s) => s.type === 'clientStoriesSection' && !s.data.mirror);
const full = () => ({
  _key: 'kfull', _type: 'storyClient', name: ls('مطعم السرايا', 'Saraya Restaurant'),
  logo: { _type: 'image', url: 'https://res.cloudinary.com/x/image/upload/v1/logo.png' },
  items: [{ _key: 'w1', _type: 'storyItem', image: { _type: 'image', url: 'https://res.cloudinary.com/x/image/upload/v1/w1.jpg' } }],
  testimonial: { quote: lt('من أول شهر تضاعفت الطلبات', 'Orders doubled in a month'), name: ls('أحمد'), role: ls('المالك'),
    item: { _type: 'storyItem', video: { _type: 'file', url: 'https://res.cloudinary.com/x/video/upload/v1/t.mp4' } } },
  story: { challenge: lt('متابعين بدون مبيعات'), solution: lt('هوية جديدة\nحملة'), results: [{ _key: 'r1', _type: 'metric', v: ls('+120%'), l: ls('المبيعات') }] },
});

test('clients: a client with all three parts gets a page, a testimonial card and a story with works only', () => {
  const c = site();
  home(c).data.clients = [...home(c).data.clients, full()];
  const v = view(c, 'ar', 'home');
  const rec = v.ctx.cases.find((x) => x.slug === 'saraya-restaurant');
  assert.ok(rec, 'page exists at /ar/work/saraya-restaurant/');
  assert.equal(rec.href, '/ar/work/saraya-restaurant/');
  assert.ok(rec.data.isCase && rec.data.hasTestimonial);
  assert.equal(rec.data.problem, 'متابعين بدون مبيعات');
  assert.equal(rec.data.metrics[0].v, '+120%');
  assert.equal(rec.data.tvideo.video, 'https://res.cloudinary.com/x/video/upload/v1/t.mp4');
  assert.equal(rec.data.works.length, 1);
  assert.equal(v.ctx.clientHref.kfull, '/ar/work/saraya-restaurant/', 'story avatar links to the page');
  // the case page view resolves it, in both languages
  assert.equal(view(c, 'en', 'work', { caseSlug: 'saraya-restaurant' }).caseView?.data.client, 'Saraya Restaurant');
  // stories get works only: the viewer's client carries no testimonial
  const src = read('src/components/ClientStories.tsx');
  assert.match(src, /items: \(c\.items \?\? \[\]\)\.filter\(hasMedia\), href:/);
  assert.match(src, /sview__who--link/);
});

test('clients: empty parts stay hidden (works only → a page with works, no card, not on the Work list)', () => {
  const c = site();
  const only = { ...full(), _key: 'konly', name: ls('عميل أعمال', 'Works Only'), testimonial: { quote: lt('') }, story: { challenge: lt('') } };
  home(c).data.clients = [only];
  const rec = view(c, 'ar', 'work').ctx.cases.find((x) => x.slug === 'works-only');
  assert.ok(rec && rec.data.hasPage);
  assert.equal(rec.data.isCase, false);
  assert.equal(rec.data.hasTestimonial, false);
  // a client with nothing at all gets no page
  home(c).data.clients = [{ _key: 'knone', name: ls('فاضي', 'Empty'), items: [] }];
  assert.ok(!view(c, 'ar', 'work').ctx.cases.some((x) => x.slug === 'empty'));
});

test('clients: older case studies keep showing (testimonial video + name), merge by name, deletable', () => {
  const c = site();
  const v0 = view(c, 'ar', 'home');
  const masahat = v0.ctx.cases.find((x) => x.slug === 'masahat');
  assert.ok(masahat?.data.hasTestimonial, 'the Masahat reel is still a testimonial');
  assert.ok(masahat.data.tvideo.link.includes('instagram.com'));
  // a client with the same name takes over: its works join the case's page, its own quote wins
  home(c).data.clients = [{ _key: 'km', _type: 'storyClient', name: ls('مساحات', 'Masahat'), items: full().items, testimonial: { quote: lt('كلام حقيقي') } }];
  const m = view(c, 'ar', 'home').ctx.cases.filter((x) => x.slug.startsWith('masahat'));
  assert.equal(m.length, 1, 'one record, not two');
  assert.equal(m[0].data.testimonial.quote, 'كلام حقيقي');
  assert.equal(m[0].data.works.length, 1);
  assert.ok(m[0].data.tvideo.link.includes('instagram.com'), 'the case video fills the gap');
  // deleted from «العملاء» (removedCases) → gone from the site
  home(c).data.clients = [];
  home(c).data.removedCases = [c.sections.find((s) => s.type === P.CASE_TYPE && s.data.slug === 'tob-tarha').id];
  assert.ok(!view(c, 'ar', 'home').ctx.cases.some((x) => x.slug === 'tob-tarha'));
});

test('clients: case rows appear on the «العملاء» screen with only real words; slugs are unique', () => {
  const c = site();
  const list = C.unclaimedCases(c.sections);
  assert.equal(list.length, 4);
  const m = list.find((x) => x.slug === 'masahat');
  assert.equal(m.caseKey.length > 0, true);
  assert.equal(m.story.challenge.ar, '', 'placeholders stay out of the form');
  assert.ok(m.testimonial.item.link.includes('instagram.com'));
  // a saved copy of it is the same client (by caseKey): no duplicate
  home(c).data.clients = [m];
  assert.equal(C.unclaimedCases(c.sections).length, 3);
  assert.equal(view(c, 'ar', 'home').ctx.cases.filter((x) => x.slug.startsWith('masahat')).length, 1);
  // two clients with the same English name get distinct addresses
  home(c).data.clients = [{ ...full(), _key: 'a1' }, { ...full(), _key: 'a2' }];
  const slugs = view(c, 'ar', 'home').ctx.cases.map((x) => x.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test('clients: «آراء العملاء» reads the records; the client page has the works grid and testimonial', () => {
  const proof = read('src/components/pages/Proof.tsx') + read('src/components/pages/TestimonialCard.tsx');
  assert.match(read('src/lib/testimonials.ts'), /c\.data\.tvideo/); // a client with its testimonial video (Nov 8 batch: video + التحدي / الحل)
  assert.match(proof, /testimonialCards/);
  assert.match(proof, /VideoPlayer/); // Nov 11, 2026: plays in the card (the one video component)
  assert.match(proof, /href: c\.href/); // the client page link sits in the «القصة كاملة» panel (Nov 8, second round)
  const page = read('src/components/pages/CasePage.tsx');
  assert.match(page, /StoryGrid/);
  assert.match(page, /labels\.testimonial/);
  assert.match(page, /labels\.works/);
  // the sitemap / static params list the client pages too
  const c = site();
  home(c).data.clients = [full()];
  const cms = read('src/lib/cms.ts');
  assert.match(cms, /clientRecords\(rawSections\(c\.sections\)\)/);
  assert.ok(C.clientRecords(C.rawSections(c.sections)).some((r) => r.slug === 'saraya-restaurant' && r.hasPage));
});

test('clients: admin = one screen per client with «الأعمال», «رأي العميل», «قصة المشروع» and one «حفظ ونشر»', () => {
  const m = read('src/admin/ui/StoriesManager.tsx');
  for (const t of ['title="الأعمال"', 'title="رأي العميل', 'title="قصة المشروع"']) assert.ok(m.includes(t), t);
  assert.match(m, /function OneMedia/);
  const pg = read('src/admin/ui/StoriesPage.tsx');
  assert.match(pg, /حفظ ونشر/);
  assert.match(pg, /slugFor/);
  assert.match(read('src/admin/actions.ts'), /removedCases/);
});

test('a client page added after the build renders on first visit: no dynamicParams = false above work/[slug] in the server build', () => {
  assert.doesNotMatch(read('src/app/[lang]/layout.dyn.tsx'), /dynamicParams/);
  assert.doesNotMatch(read('src/app/[lang]/layout.shared.tsx'), /export const dynamicParams/);
  assert.match(read('src/app/[lang]/layout.static.tsx'), /dynamicParams = false/);
  assert.match(read('src/app/[lang]/work/[slug]/page.dyn.tsx'), /dynamicParams = true/);
  assert.match(read('src/app/[lang]/layout.shared.tsx'), /notFound\(\)/, 'unknown languages still 404');
});
