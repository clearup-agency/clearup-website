import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';
// GEO: per-page JSON-LD, the page summaries, /llms.txt + /llms-full.txt and robots — from the published content only.
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/'); // not URL.pathname: that is /D:/... on Windows
const dir = mkdtempSync(path.join(tmpdir(), 'cu-geo-'));
const bundle = (entry, name) => {
  const out = path.join(dir, name);
  buildSync({ entryPoints: [root + entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, logLevel: 'silent', external: ['next', 'next/*'] });
  return import(pathToFileURL(out).href);
};
const P = await bundle('src/lib/pages.ts', 'pages.mjs');
const { buildView, snapshotToRaw } = await bundle('src/lib/view.ts', 'view.mjs');
const G = await bundle('src/lib/geo.ts', 'geo.mjs');
const LL = await bundle('src/lib/llms.ts', 'llms.mjs');
const seed = JSON.parse(readFileSync(root + 'seed/content.json', 'utf8'));
const site = P.fromLegacy({ settings: seed.settings, sections: seed.sections });
const raw = snapshotToRaw(site);
const view = (lang, page, opts) => buildView(raw, lang, page, opts);
const types = (g) => g['@graph'].flatMap((n) => [].concat(n['@type']));
// a "[…]" placeholder inside a text value (JSON string values / text lines; markdown links "[title](url)" are fine)
const PH = /\[[^\]\n]*\](?!\()/;
const noPlaceholder = (s) => {
  const vals = [];
  const walk = (x) => (typeof x === 'string' ? vals.push(x) : x && typeof x === 'object' ? Object.values(x).forEach(walk) : 0);
  try { walk(JSON.parse(s)); } catch { vals.push(s); }
  for (const x of vals) assert.ok(!PH.test(x), 'placeholder leaked: ' + x.match(/.{0,40}\[[^\]]*\].{0,20}/)?.[0]);
};
const slugs = site.sections.filter((s) => s.type === P.CASE_TYPE).map((s) => s.data.slug);

test('every page has a parseable JSON-LD graph with the company, website and the page; no placeholder text', () => {
  for (const lang of ['ar', 'en']) {
    const pages = [...P.PAGE_IDS.map((p) => view(lang, p)), ...slugs.map((slug) => view(lang, 'work', { caseSlug: slug }))];
    for (const v of pages) {
      const json = JSON.stringify(G.structuredData(v));
      const g = JSON.parse(json);
      const t = types(g);
      assert.ok(t.includes('Organization') && t.includes('ProfessionalService') && t.includes('WebSite'), v.page);
      noPlaceholder(json);
      const org = g['@graph'][0];
      assert.equal(org.name, 'ClearUp');
      assert.ok(org.logo?.url && org.contactPoint?.[0]?.url?.startsWith('https://wa.me/'));
      assert.deepEqual(org.sameAs, seed.settings.socials.map((s) => s.url).concat(seed.settings.instagram).filter((u, i, a) => a.indexOf(u) === i));
      assert.ok(!/"(ratingValue|aggregateRating|price|priceRange|offers)"\s*:/i.test(json), 'no invented ratings or prices');
      if (v.page !== 'home' || v.caseView) assert.ok(t.includes('BreadcrumbList'), 'breadcrumbs on inner pages');
    }
  }
});

test('Services: one Service per group and the FAQ with every real question (answers without [placeholders])', () => {
  const g = G.structuredData(view('ar', 'services'));
  const svc = g['@graph'].filter((n) => n['@type'] === 'Service');
  const groups = site.sections.find((s) => s.type === 'servicesSection').data.groups;
  assert.equal(svc.length, groups.length);
  assert.equal(svc[0].name, groups[0].k.ar);
  const faq = g['@graph'].find((n) => n['@type'] === 'FAQPage');
  // Nov 8: every old question shows; an answer's [placeholder] part is left out, never shown
  const strip = (a) => a.replace(/\[[^\]]*\]/g, '');
  const items = site.sections.find((s) => s.type === 'faqSection').data.items.filter((it) => !/\[/.test(it.q.ar) && /[\p{L}\p{N}]/u.test(strip(it.a.ar)));
  assert.equal(faq.mainEntity.length, items.length);
  assert.ok(faq.mainEntity.every((q) => !/\[/.test(q.acceptedAnswer.text)));
  const plain = items.find((it) => !/\[/.test(it.a.ar));
  assert.ok(faq.mainEntity.some((q) => q.acceptedAnswer.text === plain.a.ar.replace(/\s+/g, ' ').trim()));
});

test('a FAQ section added to any page shows the site\'s one FAQ and feeds that page\'s FAQPage', () => {
  const c = JSON.parse(JSON.stringify(site));
  // its own stored copy is ignored: every FAQ section shows the Services questions (Nov 8, 2026 — one FAQ)
  c.sections.push({ id: 'x-faq', type: 'faqSection', hidden: false, page: 'about', data: { items: [{ _key: 'a', q: P.ls('سؤال؟', 'Q?'), a: P.lt('جواب كامل.', 'A full answer.') }] } });
  const qs = (page) => G.structuredData(buildView(snapshotToRaw(c), 'en', page))['@graph'].find((n) => n['@type'] === 'FAQPage').mainEntity.map((q) => q.name);
  assert.deepEqual(qs('about'), qs('services'));
  assert.ok(!qs('about').includes('Q?'));
});

test('About: the founder as a Person linked from the company', () => {
  const g = G.structuredData(view('en', 'about'));
  const p = g['@graph'].find((n) => n['@type'] === 'Person');
  assert.equal(p.name, 'Abd Al Menem');
  assert.deepEqual(p.sameAs, ['https://instagram.com/abd.ulmenem']);
  assert.equal(g['@graph'][0].founder['@id'], p['@id']);
  assert.equal(g['@graph'].find((n) => n['@id']?.endsWith('#webpage'))['@type'], 'AboutPage');
});

test('a case study is a CreativeWork; its quote becomes a Review only once a real quote is filled', () => {
  const v = view('ar', 'work', { caseSlug: slugs[0] });
  let w = G.structuredData(v)['@graph'].find((n) => n['@type'] === 'CreativeWork');
  assert.ok(w && w.about.name && !w.review);
  const c = JSON.parse(JSON.stringify(site));
  const row = c.sections.find((s) => s.type === P.CASE_TYPE && s.data.slug === slugs[0]);
  row.data.testimonial.quote = P.lt('كلام حقيقي', 'Real words');
  w = G.structuredData(buildView(snapshotToRaw(c), 'ar', 'work', { caseSlug: slugs[0] }))['@graph'].find((n) => n['@type'] === 'CreativeWork');
  assert.equal(w.review.reviewBody, 'كلام حقيقي');
  assert.ok(!('reviewRating' in w.review));
});

test('each inner page opens with a summary that names ClearUp; Home uses the company line', () => {
  for (const lang of ['ar', 'en']) {
    for (const p of P.PAGE_IDS) {
      const s = G.pageSummary(view(lang, p));
      assert.ok(s.includes('ClearUp'), `${lang}/${p}: ${s}`);
      noPlaceholder(s);
    }
    for (const slug of slugs) noPlaceholder(G.pageSummary(view(lang, 'work', { caseSlug: slug })));
  }
  const head = site.sections.find((s) => s.type === 'pageHeadSection' && s.page === 'contact');
  assert.ok(head.data.summary.ar && head.data.summary.en, 'summary is an editable field on the page head');
});

test('llms.txt and llms-full.txt: both languages, every page and case, no placeholders', () => {
  const t = LL.llmsTxt(raw);
  const f = LL.llmsFullTxt(raw);
  assert.ok(t.startsWith('# ClearUp\n\n> '));
  for (const s of [t, f]) {
    noPlaceholder(s);
    assert.ok(s.includes('## العربية') && s.includes('## English'));
    for (const p of ['/ar/services/', '/en/about/', '/ar/contact/']) assert.ok(s.includes(p), p);
    for (const slug of slugs) assert.ok(s.includes(`/en/work/${slug}/`), slug);
  }
  assert.ok(t.includes('https://wa.me/'));
  assert.ok(f.length > t.length);
});

test('robots: everything closed while noindex; AI crawlers named and allowed once indexable', async () => {
  const src = readFileSync(root + 'src/app/robots.ts', 'utf8');
  for (const b of ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'Bingbot']) assert.ok(src.includes(`'${b}'`), b);
  const R = await bundle('src/app/robots.ts', 'robots.mjs');
  const env = { ...process.env };
  try {
    delete process.env.SEO_INDEXABLE;
    assert.deepEqual(R.default().rules, [{ userAgent: '*', disallow: '/' }]);
    Object.assign(process.env, { SEO_INDEXABLE: 'true', NEXT_PUBLIC_SITE_URL: 'https://clearup.example' });
    delete process.env.VERCEL_ENV;
    const R2 = await bundle('src/app/robots.ts', 'robots2.mjs');
    const rules = R2.default().rules;
    assert.ok(rules[0].userAgent.includes('GPTBot') && rules[0].allow === '/');
    assert.ok(rules.every((r) => r.disallow.includes('/admin')));
  } finally { process.env = env; }
});
