import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path, { sep } from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Nov 14, 2026: search engines get the five services (not the hidden four-group section) and the names the
// company is searched by — data only, nothing visible changes
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/');
const dir = mkdtempSync(path.join(tmpdir(), 'cu-seo14-'));
const bundle = (entry, name) => {
  const out = path.join(dir, name);
  buildSync({ entryPoints: [root + entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, logLevel: 'silent', external: ['next', 'next/*'] });
  return import(pathToFileURL(out).href);
};
const P = await bundle('src/lib/pages.ts', 'pages.mjs');
const { buildView, snapshotToRaw } = await bundle('src/lib/view.ts', 'view.mjs');
const G = await bundle('src/lib/geo.ts', 'geo.mjs');
const seed = JSON.parse(readFileSync(root + 'seed/content.json', 'utf8'));
const site = P.fromLegacy({ settings: seed.settings, sections: seed.sections });
const L = (ar, en) => ({ _type: 'localeString', ar, en });
const T = (ar, en) => ({ _type: 'localeText', ar, en });
site.sections.push({ id: 'koff', page: 'services', type: 'offeringsSection', hidden: false, data: { scroll: true, items: [
  { _key: 'a', id: 'innovation', title: L('الابتكار وتطوير المنتجات والخدمات', 'Innovation & Product Development'), short: T('لا نكتفي بإطلاق منتج', 'More than a launch') },
  { _key: 'b', title: L('التحول بالذكاء الاصطناعي والحوكمة', 'AI Transformation & Governance'), desc: T('نبدأ من حيث تقف مؤسستك', 'We start where you stand') },
] } });
const raw = snapshotToRaw(site);

test('the Services page lists the five services as Service entries, linked to each one', () => {
  const g = G.structuredData(buildView(raw, 'ar', 'services'));
  const svc = g['@graph'].filter((n) => n['@type'] === 'Service');
  assert.deepEqual(svc.map((s) => s.name), ['الابتكار وتطوير المنتجات والخدمات', 'التحول بالذكاء الاصطناعي والحوكمة']);
  assert.match(svc[0].url, /#innovation$/);
  assert.match(svc[1].url, /#service-2$/);
  assert.equal(svc[1].description, 'نبدأ من حيث تقف مؤسستك');
});

test('every page: the company with the names it is searched by and its services', () => {
  for (const page of ['home', 'about', 'contact']) {
    const org = G.structuredData(buildView(raw, 'en', page))['@graph'][0];
    assert.ok(org.alternateName.includes('كلير أب') && org.alternateName.includes('Clear Up'));
    assert.deepEqual(org.knowsAbout, ['Innovation & Product Development', 'AI Transformation & Governance']);
  }
});

test('Search Console / Bing verification codes go in a meta tag only when set and well-formed', async () => {
  const { siteVerification } = await bundle('src/lib/seo.ts', 'seo.mjs');
  assert.deepEqual(siteVerification({}), {});
  assert.deepEqual(siteVerification({ GOOGLE_SITE_VERIFICATION: 'abcDEF123_-xyz' }), { verification: { google: 'abcDEF123_-xyz' } });
  assert.deepEqual(siteVerification({ BING_SITE_VERIFICATION: '0123456789ABCDEF' }), { verification: { other: { 'msvalidate.01': '0123456789ABCDEF' } } });
  assert.deepEqual(siteVerification({ GOOGLE_SITE_VERIFICATION: '"><script>' }), {});
});

test('a client story search description: client, summary, problem, result — no placeholder, no repeat', () => {
  const s2 = structuredClone(site);
  const cs = s2.sections.find((s) => s.type === P.CASE_TYPE);
  cs.data = { ...cs.data, client: L('النون', 'Al-Noon'), industry: L('شركة للحلول الرقمية', 'Digital solutions'), summary: T('نمو الإيرادات 164%', 'Revenue +164%'), problem: T('طلب عشوائي وموسمي.', 'Random demand.'), result: T('نمو الإيرادات 164% خلال 3 أشهر.', 'Revenue +164% in 3 months.'), seo: {} };
  const v = buildView(snapshotToRaw(s2), 'ar', 'work', { caseSlug: cs.data.slug });
  const d = G.pageSummary(v);
  assert.equal(d, 'النون (شركة للحلول الرقمية): نمو الإيرادات 164% خلال 3 أشهر. طلب عشوائي وموسمي. قصة عميل من أعمال ClearUp.');
  assert.ok(d.length <= 160);
});
