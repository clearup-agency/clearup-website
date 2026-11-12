import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';
// The site polish (Nov 2026): "empty = hidden" rules for visitors, the stories auto-hide rule, testimonial
// helpers, WhatsApp text, section numbering, and the idempotent copy pass (src/lib/polish.ts).
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/');
const dir = mkdtempSync(path.join(tmpdir(), 'cu-rules-'));
const bundle = (entry, name) => {
  const out = path.join(dir, name);
  buildSync({ entryPoints: [root + entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, logLevel: 'silent' });
  return import(pathToFileURL(out).href);
};
const R = await bundle('src/lib/rules.ts', 'rules.mjs');
const { polishContent, PROMISE, HOME_FAQ_ID, TEAM_PLACEHOLDERS } = await bundle('src/lib/polish.ts', 'polish.mjs');
const await_team = { TEAM_PLACEHOLDERS };
const P = await bundle('src/lib/pages.ts', 'pages.mjs');
const { buildView, snapshotToRaw } = await bundle('src/lib/view.ts', 'view.mjs');
const seed = JSON.parse(readFileSync(root + 'seed/content.json', 'utf8'));

const work = (n) => ({ _key: 'w' + n, image: { src: `https://res.cloudinary.com/x/image/upload/v1/real/${n}.jpg` } });
const client = (name, works) => ({ _key: name, name: { ar: name, en: name }, items: Array.from({ length: works }, (_, i) => work(name + i)) });
const sample = { _key: 's', logo: { src: 'https://res.cloudinary.com/x/image/upload/stories-sample/a.png' }, items: [{ image: { src: 'https://res.cloudinary.com/x/stories-sample/1.jpg' } }, { image: { src: 'https://res.cloudinary.com/x/stories-sample/2.jpg' } }] };

test('stories show from one real client with one work (Nov 8: the 3×2 wait is gone)', () => {
  assert.equal(R.STORIES_MIN_CLIENTS, 1);
  assert.equal(R.STORIES_MIN_WORKS, 1);
  assert.equal(R.storiesForVisitors([]).show, false);
  assert.equal(R.storiesForVisitors(null).show, false);
  // one real client with one work: shown
  const r1 = R.storiesForVisitors([client('a', 1)]);
  assert.equal(r1.show, true); assert.equal(r1.ready, 1); assert.deepEqual(r1.clients.map((c) => c._key), ['a']);
  // empty and sample clients never show and never count
  const r2 = R.storiesForVisitors([client('a', 2), client('d', 1), client('e', 0), sample]);
  assert.deepEqual(r2.clients.map((c) => c._key), ['a', 'd']);
  assert.equal(R.storiesForVisitors([client('e', 0), sample, sample]).show, false);
  assert.equal(R.isSampleClient(sample), true);
  assert.equal(R.isSampleClient(client('a', 2)), false);
});

test('placeholders are left out for visitors: [bracketed] text becomes empty, lists drop empties, keys stay', () => {
  const v = R.scrub({ _key: 'k', a: 'نرد خلال 24 ساعة [وعد يؤكده ClearUp]', b: 'ok', list: ['x', '[؟]', ''], o: { t: '[x]' } });
  assert.equal(v._key, 'k'); assert.equal(v.a, ''); assert.equal(v.b, 'ok'); assert.deepEqual(v.list, ['x']); assert.equal(v.o.t, '');
});

test('FAQ: every real question shows, its answer without the [placeholder] parts; limit keeps the first N', () => {
  const items = [{ q: 'كم؟', a: '[سعر]' }, { q: 'متى؟', a: 'غداً' }, { q: '', a: 'x' }, { q: 'أين؟', a: 'غزة' }, { q: 'من؟', a: 'نحن' },
    { q: 'السعر؟', a: '[نطاق أسعار تقريبي يحدده ClearUp]، والسعر النهائي بعد مكالمة الوضوح.' }, { q: 'المدة؟', a: '[أقل مدة]. نقترح 90 يوماً.' },
    { q: 'خارج فلسطين؟', a: 'نعم. [الدول التي يعملون فيها].' }, { q: '[سؤال؟]', a: 'x' }];
  const out = R.faqItems(items);
  // a question whose answer is only a placeholder still hides; one with real words beside the placeholder shows
  assert.deepEqual(out.map((x) => x.q), ['متى؟', 'أين؟', 'من؟', 'السعر؟', 'المدة؟', 'خارج فلسطين؟']);
  assert.equal(out[3].a, 'السعر النهائي بعد مكالمة الوضوح.');
  assert.equal(out[4].a, 'نقترح 90 يوماً.');
  assert.equal(out[5].a, 'نعم.');
  assert.deepEqual(R.faqItems(items, 2).map((x) => x.q), ['متى؟', 'أين؟']);
  assert.deepEqual(R.faqItems(null), []);
  assert.equal(R.faqAnswer('[An approximate range set by ClearUp], and the final price after the call.'), 'The final price after the call.');
  assert.equal(R.faqAnswer('[x]'), '');
});

test('testimonial cards: lead number only when real; «القصة كاملة» only when there is a story; cover ≠ video', () => {
  assert.equal(R.leadMetric([{ v: '[؟]', l: 'x' }, { v: '8×', l: 'نمو العائد' }]).v, '8×');
  assert.equal(R.leadMetric([{ v: '[؟]', l: '[المقياس]' }]), null);
  assert.equal(R.hasStory({ problem: '[المشكلة]', result: '[النتيجة]', metrics: [{ v: '[؟]', l: 'x' }] }), false);
  assert.equal(R.hasStory({ problem: 'كانت المبيعات ضعيفة' }), true);
  assert.equal(R.hasStory({ works: [work(1)] }), true);
  assert.equal(R.hasStory(null), false);
  const vid = { link: 'https://www.instagram.com/reel/Del5aadglDH/', image: { src: '/media/story-masahat.webp' } };
  assert.equal(R.sameMedia({ src: '/media/story-masahat.webp' }, vid), true);
  assert.equal(R.sameMedia({ src: '/media/other.webp' }, vid), false);
  assert.equal(R.sameMedia(null, vid), false);
});

test('a figure with a times sign keeps its typed order in Arabic (8× never shows as ×8)', () => {
  assert.equal(R.numDir('8×'), 'ltr');
  assert.equal(R.numDir('100+'), undefined);
  assert.equal(R.numDir(null), undefined);
});

test('section numbers run 01, 02, 03 in page order over the sections that show one', () => {
  assert.deepEqual(R.sectionNumbers([{ data: { index: '04' } }, { data: {} }, { data: { index: '09' } }, { data: { index: ' ' } }, { data: { index: '02' } }]), ['01', null, '02', null, '03']);
});

test('WhatsApp links open with a ready message in the page language, once', () => {
  const ar = R.waWithText('https://wa.me/970599000000', 'ar');
  assert.ok(ar.startsWith('https://wa.me/970599000000?text='));
  assert.equal(decodeURIComponent(ar.split('text=')[1]), R.WA_TEXT.ar);
  assert.ok(decodeURIComponent(R.waWithText('https://wa.me/1', 'en')).includes('free call'));
  assert.equal(R.waWithText('https://wa.me/1?text=hi', 'ar'), 'https://wa.me/1?text=hi');
  assert.equal(R.waWithText('', 'ar'), '');
});

const legacy = P.fromLegacy({ settings: seed.settings, sections: seed.sections });
test('copy pass: new hero, «آراء العملاء», promise, Arabic in /ar, new home order — and idempotent', () => {
  const home = legacy.sections.filter((s) => (s.page || 'home') === 'home' && !s.hidden).map((s) => s.type);
  // hero → logos → problem → system → stories → testimonials → questions → book
  const want = ['heroSection', 'clientsSection', 'problemSection', 'systemSection', 'clientStoriesSection', 'proofSection', 'faqSection', 'ctaBandSection'];
  assert.deepEqual(home.filter((t) => want.includes(t)), want);
  assert.ok(!home.includes('servicesTeaserSection'));
  const hero = legacy.sections.find((s) => s.type === 'heroSection').data;
  assert.equal(hero.kicker.ar, 'وكالة تسويق ونمو'); // Nov 9, 2026: no «غزة» in the hero line (Munim)
  assert.equal(hero.lead.ar, 'نحوّل ميزانية تسويقك إلى نظام يجلب لك عملاء، وتعرف بالأرقام من أين جاء كل عميل.');
  const proof = legacy.sections.find((s) => s.type === 'proofSection').data;
  assert.equal(proof.eyebrow.ar, 'آراء العملاء'); assert.equal(proof.title.ar, 'نتائج بأسماء أصحابها.');
  // Nov 8: Home's FAQ is the whole site FAQ (the same questions as Services), not a «first 3» copy
  assert.equal(legacy.sections.find((s) => s.id === HOME_FAQ_ID).data.limit, undefined);
  // a second pass changes nothing
  const again = polishContent(legacy);
  assert.deepEqual(again.changes, []);
  assert.deepEqual(again.content, legacy);
});

test('copy pass never touches what the admin wrote himself, and never invents a figure', () => {
  const own = JSON.parse(JSON.stringify(legacy));
  const h = own.sections.find((s) => s.type === 'heroSection');
  h.data.kicker = { _type: 'localeString', ar: 'نص كتبه محمد', en: 'Mohamed’s own words' };
  h.data.stats = [{ v: { ar: '50+', en: '50+' }, l: { ar: 'عميل', en: 'clients' }, src: 'site' }];
  const { content } = polishContent(own);
  const h2 = content.sections.find((s) => s.type === 'heroSection').data;
  assert.equal(h2.kicker.ar, 'نص كتبه محمد');
  assert.deepEqual(h2.stats, h.data.stats);
  // the single hero figure, when set, is the one already on Al Noon's page (8× in 60 days)
  for (const st of legacy.sections.find((s) => s.type === 'heroSection').data.stats ?? []) assert.equal(st.v.ar, '8×');
});

test('visitors never see the concept chip, the footer concept line or a placeholder; the admin preview does', () => {
  const raw = snapshotToRaw(legacy);
  const pub = buildView(raw, 'ar', 'home');
  const pre = buildView(raw, 'ar', 'home', { preview: true });
  assert.equal(pub.base.showConcept, false);
  assert.equal(pub.base.footer.concept, '');
  const texts = (o, out = []) => { if (typeof o === 'string') out.push(o); else if (o && typeof o === 'object') for (const x of Object.values(o)) texts(x, out); return out; };
  const ph = (v) => texts(v.sections.map((s) => s.data)).filter((x) => /\[[^\]]*\]/.test(x));
  assert.deepEqual(ph(pub), [], 'no [placeholder] in the public view');
  assert.ok(ph(pre).length > 0, 'the preview keeps them');
  // stories: the sample clients only → hidden for visitors, shown (with the rule note) in the preview
  assert.ok(!pub.sections.some((s) => s.type === 'clientStoriesSection'));
  assert.ok(pre.sections.some((s) => s.type === 'clientStoriesSection'));
});

test('About: the real team names become fictional placeholder names (Nov 8); roles stay; a name typed by the admin stays', () => {
  const content = { settings: {}, sections: [{ id: 't', page: 'about', type: 'teamSection', hidden: false, data: { members: [
    { name: { ar: 'يحيى أبو ندى', en: 'Yahya Abunada' }, role: { ar: 'CTO', en: 'CTO' } },
    { name: { ar: 'لينا الشرفا', en: 'Lina Alshurafa' }, role: { ar: 'التسويق', en: 'Marketing' } },
    { name: { ar: 'اسم كتبه الأدمن', en: 'Admin name' }, role: { ar: 'x', en: 'x' } },
  ] } }] };
  const { content: out } = polishContent(content);
  const m = out.sections[0].data.members;
  assert.deepEqual(m.map((x) => x.name.ar), ['سامر خليل', 'سارة نبيل', 'اسم كتبه الأدمن']);
  assert.deepEqual(m.map((x) => x.name.en), ['Samer Khalil', 'Sara Nabil', 'Admin name']);
  assert.equal(m[0].role.ar, 'المدير التقني');
  // idempotent
  assert.equal(polishContent(out).changes.length, 0);
  const { TEAM_PLACEHOLDERS } = await_team;
  for (const [ar, en, toAr, toEn] of TEAM_PLACEHOLDERS) { assert.notEqual(ar, toAr); assert.notEqual(en, toEn); }
});
