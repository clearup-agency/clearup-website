import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';

// One section, one component, one source (Mohamed, Nov 8, 2026): the FAQ on Home is the FAQ on Services — the same
// component and the same questions — and Home's six-stage row reads the Services page's stages.
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/');
const dir = mkdtempSync(path.join(tmpdir(), 'cu-shared-'));
const bundle = (entry, name) => {
  const out = path.join(dir, name);
  buildSync({ entryPoints: [root + entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, logLevel: 'silent' });
  return import(pathToFileURL(out).href);
};
const P = await bundle('src/lib/pages.ts', 'pages.mjs');
const { buildView, snapshotToRaw } = await bundle('src/lib/view.ts', 'view.mjs');
const seed = JSON.parse(readFileSync(root + 'seed/content.json', 'utf8'));
const site = P.fromLegacy({ settings: seed.settings, sections: seed.sections });
const view = (c, lang, page) => buildView(snapshotToRaw(c), lang, page);
const faqOf = (v) => v.sections.filter((s) => s.type === 'faqSection');
const content = (s) => ({ eyebrow: s.data.eyebrow, title: s.data.title, items: s.data.items.map((it) => [it.q, it.a]) });

test('Home and Services render the same FAQ: one faqSection each, same questions, same order, same words (ar + en)', () => {
  for (const lang of ['ar', 'en']) {
    const home = faqOf(view(site, lang, 'home'));
    const svc = faqOf(view(site, lang, 'services'));
    assert.equal(home.length, 1, lang + ' home');
    assert.equal(svc.length, 1, lang + ' services');
    assert.deepEqual(content(home[0]), content(svc[0]));
    assert.ok(svc[0].data.items.length >= 3);
    assert.equal(home[0].data.limit, undefined); // no «first 3» copy any more
    // the FAQ the component shows (Faq.tsx reads d.faq)
    assert.deepEqual(home[0].d.faq.items, svc[0].d.faq.items);
  }
});

test('a stored Home FAQ with its own (older, shorter) copy still shows the Services questions', () => {
  const c = JSON.parse(JSON.stringify(site));
  const h = c.sections.find((s) => s.type === 'faqSection' && (s.page || 'home') === 'home');
  h.data = { ...h.data, items: h.data.items.slice(0, 1).map((it) => ({ ...it, q: P.ls('سؤال قديم؟', 'Old?') })), limit: 3, title: P.ls('عنوان آخر', 'Other title') };
  const home = faqOf(view(c, 'ar', 'home'))[0];
  const svc = faqOf(view(c, 'ar', 'services'))[0];
  assert.deepEqual(content(home), content(svc));
  assert.equal(home.anchor, 'faq'); // keeps its own place on Home
  // hidden on Home = hidden only on Home
  h.hidden = true;
  assert.equal(faqOf(view(c, 'ar', 'home')).length, 0);
  assert.equal(faqOf(view(c, 'ar', 'services')).length, 1);
});

test('one FAQ component: every faqSection renders through Faq.tsx, and only Faq.tsx draws a FAQ', () => {
  const sections = readFileSync(root + 'src/components/Sections.tsx', 'utf8');
  assert.match(sections, /case 'faqSection': el = <Faq d=\{d\} \/>/);
  assert.equal((sections.match(/<Faq\b/g) ?? []).length, 1);
  const files = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx$/.test(e.name) && files.push(path.join(d, e.name)); };
  walk(root + 'src/components');
  const drawers = files.filter((f) => /className="faq[ _"]|className="qa"/.test(readFileSync(f, 'utf8'))).map((f) => path.basename(f));
  assert.deepEqual(drawers, ['Faq.tsx']);
});

test('Home\'s six-stage row reads the Services page\'s stages (one source)', () => {
  const c = JSON.parse(JSON.stringify(site));
  const svc = c.sections.find((s) => s.type === 'systemSection' && s.page === 'services');
  svc.data.stages[0].name = P.ls('مرحلة معدّلة', 'Edited stage');
  const homeSys = view(c, 'ar', 'home').sections.find((s) => s.type === 'systemSection');
  assert.ok(homeSys.data.compact, 'home keeps the compact row');
  assert.equal(homeSys.data.stages[0].name, 'مرحلة معدّلة');
  assert.equal(view(c, 'en', 'services').sections.find((s) => s.type === 'systemSection').data.stages[0].name, 'Edited stage');
});

test('every section header is the one SectionHead component', () => {
  const files = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx$/.test(e.name) && files.push(path.join(d, e.name)); };
  walk(root + 'src/components');
  const inline = files.filter((f) => !f.endsWith('SectionHead.tsx') && /<header className="shead/.test(readFileSync(f, 'utf8'))).map((f) => path.basename(f));
  assert.deepEqual(inline, []);
});

test('About manifesto: a dark band with «للرؤساء التنفيذيين الشجعان فقط» in yellow', () => {
  const css = readFileSync(root + 'src/app/globals.css', 'utf8');
  assert.match(css, /\.mani \{ background: var\(--ink\);/);
  assert.match(css, /\.mani__k \{[^}]*color: var\(--yellow\)/);
  const about = view(site, 'ar', 'about').sections.find((s) => s.type === 'manifestoSection');
  assert.equal(about.data.kicker, 'للرؤساء التنفيذيين الشجعان فقط');
});
