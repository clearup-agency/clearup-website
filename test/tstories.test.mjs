// «آراء العملاء» as Instagram stories (Nov 8, 2026): the testimonial list, posters (no black circles), the
// one-page site's own video files instead of Instagram's embed, and the wiring to the one story viewer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/');
const dir = mkdtempSync(path.join(tmpdir(), 'cu-tst-'));
const bundle = (entry, name) => {
  const out = path.join(dir, name);
  buildSync({ entryPoints: [root + entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, logLevel: 'silent' });
  return import(pathToFileURL(out).href);
};
const S = await bundle('src/lib/tstories.ts', 'tstories.mjs');
const P = await bundle('src/lib/pages.ts', 'pages.mjs');
const { buildView, snapshotToRaw } = await bundle('src/lib/view.ts', 'view.mjs');
const read = (p) => readFileSync(root + p, 'utf8');

const CLD = 'https://res.cloudinary.com/demo/video/upload/v1/clients/t1.mov';

test('poster: a Cloudinary video shows its frame at 1 s (not the black first frame); a stored poster otherwise', () => {
  assert.equal(S.storyPoster({ video: CLD }), 'https://res.cloudinary.com/demo/video/upload/so_1,f_auto,q_auto,c_limit,w_720/v1/clients/t1.jpg');
  assert.equal(S.storyPoster({ video: '/media/story-a.mp4', image: { src: '/media/story-a.webp' } }), '/media/story-a.webp');
  assert.equal(S.storyPoster({ link: 'https://youtu.be/abcdefghijk' }), 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');
  assert.equal(S.storyPoster({ video: '/media/x.mp4' }), '');
  assert.equal(S.storyPoster(null), '');
});

test('avatar: a small square crop of the video frame, else the poster, else the logo, else nothing (first letter)', () => {
  assert.equal(S.storyThumb({ video: CLD }, null), 'https://res.cloudinary.com/demo/video/upload/so_1,f_auto,q_auto,c_fill,g_auto,w_160,h_160/v1/clients/t1.jpg');
  assert.equal(S.storyThumb({ video: '/media/a.mp4', image: { src: '/media/a.webp' } }, null), '/media/a.webp');
  assert.equal(S.storyThumb({ link: 'https://www.instagram.com/reel/ABC123/' }, { src: '/logo.png' }), '/logo.png');
  assert.equal(S.storyThumb({ link: 'https://www.instagram.com/reel/ABC123/' }, null), '');
});

const rec = (key, data) => ({ key, href: '/ar/work/' + key + '/', data: { hasTestimonial: true, featured: true, ...data } });

test('list: one story per client with a video or a quote; empty / [placeholder] fields left out; nothing invented', () => {
  const list = S.testimonialStories([
    rec('a', { client: 'مساحات', testimonial: { quote: '[اقتباس حقيقي من الفيديو]', name: 'إسلام الجمالي', role: 'الرئيس التنفيذي' }, metrics: [{ v: '[؟]', l: '[المقياس]' }],
      tvideo: { _key: 'tv', video: '/media/story-masahat.mp4', link: 'https://www.instagram.com/reel/Del5aadglDH/', image: { src: '/media/story-masahat.webp' } }, problem: '[المشكلة]' }),
    rec('b', { client: 'النون للحلول الرقمية', testimonial: { quote: '', name: '', role: '' }, metrics: [{ v: '8×', l: 'نمو العائد على الاستثمار' }], problem: 'مشكلة حقيقية',
      tvideo: { video: '/media/story-alnoon.mp4', image: { src: '/media/story-alnoon.webp' } } }),
    rec('c', { client: 'بدون فيديو', testimonial: { quote: 'خدمة ممتازة', name: 'سارة', role: '' } }),
    rec('d', { client: 'لا شيء', testimonial: { quote: '', name: 'x' } }),
    rec('e', { client: 'مخفي', featured: false, tvideo: { video: '/media/e.mp4' } }),
    { key: 'f', href: '/f', data: { hasTestimonial: false, client: 'بلا رأي', tvideo: { video: '/media/f.mp4' } } },
  ]);
  assert.deepEqual(list.map((x) => x._key), ['a', 'b', 'c']);
  const [a, b, c] = list;
  assert.equal(a.name, 'مساحات'); assert.equal(a.person, 'إسلام الجمالي'); assert.equal(a.role, 'الرئيس التنفيذي');
  assert.equal(a.metric, null, 'a [placeholder] number is not shown');
  assert.equal(a.href, '/ar/work/a/', 'every client with a page links to it (Mohamed, Nov 8), not only the written cases');
  assert.equal(a.items[0].quote, undefined, 'a [placeholder] quote is not shown');
  assert.equal(a.items[0].video, '/media/story-masahat.mp4', 'plays the file, not the Instagram embed');
  assert.equal(a.thumb, '/media/story-masahat.webp');
  assert.deepEqual(b.metric, { v: '8×', l: 'نمو العائد على الاستثمار' });
  assert.equal(b.href, '/ar/work/b/');
  assert.ok(!('person' in b) && !('role' in b));
  assert.deepEqual(c.items, [{ _key: 'tq', quote: 'خدمة ممتازة' }], 'a written testimonial with no video is a text slide');
  assert.equal(c.thumb, '', 'no picture → the first letter, never a black disc');
  assert.equal(S.testimonialStories(Array.from({ length: 20 }, (_, i) => rec('k' + i, { client: 'c' + i, tvideo: { video: '/v.mp4' } }))).length, 12);
});

test('one-page content (production): the testimonial plays the site\'s own mp4 with its poster, Instagram stays the fallback', () => {
  const story = (k, ar, en, role, file, ig) => ({ _key: k, _type: 'story', name: { _type: 'localeString', ar, en }, role: { _type: 'localeString', ar: role, en: role },
    video: { _type: 'file', url: `/media/${file}.mp4` }, poster: { _type: 'image', url: `/media/${file}.webp`, width: 432, height: 768 }, videoUrl: ig });
  const legacy = { settings: {}, sections: [
    { id: 'h', type: 'heroSection', hidden: false, data: {} },
    { id: 't', type: 'testimonialsSection', hidden: false, data: { items: [
      story('s1', 'إسلام الجمالي', 'Islam Al-Jamali', 'الرئيس التنفيذي · مساحات', 'story-masahat', 'https://www.instagram.com/reel/Del5aadglDH/'),
      story('s2', 'النون للحلول الرقمية', 'Al Noon Digital', 'قصة نجاح · العائد 8 أضعاف', 'story-alnoon', 'https://www.instagram.com/reel/DfCdu7QuFKf/'),
    ] } },
  ] };
  const v = buildView(snapshotToRaw(P.fromLegacy(legacy)), 'ar', 'home');
  const list = S.testimonialStories(v.ctx.cases);
  assert.equal(list.length, 2);
  const m = list.find((x) => x.name === 'مساحات');
  assert.ok(m, 'client = the company after «·»');
  assert.equal(m.person, 'إسلام الجمالي');
  assert.equal(m.items[0].video, '/media/story-masahat.mp4');
  assert.equal(m.items[0].link, 'https://www.instagram.com/reel/Del5aadglDH/');
  assert.equal(m.thumb, '/media/story-masahat.webp');
});

test('wiring: the stories row (now «من شغلنا», Nov 8 batch) and the testimonial videos both open the ONE existing story viewer', () => {
  const proof = read('src/components/pages/Proof.tsx') + read('src/components/pages/TestimonialCard.tsx');
  const works = read('src/components/WorkStories.tsx');
  const comp = read('src/components/ClientStories.tsx');
  // Nov 8 (Mohamed + Munim): the stories row shows our work; testimonials are video + «التحدي» / «الحل» cards
  assert.match(works, /<TestimonialStories clients=\{groups\}/);
  // Nov 11, 2026 (Mohamed): a testimonial video plays in its card (VideoPlayer), not as a story
  assert.match(proof, /<VideoPlayer /);
  assert.doesNotMatch(proof, /TestimonialStories/, 'testimonials are no longer stories');
  assert.doesNotMatch(proof, /className=\{'tgrid/, 'the old tall video grid stays gone');
  assert.equal((comp.match(/function Viewer\(/g) || []).length, 1, 'no second viewer');
  assert.match(comp, /export function TestimonialStories[\s\S]*<Viewer clients=\{list\}/);
  // only the opened story's video loads: <video> exists only inside the viewer
  assert.equal((comp.match(/<video ref=\{video\}/g) || []).length, 1, 'one playing <video> (the other only buffers the next story)');
  assert.match(comp, /poster=\{poster \|\| undefined\}/);
  assert.match(comp, /if \(it\.video\) return storyPoster\(it\);/);
  // «القصة كاملة» only with a story page; overlay fields only when filled
  assert.match(comp, /client\.href && client\.more && <a className="sview__more"/);
  const css = read('src/app/globals.css');
  const tring = css.split('\n').filter((l) => /^\.tring|^\.tstories/.test(l)).join('\n');
  assert.ok(tring.length > 0);
  assert.doesNotMatch(tring, /--yellow/, 'no yellow on the light section');
});

test('Work page («أعمالنا») as stories (Nov 8): one avatar per client with what the site has, no old cards, no second viewer', () => {
  const story = (k, ar, en, role, file, ig) => ({ _key: k, _type: 'story', name: { _type: 'localeString', ar, en }, role: { _type: 'localeString', ar: role, en: role },
    video: { _type: 'file', url: `/media/${file}.mp4` }, poster: { _type: 'image', url: `/media/${file}.webp`, width: 432, height: 768 }, videoUrl: ig });
  const legacy = { settings: {}, sections: [
    { id: 'h', type: 'heroSection', hidden: false, data: {} },
    { id: 't', type: 'testimonialsSection', hidden: false, data: { items: [
      story('s1', 'إسلام الجمالي', 'Islam Al-Jamali', 'الرئيس التنفيذي · مساحات', 'story-masahat', 'https://www.instagram.com/reel/Del5aadglDH/'),
      story('s2', 'النون للحلول الرقمية', 'Al Noon Digital', 'قصة نجاح · العائد 8 أضعاف', 'story-alnoon', 'https://www.instagram.com/reel/DfCdu7QuFKf/'),
    ] } },
  ] };
  const v = buildView(snapshotToRaw(P.fromLegacy(legacy)), 'ar', 'work');
  const list = S.workStories(v.ctx.cases.filter((c) => c.data.isCase));
  assert.equal(list.length, 2);
  // the full Work-page list (with the code's sample clients A–E present) still shows only the real clients
  const all = S.workStories(v.ctx.cases.filter((c) => c.data.isCase || (c.data.works || []).length));
  assert.deepEqual(all.map((x) => x.name).sort(), list.map((x) => x.name).sort());
  const m = list.find((x) => x.name === 'مساحات');
  assert.equal(m.items[0].video, '/media/story-masahat.mp4');
  assert.equal(m.thumb, '/media/story-masahat.webp');
  // works ride after the video; duplicates once; a client with nothing to play is not a story; a cover alone is one slide
  const rec = (key, data) => ({ key, href: `/ar/work/${key}/`, data: { isCase: true, ...data } });
  const w = S.workStories([
    rec('a', { client: 'أ', tvideo: { video: '/a.mp4' }, works: [{ image: { src: 'https://x/1.jpg' } }, { video: '/a.mp4' }] }),
    rec('b', { client: 'ب' }),
    rec('c', { client: 'ج', cover: { src: 'https://x/c.jpg' } }),
    { key: 'd', href: '/ar/work/d/', data: { isCase: false, client: 'د', works: [{ image: { src: 'https://x/d.jpg' } }] } },
    { key: 'e', href: '/ar/work/e/', hidden: true, data: { isCase: true, client: 'هـ', tvideo: { video: '/e.mp4' } } },
    { key: 's', href: '/ar/work/s/', data: { isCase: false, client: 'عميل تجريبي', logo: { src: 'https://res.cloudinary.com/x/stories-sample/logo_A.png' }, works: [{ image: { src: 'https://res.cloudinary.com/x/stories-sample/w.jpg' } }] } },
  ]);
  assert.deepEqual(w.map((x) => x.name), ['أ', 'ج', 'د']);
  assert.equal(w[0].items.length, 2);
  assert.equal(w[1].items[0].image.src, 'https://x/c.jpg');
  const idx = read('src/components/pages/WorkIndex.tsx');
  assert.match(idx, /<TestimonialStories clients=\{stories\} lang=\{L\} kind="work"/);
  assert.doesNotMatch(idx, /CaseCard/, 'the old cards are gone from the Work page');
  // the Work page's mirror of the client-works section is not shown a second time
  assert.ok(!v.sections.some((s) => s.type === 'clientStoriesSection'));
});

test('every client story links its page (Nov 8, Mohamed: «لكل واحد صفحة»); sample / hidden clients never link', () => {
  assert.equal(S.pageHref({ href: '/ar/work/masahat/', data: { client: 'مساحات' } }), '/ar/work/masahat/');
  assert.equal(S.pageHref({ href: '/ar/work/x/', hidden: true, data: { client: 'x' } }), undefined);
  assert.equal(S.pageHref({ href: '', data: { client: 'x' } }), undefined);
  assert.equal(S.pageHref({ href: '/ar/work/sample-client-a/', data: { client: 'عميل تجريبي أ', logo: { src: 'https://res.cloudinary.com/x/stories-sample/logo_A.png' } } }), undefined);
  const recs = ['masahat', 'tob-tarha', 'al-noon', 'emmar-clean'].map((k) => ({ key: k, href: `/ar/work/${k}/`, data: { isCase: true, hasTestimonial: true, featured: true, client: k, tvideo: { video: `/media/story-${k}.mp4` } } }));
  assert.deepEqual(S.workStories(recs).map((x) => x.href), recs.map((r) => r.href));
  assert.deepEqual(S.testimonialStories(recs).map((x) => x.href), recs.map((r) => r.href));
  // the same list on the Work page and under «قصص أخرى» on a client page (minus that client)
  assert.deepEqual(S.workClients(recs, 'al-noon').map((r) => r.key), ['masahat', 'tob-tarha', 'emmar-clean']);
  assert.deepEqual(S.workClients([...recs, { key: 'n', data: { isCase: false } }]).map((r) => r.key), recs.map((r) => r.key));
});

test('client page «قصص أخرى» is CARDS, not story rings (Mohamed, Nov 9 2026): testimonial cards, then client cards', () => {
  const cp = read('src/components/pages/CasePage.tsx');
  assert.doesNotMatch(cp, /TestimonialStories/, 'no story rings on a client page');
  assert.match(cp, /<OtherStories list=\{others\}/);
  const os = read('src/components/pages/OtherStories.tsx');
  // the very card of «عملاؤنا يحكون» (one component) and the admin's testimonials order (Home's section)
  assert.match(os, /<TestimonialCardItem /);
  assert.match(read('src/components/pages/Proof.tsx'), /<TestimonialCardItem /);
  assert.match(os, /testimonialCards\(ctx\.cases, ctx\.proof\?\.order\)\.filter\(\(x\) => x\.key !== c\.key\)/);
  assert.match(os, /className="tvcards tvcards--more"/);
  assert.match(os, /data-rec-story=\{x\.storyKey \|\| x\.key\} data-rec-case=\{x\.caseKey \|\| x\.key\}/);
  assert.doesNotMatch(os, /TestimonialStories|sring/);
  // the Work page's client rings stay as they are (the row is switched off in the admin)
  const wi = read('src/components/pages/WorkIndex.tsx');
  assert.match(wi, /const clients = workClients\(ctx\.cases\);/);
  assert.match(wi, /workStories\(clients\)/);
});

test('«قصص أخرى» client cards: every other client without a testimonial card, in the clients order; hidden, sample and text-only left out', () => {
  const CL = (k) => `https://res.cloudinary.com/demo/video/upload/v1/clients/${k}.mp4`;
  const cases = [
    { key: 'masahat', href: '/ar/work/masahat/', data: { isCase: true, client: 'مساحات', tvideo: { video: CL('m') } } },
    { key: 'emmar', href: '/ar/work/emmar/', data: { isCase: true, client: 'إعمار كلين', summary: 'إعلان من إنتاجنا', tvideo: { video: CL('e') }, storyKey: 'st1' } },
    { key: 'hid', href: '/ar/work/hid/', hidden: true, data: { isCase: true, client: 'مخفي', cover: { src: '/c.jpg' } } },
    { key: 'cur', href: '/ar/work/cur/', data: { isCase: true, client: 'الحالي', cover: { src: '/c.jpg' } } },
    { key: 'num', href: '/ar/work/num/', data: { isCase: true, client: 'رقم', metrics: [{ v: '164%', l: 'نمو' }], cover: { src: '/n.jpg' } } },
    { key: 'none', href: '/ar/work/none/', data: { isCase: true, client: 'برنامج بلا صورة', summary: 'نص فقط' } },
    { key: 'nocase', href: '/ar/work/nocase/', data: { client: 'ليس عميلاً', cover: { src: '/x.jpg' } } },
  ];
  const out = S.otherClientCards(cases, 'cur', ['masahat']);
  assert.deepEqual(out.map((x) => x.key), ['emmar', 'num']);
  assert.equal(out[0].short, 'إعلان من إنتاجنا');
  assert.equal(out[0].storyKey, 'st1');
  assert.equal(out[0].href, '/ar/work/emmar/');
  assert.equal(out[0].poster, 'https://res.cloudinary.com/demo/video/upload/so_1,f_auto,q_auto,c_limit,w_720/v1/clients/e.jpg');
  assert.equal(out[1].short, '164% نمو');
  assert.equal(out[1].poster, '/n.jpg');
});
