import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';
// The multi-page site: page routing, the split of the one-page content into pages, case studies (add, copy,
// delete, reorder, hide), placeholders, and the database migration (additive only — production's tables untouched).
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/'); // not URL.pathname: that is /D:/... on Windows
const dir = mkdtempSync(path.join(tmpdir(), 'cu-pages-'));
const bundle = (entry, name) => {
  const out = path.join(dir, name);
  buildSync({ entryPoints: [root + entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, logLevel: 'silent' });
  return import(pathToFileURL(out).href);
};
const P = await bundle('src/lib/pages.ts', 'pages.mjs');
const { buildView, snapshotToRaw } = await bundle('src/lib/view.ts', 'view.mjs');
const seed = JSON.parse(readFileSync(root + 'seed/content.json', 'utf8'));
const site = P.fromLegacy({ settings: seed.settings, sections: seed.sections });
const view = (c, lang, page, opts) => buildView(snapshotToRaw(c), lang, page, opts);
const cases = (c) => c.sections.filter((s) => s.type === P.CASE_TYPE);

test('routing: every page has one address per language, links resolve from any page', () => {
  assert.equal(P.pagePath('ar', 'home'), '/ar/');
  assert.equal(P.pagePath('en', 'services'), '/en/services/');
  assert.equal(P.pagePath('ar', 'work', 'masahat'), '/ar/work/masahat/');
  assert.equal(P.resolveHref('/work/', 'en'), '/en/work/');
  assert.equal(P.resolveHref('#book', 'ar', 'services', []), '/ar/#book');   // a home anchor, from another page
  assert.equal(P.resolveHref('#faq', 'ar', 'services', ['faq']), '#faq');     // an anchor on this page stays
  assert.equal(P.resolveHref('https://wa.me/1', 'ar'), 'https://wa.me/1');
  assert.equal(P.hrefPage('/ar/about/'), 'about');
  assert.equal(P.hrefPage('/contact/'), 'contact');
  assert.equal(P.hrefPage('https://instagram.com/x'), null);
});

test('the one-page content splits into five pages and four case studies; nothing is lost or invented', () => {
  assert.ok(P.isMultiPage(site));
  const on = (p) => site.sections.filter((s) => P.pageOf(s) === p && s.type !== P.CASE_TYPE).map((s) => s.type);
  assert.ok(on('home').includes('heroSection') && on('home').includes('proofSection'));
  assert.ok(on('services').includes('servicesSection') && on('services').includes('faqSection') && on('services').includes('ninetySection') && on('services').includes('auditSection'));
  assert.ok(on('about').includes('founderSection') && on('about').includes('manifestoSection'));
  assert.ok(on('contact').includes('finalCtaSection'));
  for (const p of P.PAGE_IDS) assert.ok(on(p).length > 0, p);
  const cs = cases(site);
  assert.equal(cs.length, 4);
  assert.deepEqual(cs.map((s) => s.data.slug), ['masahat', 'tob-tarha', 'al-noon-digital', 'emmar-clean']);
  for (const s of cs) assert.ok(P.validSlug(s.data.slug));
  // the numbers on a case are only ones already on the site
  const old = JSON.stringify(seed);
  for (const s of cs) for (const m of s.data.metrics ?? []) if (P.filled(m.v?.ar)) assert.ok(old.includes(m.v.ar), m.v.ar);
  // the testimonial quotes are the site's own
  for (const s of cs) if (P.filled(s.data.testimonial?.quote?.ar)) assert.ok(old.includes(s.data.testimonial.quote.ar.slice(0, 30)));
});

test('each page shows only its own sections, with breadcrumbs, its own title and the right nav item', () => {
  for (const lang of ['ar', 'en']) {
    for (const p of P.PAGE_IDS) {
      const v = view(site, lang, p);
      assert.equal(v.page, p);
      const ids = new Set(site.sections.filter((s) => P.pageOf(s) === p && !s.hidden).map((s) => s.id));
      for (const s of v.sections) assert.ok(ids.has(s.key), `${p}: ${s.type}`);
      assert.equal(v.base.nav.current, p);
      if (p === 'home') assert.equal(v.crumbs.length, 0);
      else assert.equal(v.crumbs.length, 2);
      if (p !== 'home') assert.ok(v.seo.title, p); // home uses the site's own title
    }
    const c = view(site, lang, 'work', { caseSlug: 'masahat' });
    assert.equal(c.caseView.slug, 'masahat');
    assert.equal(c.crumbs.length, 3);
    assert.equal(c.crumbs[1].href, `/${lang}/work/`);
    assert.equal(view(site, lang, 'work', { caseSlug: 'nope' }).caseView, null);
  }
});

test('placeholders: [bracketed] text is hidden from visitors and marked in the admin preview', () => {
  assert.ok(P.isPlaceholder('[النتيجة — مطلوب]'));
  assert.ok(!P.isPlaceholder('8× مبيعات'));
  assert.ok(!P.filled('  '));
  assert.ok(P.filled('حقيقي'));
});

test('case studies: add (hidden until ready), copy (own link), reorder, delete', () => {
  let c = structuredClone(site);
  const publicSlugs = (x) => view(x, 'ar', 'work').ctx.cases.filter((k) => k.data.isCase).map((k) => k.slug);
  assert.deepEqual(publicSlugs(c), ['masahat', 'tob-tarha', 'al-noon-digital', 'emmar-clean']);
  // add: a hidden story is not public, but the admin preview can open it
  c.sections.push({ id: 'new1', type: P.CASE_TYPE, page: P.CASES, hidden: true, data: { slug: 'client-5', client: { _type: 'localeString', ar: 'عميل', en: 'Client' } } });
  assert.ok(!publicSlugs(c).includes('client-5'));
  assert.equal(view(c, 'ar', 'work', { caseSlug: 'client-5' }).caseView, null);
  assert.equal(view(c, 'ar', 'work', { caseSlug: 'client-5', showHidden: 'new1', preview: true }).caseView?.slug, 'client-5');
  // copy: two rows with the same link get distinct links on save
  const copy = { ...structuredClone(c.sections.find((s) => s.data.slug === 'masahat')), id: 'dup1' };
  c.sections.push(copy);
  const fixed = P.uniqueSlugs(c.sections);
  const slugs = fixed.filter((s) => s.type === P.CASE_TYPE).map((s) => s.data.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(slugs.every(P.validSlug));
  // reorder: the Work page follows the list order
  c = structuredClone(site);
  const i = c.sections.findIndex((s) => s.data.slug === 'emmar-clean');
  const [row] = c.sections.splice(i, 1);
  c.sections.splice(c.sections.findIndex((s) => s.data.slug === 'masahat'), 0, row);
  assert.equal(publicSlugs(c)[0], 'emmar-clean');
  // delete
  c.sections = c.sections.filter((s) => s.data.slug !== 'tob-tarha');
  assert.ok(!publicSlugs(c).includes('tob-tarha'));
  assert.equal(view(c, 'ar', 'work', { caseSlug: 'tob-tarha' }).caseView, null);
});

test('slugs: safe links', () => {
  assert.equal(P.slugify('Tob & Tarha'), 'tob-tarha');
  assert.equal(P.slugify('  Al Noon — Digital!! '), 'al-noon-digital');
  assert.ok(!P.validSlug('Bad Slug'));
  assert.ok(!P.validSlug('../x'));
});

test('migration 0002 only adds new tables: no change to the live site\'s tables', () => {
  const sql = readFileSync(root + 'drizzle/0002_pages.sql', 'utf8');
  const stmts = sql.split('--> statement-breakpoint').map((s) => s.replace(/--.*$/gm, '').trim()).filter(Boolean);
  for (const s of stmts) assert.match(s, /^CREATE (TABLE|INDEX) IF NOT EXISTS "site_v2_/, s.slice(0, 60));
  assert.doesNotMatch(sql, /\b(DROP|ALTER|UPDATE|DELETE|TRUNCATE|INSERT)\b/i);
  const journal = JSON.parse(readFileSync(root + 'drizzle/meta/_journal.json', 'utf8'));
  assert.equal(journal.entries.at(-1).tag, '0002_pages');
  const schema = readFileSync(root + 'src/db/schema.ts', 'utf8');
  // the site reads and writes only the new tables; the old ones are read (never written) for the first load
  assert.match(schema, /pgTable\('site_v2_sections'/);
  assert.match(schema, /legacySections = pgTable\('sections'/);
  const store = readFileSync(root + 'src/admin/store.ts', 'utf8');
  assert.doesNotMatch(store, /legacy(Sections|SiteSettings)/);
});

test('work/[slug]: the server and static route files share one implementation (only their config differs)', () => {
  const dir = new URL('../src/app/[lang]/work/[slug]/', import.meta.url);
  for (const f of ['page.dyn.tsx', 'page.static.tsx']) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    assert.match(src, /export \{ default, generateStaticParams, generateMetadata \} from '@\/components\/CaseStudyRoute'/, f);
    assert.doesNotMatch(src, /function|<SitePage/, f + ' must not have its own page code');
  }
});

test('LinkedIn: the company page really is /company/clearupagenecy — keep the spelling', () => {
  // Looks like a typo of "agency", but it is the slug ClearUp registered on LinkedIn (checked Nov 2026:
  // /company/clearupagenecy = ClearUp, clearupagency.com, +970; /company/clearupagency = 404). Don't "fix" it.
  const seed = readFileSync(new URL('../seed/content.json', import.meta.url), 'utf8');
  assert.match(seed, /linkedin\.com\/company\/clearupagenecy"/);
  assert.doesNotMatch(seed, /linkedin\.com\/company\/clearupagency"/);
});
