import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';

// One site (Mohamed, Nov 8, 2026: «الموقع الي بظهر في لوحة الادمن للتعديل غير الموقع الي بظهر على رابط فيرسل
// النهائي»): the admin's live preview renders exactly the page visitors get, and the content the admin edits is
// the content the site reads.
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/');
const dir = mkdtempSync(path.join(tmpdir(), 'cu-sync-'));
const bundle = (entry, name) => {
  const out = path.join(dir, name);
  buildSync({ entryPoints: [root + entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, logLevel: 'silent' });
  return import(pathToFileURL(out).href);
};
const P = await bundle('src/lib/pages.ts', 'pages.mjs');
const { buildView, snapshotToRaw } = await bundle('src/lib/view.ts', 'view.mjs');
const seed = JSON.parse(readFileSync(root + 'seed/content.json', 'utf8'));
const site = P.fromLegacy({ settings: seed.settings, sections: seed.sections });
const PAGES = ['home', 'services', 'work', 'about', 'contact'];
const caseSlugs = site.sections.filter((s) => s.type === P.CASE_TYPE).map((s) => String(s.data?.slug ?? '')).filter(Boolean);
const json = (v) => JSON.stringify(v);

test('the editor preview (editor: true, nothing selected) is the visitors’ page, byte for byte, on every page and case (ar + en)', () => {
  for (const lang of ['ar', 'en']) {
    for (const page of PAGES) {
      assert.equal(json(buildView(snapshotToRaw(site), lang, page, { editor: true, showHidden: null })), json(buildView(snapshotToRaw(site), lang, page)), `${lang}/${page}`);
    }
    for (const caseSlug of caseSlugs) {
      assert.equal(json(buildView(snapshotToRaw(site), lang, 'work', { editor: true, caseSlug })), json(buildView(snapshotToRaw(site), lang, 'work', { caseSlug })), `${lang}/work/${caseSlug}`);
    }
  }
});

test('the editor preview shows no placeholder, no Concept chip and no sample clients', () => {
  for (const lang of ['ar', 'en']) for (const page of PAGES) {
    const v = buildView(snapshotToRaw(site), lang, page, { editor: true });
    assert.equal(v.base.showConcept, false);
    assert.equal(v.base.preview, false);
    assert.equal(v.ctx.preview, false);
    const text = json(v.sections.map((s) => s.data));
    assert.ok(!/عميل تجريبي|stories-sample/.test(text), `${lang}/${page} sample clients`);
  }
});

test('a section visitors don’t see shows in the editor only while it is selected, dimmed, with the reason', () => {
  const sample = site.sections.find((s) => s.type === 'clientStoriesSection' && s.page === 'home');
  assert.ok(sample, 'seed has a client stories section on Home');
  const pub = buildView(snapshotToRaw(site), 'ar', 'home');
  if (pub.sections.some((s) => s.key === sample.id)) return; // visitors see it (real clients): nothing to check
  const off = buildView(snapshotToRaw(site), 'ar', 'home', { editor: true, showHidden: null });
  assert.ok(!off.sections.some((s) => s.key === sample.id));
  const on = buildView(snapshotToRaw(site), 'ar', 'home', { editor: true, showHidden: sample.id });
  const sec = on.sections.find((s) => s.key === sample.id);
  assert.ok(sec, 'selected → shown');
  assert.equal(sec.hidden, true);
  assert.equal(sec.data._rule.show, false);
});

test('content stored in site_v2 (a JSON round trip of the legacy-derived snapshot) renders the same pages', () => {
  const stored = JSON.parse(JSON.stringify({ settings: site.settings, sections: site.sections.map((x) => ({ id: x.id, type: x.type, hidden: !!x.hidden, data: x.data, page: x.page || 'home' })) }));
  assert.ok(P.isMultiPage(stored), 'read as the multi-page site (no second fromLegacy pass)');
  for (const lang of ['ar', 'en']) for (const page of PAGES) {
    assert.equal(json(buildView(snapshotToRaw(stored), lang, page)), json(buildView(snapshotToRaw(site), lang, page)), `${lang}/${page}`);
  }
  // fromLegacy is deterministic (the migration checks this too)
  assert.equal(json(P.fromLegacy({ settings: seed.settings, sections: seed.sections })), json(site));
});

test('the admin preview frame asks for the visitors’ rendering, and the migration never overwrites admin content', () => {
  const pf = readFileSync(root + 'src/admin/ui/PreviewFrame.tsx', 'utf8');
  assert.match(pf, /editor: true/);
  assert.doesNotMatch(pf, /preview: true \}/);
  const mig = readFileSync(root + 'scripts/pages-migrate.mjs', 'utf8');
  assert.match(mig, /site_v2 already has content/);
  assert.match(mig, /if \(vs\.rows\.length \|\| vr\.rows\.length\)/);
});
