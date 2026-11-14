import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';

// Nov 8, 2026, second round (Mohamed 4:49 PM): the intro clip closes on a tap outside, an endless logos row, the
// problem's before/after, the growth-path «كيف نعمل» (one component, one source), testimonials with one short line +
// «القصة كاملة», no dead viewer arrows, dark / purple bands, «أعمالنا» shows «من شغلنا» (Home's stories) and no
// text-only programme card. Admin preview = visitors' page throughout.
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/');
mkdirSync(root + 'node_modules/.cache', { recursive: true });
const dir = mkdtempSync(root + 'node_modules/.cache/cu-r2-');
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
const json = (v) => JSON.stringify(v);

function site() {
  const s = P.fromLegacy({ settings: seed.settings, sections: seed.sections });
  const row = (id, page, type, data, hidden = false) => ({ id, page, type, hidden, data });
  const pain = s.sections.find((x) => x.type === 'problemSection');
  if (pain) Object.assign(pain.data, {
    quote: lt('التمويل والأفكار الجيدة لا تصنع النجاح وحدها', 'Funding and good ideas'), quoteBy: ls('المؤسس', 'Founder'),
    beforeTitle: ls('بدون نظام', 'Without a system'), before: [ls('طلب عشوائي', 'Random demand')],
    afterTitle: ls('ما يبقى لديك', 'What stays'), after: [ls('فريق مدرّب', 'A trained team')],
    design: { tone: 'dark' },
  });
  s.sections.push(
    row('kworkhome', 'home', 'workStoriesSection', { title: ls('من شغلنا', 'Our work'), groups: [{ _key: 'g1', name: ls('من محاضراتنا', 'From our lectures'), items: [{ _key: 'i1', video: { _type: 'file', url: '/media/story-emmar.mp4' } }] }] }),
    row('kproofhome', 'home', 'proofSection', { title: ls('عملاؤنا يحكون.', 'Our clients'), limit: 3, all: ls('كل الأعمال', 'All our work'), design: { tone: 'dark' } }),
    row('kprocess', 'services', 'processSection', { title: ls('من الفرصة إلى النمو', 'From opportunity to growth'), path: [ls('الفرصة', 'Opportunity'), ls('النمو', 'Growth')], steps: [{ _key: 'a', t: ls('مكالمة وضوح', 'Clarity call'), d: lt('نستمع', 'We listen') }, { _key: 'b', t: ls('القياس', 'Measure') }] }),
    row('kprochome', 'home', 'processSection', {}),
    row('kworkwork', 'work', 'workStoriesSection', {}),
    row('kproofwork', 'work', 'proofSection', { title: ls('عملاؤنا يحكون.', 'Our clients'), design: { tone: 'dark' } }),
  );
  return s;
}

test('admin preview = visitors’ page with this round’s sections (ar + en, every page)', () => {
  const s = site();
  for (const lang of ['ar', 'en']) for (const page of ['home', 'services', 'work', 'about', 'contact']) {
    assert.equal(json(buildView(snapshotToRaw(s), lang, page, { editor: true, showHidden: null })), json(buildView(snapshotToRaw(s), lang, page)), `${lang}/${page}`);
  }
});

test('one source: «أعمالنا» shows Home’s «من شغلنا» stories and Home’s testimonials (keeping its own limit / button)', () => {
  const s = site();
  const home = buildView(snapshotToRaw(s), 'ar', 'home');
  const work = buildView(snapshotToRaw(s), 'ar', 'work');
  const hw = home.sections.find((x) => x.type === 'workStoriesSection');
  const ww = work.sections.find((x) => x.type === 'workStoriesSection');
  assert.ok(ww, 'the Work page has the works stories');
  assert.equal(ww.data.title, hw.data.title);
  assert.deepEqual(ww.data.groups.map((g) => g.name), hw.data.groups.map((g) => g.name));
  const hp = home.sections.find((x) => x.type === 'proofSection');
  const wp = work.sections.find((x) => x.type === 'proofSection');
  assert.equal(wp.data.title, hp.data.title);
  assert.equal(hp.data.limit, 3);
  assert.equal(wp.data.limit, undefined, 'Work shows every testimonial');
  assert.equal(wp.data.all, undefined, 'no «كل الأعمال» button on the Work page itself');
  // and «كيف نعمل» on Home reads the Services page's section
  const hpr = home.sections.find((x) => x.type === 'processSection');
  assert.equal(hpr.data.steps[0].t, 'مكالمة وضوح');
});

test('the problem section has the before / after + quote fields in the admin and renders them', async () => {
  const schema = JSON.parse(read('src/admin/schema.json'));
  const ps = schema.sections.find((x) => x.name === 'problemSection');
  for (const f of ['quote', 'quoteBy', 'beforeTitle', 'before', 'afterTitle', 'after']) assert.ok(ps.fields.some((x) => x.name === f), f);
  const entry = path.join(dir, 'entry.tsx');
  writeFileSync(entry, `import { renderToStaticMarkup } from 'react-dom/server';
import Pain from '${root}src/components/Pain';
import Process from '${root}src/components/Process';
import Clients from '${root}src/components/Clients';
import Sections from '${root}src/components/Sections';
export const html = (el) => renderToStaticMarkup(el);
export { Pain, Process, Clients, Sections };`);
  const R = await bundle(entry, 'render.mjs', { external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/server', 'next/*'] });
  const { createElement: h } = await import('react');
  const home = buildView(snapshotToRaw(site()), 'ar', 'home');
  const pain = home.sections.find((x) => x.type === 'problemSection');
  const out = R.html(h(R.Pain, { d: pain.d }));
  assert.match(out, /class="vs"/);
  assert.match(out, /vs__col--before/);
  assert.match(out, /vs__col--after/);
  assert.match(out, /pain__quote/);
  // the growth path: one list item per step, each with its stage, a node and a card
  const svc = buildView(snapshotToRaw(site()), 'ar', 'services');
  const pr = R.html(h(R.Process, { s: svc.sections.find((x) => x.type === 'processSection').data }));
  assert.equal((pr.match(/class="gp__item/g) || []).length, 2);
  assert.match(pr, /gp__stage">الفرصة/);
  assert.match(pr, /gp__node/);
  // the logos row: two identical groups (the second hidden from screen readers), long enough to loop
  const cl = R.html(h(R.Clients, { d: { clients: { label: 'شركات وثقت بنا', names: ['أ', 'ب', 'ج'] } } }));
  const groups = cl.match(/<ul class="marquee__group"[^>]*>(.*?)<\/ul>/g) || [];
  assert.equal(groups.length, 2);
  assert.equal(groups[0].replace(/ aria-hidden="true"/g, ''), groups[1].replace(/ aria-hidden="true"/g, ''));
  assert.ok((groups[0].match(/<li/g) || []).length >= 10, 'each group repeats the names');
  // a band: the section sits in a box-less tone wrapper, right after its markers
  const banded = R.html(h(R.Sections, { sections: [pain], ctx: home.ctx }));
  assert.match(banded, /^<div class="tone tone--dark"><section class="pain section"/);
});

test('logos row CSS: the track moves exactly one group, each group carries its own trailing gap, still for reduced motion', () => {
  const css = read('src/app/globals.css');
  assert.match(css, /@keyframes marquee \{ from \{ transform: translate3d\(0, 0, 0\); \} to \{ transform: translate3d\(-50%, 0, 0\); \} \}/);
  assert.match(css, /\.marquee__group \{ display: flex; flex: none; gap: 56px; padding-inline-end: 56px; \}/);
  assert.match(css, /html\[dir="rtl"\] \.marquee__track \{ animation-direction: reverse; \}/);
  assert.match(css, /prefers-reduced-motion: reduce\)[^}]*\{[\s\S]*?\.marquee__track \{ animation: none; \}/);
});

test('intro clip: opens in the story-like window; Esc, × or a tap outside it closes it (Nov 14)', () => {
  assert.match(read('src/components/ClipCard.tsx'), /<VideoPlayer variant="clip"[\s\S]*\bmodal\b/);
  const vp = read('src/components/VideoPlayer.tsx');
  assert.match(vp, /e\.key === 'Escape'\) setOn\(false\)/);
  assert.match(vp, /if \(e\.target === e\.currentTarget\) setOn\(false\)/);
});

test('testimonials: one short line on the card, the whole story in «القصة كاملة»; no viewer arrows for a single video', async () => {
  const { testimonialCards } = await bundle('src/lib/testimonials.ts', 'testimonials.mjs');
  const [c] = testimonialCards([{ key: 'n', href: '/ar/work/al-noon/', data: { client: 'النون', tvideo: { video: '/x.mp4' }, problem: 'طلب عشوائي', solution: 'نظام', summary: 'نمو 164%', result: 'نمو الإيرادات' } }]);
  assert.equal(c.short, 'نمو 164%');
  const [d] = testimonialCards([{ key: 'm', href: '', data: { client: 'مساحات', tvideo: { video: '/y.mp4' }, problem: 'طلاب يبحثون عن دخل' } }]);
  assert.equal(d.short, 'طلاب يبحثون عن دخل', 'no summary → the challenge sentence');
  const proof = read('src/components/pages/Proof.tsx') + read('src/components/pages/TestimonialCard.tsx');
  assert.match(proof, /className="tvcard__short"/);
  assert.match(proof, /<StoryMore /);
  assert.doesNotMatch(proof, /className="tvcard__part/, 'the challenge / solution text is no longer under the video');
  const more = read('src/components/StoryMore.tsx');
  assert.match(more, /<dialog/);
  assert.match(more, /showModal\(\)/);
  const comp = read('src/components/ClientStories.tsx');
  assert.match(comp, /const many = clients\.reduce/);
  assert.match(comp, /\{many && <button type="button" className="sview__side sview__side--prev"/);
  assert.match(comp, /\{many && <button type="button" className="sview__side sview__side--next"/);
});

test('«أعمالنا»: no text-only programme cards; bands are an admin choice', () => {
  const wi = read('src/components/pages/WorkIndex.tsx');
  assert.doesNotMatch(wi, /textOnly|wtext__card/);
  const content = read('src/admin/content.ts');
  assert.match(content, /name: 'tone', title: 'لون القسم'/);
  const design = read('src/lib/design.ts');
  assert.match(design, /export function toneOf/);
});
