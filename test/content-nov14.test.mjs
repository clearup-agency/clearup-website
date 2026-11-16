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

test('retired: Netlify no longer runs it (Nov 16), and a later hero paragraph is never overwritten', () => {
  assert.match(readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8'), /command = "npm run build"/);
  const c = before(); c.sections[0].data.lead = T('نعمل مع المؤسسات التنموية والإنسانية…');
  assert.equal(patch(c).content.sections[0].data.lead.ar, 'نعمل مع المؤسسات التنموية والإنسانية…');
});

test('the old service name left in other texts (chatbot, Services intro) follows the rename, once', () => {
  const c = { settings: { chatbot: { faq: [{ a: T('… التحول بالذكاء الاصطناعي والأتمتة، التدريب', '… AI transformation & automation, training') }] } },
    sections: [{ id: 'p', page: 'services', type: 'pageHeadSection', data: { summary: T('التحول بالذكاء الاصطناعي والأتمتة', 'AI Transformation & Automation') } },
      { id: 'g', page: 'services', type: 'servicesSection', data: { groups: [{ k: L('الاحتفاظ والأتمتة', 'Retention & Automation') }] } }] };
  const { content } = patch(c);
  assert.match(content.settings.chatbot.faq[0].a.ar, /والحوكمة/);
  assert.match(content.settings.chatbot.faq[0].a.en, /AI transformation & governance/);
  assert.equal(content.sections[0].data.summary.en, 'AI Transformation & Governance');
  assert.equal(content.sections[1].data.groups[0].k.ar, 'الاحتفاظ والأتمتة', 'another «أتمتة» is not touched');
  assert.equal(patch(content).changes.length, 0);
});

test('Nov 15: the About page, Google title/description, hero line and chatbot intro follow the new direction — only old wording changes', async () => {
  const { DIRECTION } = await import('../scripts/content-nov14.mjs');
  const pick = (page, type, path) => DIRECTION.find((d) => d[0] === page && d[1] === type && d[2].join('.') === path);
  const t = pick('about', 'pageHeadSection', 'title');
  const k = pick('about', 'manifestoSection', 'kicker');
  const l0 = pick('about', 'manifestoSection', 'lines.0');
  const mt = pick('settings', null, 'metaTitle');
  const c = {
    settings: { metaTitle: { _type: 'localeString', ...mt[3] }, chatbot: { faq: [] } },
    sections: [
      { id: 'a', page: 'about', type: 'pageHeadSection', data: { title: { _type: 'localeString', ...t[3] } } },
      { id: 'm', page: 'about', type: 'manifestoSection', data: { kicker: { ...k[3] }, lines: [{ _key: 'x', ...l0[3] }] } },
      { id: 'h', page: 'home', type: 'heroSection', data: { title: [L('عنوان كتبه الأدمن')], kicker: L('سطر كتبه الأدمن', 'Admin line') } },
    ],
  };
  const { content } = patch(c);
  assert.equal(content.sections[0].data.title.ar, 'شريك المؤسسات في الابتكار والتحول بالذكاء الاصطناعي');
  assert.equal(content.sections[1].data.kicker.ar, 'قناعاتنا');
  assert.equal(content.sections[1].data.lines[0].ar, 'لا نبيع حلولاً جاهزة.');
  assert.equal(content.sections[1].data.lines[0]._key, 'x');
  assert.match(content.settings.metaTitle.ar, /الذكاء الاصطناعي/);
  assert.equal(content.sections[2].data.kicker.ar, 'سطر كتبه الأدمن', 'an admin edit stays');
  assert.equal(patch(content).changes.length, 0);
});
