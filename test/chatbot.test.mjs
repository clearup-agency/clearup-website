import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';
// The site chatbot: Arabic normalisation + the fuzzy, dialect-aware matcher over the seeded knowledge base.
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/'); // not URL.pathname: that is /D:/... on Windows
const out = path.join(mkdtempSync(path.join(tmpdir(), 'cu-bot-')), 'bot.mjs');
buildSync({ stdin: { contents: "export * from './src/lib/chatbot.ts'; export { DEFAULT_CHATBOT } from './src/content/chatbot.ts';", resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, logLevel: 'silent' });
const { normalize, tokens, buildIndex, answer, rank, chatView, THRESHOLD, DEFAULT_CHATBOT, resolveHref } = await import(pathToFileURL(out).href);

const site = { chatbot: DEFAULT_CHATBOT };
const ar = chatView(site, 'ar', { whatsapp: 'https://wa.me/970000000' });
const en = chatView(site, 'en', { whatsapp: 'https://wa.me/970000000' });
const ixAr = buildIndex(ar.faq);
const ixEn = buildIndex(en.faq);
const idOf = (ix, q, lang) => { const a = answer(ix, q, lang); return a.kind === 'qa' ? a.qa.id.replace('qa-', '') : a.kind; };

test('normalize: tashkeel, alef forms, taa marbuta, alef maqsura, hamza carriers, tatweel, digits', () => {
  assert.equal(normalize('مَرْحَبًا'), 'مرحبا');
  assert.equal(normalize('أإآٱ'), 'اااا');
  assert.equal(normalize('مكالمة'), 'مكالمه');
  assert.equal(normalize('على'), 'علي');
  assert.equal(normalize('مسؤول شاطئ'), 'مسوول شاطي');
  assert.equal(normalize('التـــسويق'), 'التسويق');
  assert.equal(normalize('٩٠ يوماً'), '90 يوما');
  assert.equal(normalize('  What’s   the PRICE?! '), 'whats the price');
});

test('tokens: stop words out, dialect synonyms unified, light stemming', () => {
  assert.deepEqual(tokens('قديش السعر؟'), ['_howmuch', '_price']);
  assert.deepEqual(tokens('كم التكلفة'), ['_price']);
  assert.deepEqual(tokens('How much does it cost?'), ['_price']);
  assert.deepEqual(tokens('وين مكانكم'), ['_where']);
  assert.deepEqual(tokens('كيف بنبلش'), ['_start']);
  assert.deepEqual(tokens('الخدمات'), ['_service']);
});

const AR_CASES = [
  ['قديش السعر', 'price'],
  ['كم الأسعار عندكم؟', 'price'],
  ['بكم الباقة', 'price'],
  ['كيف بنبلش', 'start'],
  ['كيف أبدأ معكم؟', 'start'],
  ['بدي اشتغل معكم', 'start'],
  ['وين مكانكم', 'where'],
  ['وين موقعكم؟', 'where'],
  ['شو خدماتكم', 'services'],
  ['ايش الخدمات اللي بتقدموها', 'services'],
    ['شو بتعملوا بالزبط', 'what'],
  ['امتى بتبين النتائج', 'minimum'],
  ['قديش بياخد وقت', 'minimum'],
  ['أقل مدة للعقد', 'minimum'],
  ['بتعملوا اعلانات ممولة على انستغرام؟', 'ads'],
  ['عندكم تقارير للمانحين؟', 'impact'],
  ['مين المؤسس', 'team'],
  ['شو رقم الواتساب تبعكم', 'contact'],
  ['المكالمة مجانية؟', 'call'],
  ['قصص نجاح', 'results'],
  ['الخدمَات', 'services'],
  ['التكلفه', 'price'],
];
const EN_CASES = [
  ['how much', 'price'],
  ['What are your prices?', 'price'],
  ['how do we get started', 'start'],
  ['where are you located', 'where'],
  ['what services do you offer', 'services'],
    ['do you run facebook ads', 'ads'],
  ['how long until I see results', 'minimum'],
  ['who founded clearup', 'team'],
  ['servcies', 'services'],
  ['what do you do?', 'what'],
  ['is the call free', 'call'],
];

for (const [q, want] of AR_CASES) test(`ar: «${q}» → ${want}`, () => assert.equal(idOf(ixAr, q, 'ar'), want));
for (const [q, want] of EN_CASES) test(`en: “${q}” → ${want}`, () => assert.equal(idOf(ixEn, q, 'en'), want));

test('cross-language: English typed on the Arabic page still finds the entry (answer stays Arabic)', () => {
  const a = answer(ixAr, 'how much does it cost', 'ar');
  assert.equal(a.kind, 'qa');
  assert.match(a.qa.a, /السعر/);
});

test('greetings and thanks get a friendly reply, not a random entry', () => {
  assert.equal(answer(ixAr, 'مرحبا', 'ar').kind, 'smalltalk');
  assert.equal(answer(ixAr, 'السلام عليكم', 'ar').kind, 'smalltalk');
  assert.equal(answer(ixEn, 'thanks!', 'en').kind, 'smalltalk');
});

test('off-topic questions fall back (WhatsApp) instead of guessing', () => {
  // Nov 8, 2026: only what ClearUp's content file says — guarantees, markets, what we need from you: not in it → WhatsApp
  for (const q of ['في ضمان؟', 'do you guarantee results', 'شو الطقس اليوم', 'من فاز بالمباراة', 'what is the capital of france', 'asdkjh qweoiu', '']) {
    const a = answer(q.match(/[a-z]/) ? ixEn : ixAr, q, 'ar');
    assert.equal(a.kind, 'none', q);
  }
});

test('settings → view: language pick with Arabic fallback, links, side, defaults', () => {
  assert.equal(ar.side, 'left');
  assert.equal(en.side, 'right');
  assert.ok(ar.faq.length >= 15 && ar.faq.length <= 20);
  assert.ok(ar.chips.length >= 6 && ar.chips.length <= 8);
  const v = chatView({ chatbot: { enabled: false, faq: [{ _key: 'x', q: { ar: 'سؤال', en: '' }, a: { ar: 'جواب', en: '' }, link: '#whatsapp', linkLabel: { ar: 'واتساب', en: '' } }], position: 'right' } }, 'en', { whatsapp: 'https://wa.me/1' });
  assert.equal(v.enabled, false);
  assert.equal(v.side, 'right');
  assert.equal(v.faq[0].q, 'سؤال');
  assert.equal(resolveHref(v.faq[0].link.href, v), 'https://wa.me/1');
  assert.equal(chatView(null, 'ar', { whatsapp: '' }).faq.length, ar.faq.length);
  assert.equal(ar.ai, true);
  assert.equal(chatView({ chatbot: { ...DEFAULT_CHATBOT, ai: false } }, 'ar', { whatsapp: '' }).ai, false);
});

test('every seeded chip finds its own entry', () => {
  for (const [v, ix] of [[ar, ixAr], [en, ixEn]]) for (const c of v.chips) {
    const a = answer(ix, c, v.lang);
    assert.equal(a.kind, 'qa', c);
    assert.equal(a.qa.q, c);
  }
});

test('the threshold sits between real questions and noise', () => {
  assert.ok(THRESHOLD > 0.3 && THRESHOLD < 0.8);
  assert.ok(rank(ixAr, 'قديش السعر')[0].score > THRESHOLD + 0.2);
});
