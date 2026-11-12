import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';

/* ClearUp's asks via Munim, Nov 9, 2026: the commercial registration number and founding year on «من نحن»
   (editable like every other text), and no «غزة» / "Gaza" in the hero line or the share/SEO defaults. */
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/');
const src = (p) => readFileSync(root + p, 'utf8');
const out = path.join(mkdtempSync(path.join(tmpdir(), 'cu-munim-')), 'm.mjs');
buildSync({ stdin: { contents: "export * from './src/admin/inspect.ts'; export { SCHEMA } from './src/admin/content.ts'; export { fromLegacy } from './src/lib/pages.ts';", resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, loader: { '.json': 'json' }, logLevel: 'silent' });
const M = await import(pathToFileURL(out).href);
const seed = JSON.parse(src('seed/content.json'));

test('«معلومات الشركة» is a field of the page head (a list of short texts, in the content tab)', () => {
  const schema = JSON.parse(src('src/admin/schema.json'));
  const ph = schema.sections.find((s) => s.name === 'pageHeadSection');
  const f = ph.fields.find((x) => x.name === 'facts');
  assert.ok(f, 'facts field');
  assert.equal(f.type, 'array');
  assert.deepEqual(f.of, [{ type: 'localeString' }]);
  assert.equal(f.group, 'content');
});

test('each fact is click-to-edit: the preview finds its own field path (facts.0, facts.1) in ar and en', () => {
  const data = { facts: [{ _type: 'localeString', _key: 'a', ar: 'سجل تجاري رقم 60784', en: 'Commercial Registration No. 60784' }, { _type: 'localeString', _key: 'b', ar: 'تأسست 2023', en: 'Founded 2023' }] };
  for (const [lang, a, b] of [['ar', 'سجل تجاري رقم 60784', 'تأسست 2023'], ['en', 'Commercial Registration No. 60784', 'Founded 2023']]) {
    const c = M.candidates(data, lang);
    assert.ok(c.some((x) => x.path === 'facts.0' && x.text === a), lang + ' facts.0');
    assert.ok(c.some((x) => x.path === 'facts.1' && x.text === b), lang + ' facts.1');
  }
});

test('the About page head renders the facts as a small list under the lead, and only when filled', () => {
  const t = src('src/components/pages/PageHead.tsx');
  assert.match(t, /className="phead__facts"/);
  assert.match(t, /facts\.length > 0/);
  assert.match(src('src/app/globals.css'), /\.phead__facts li \{/);
});

test('the code defaults carry the facts on About and no «غزة» in the hero line or the share texts', () => {
  const legacy = M.fromLegacy({ settings: seed.settings, sections: seed.sections });
  const about = legacy.sections.find((s) => s.page === 'about' && s.type === 'pageHeadSection');
  assert.deepEqual(about.data.facts.map((f) => [f.ar, f.en]), [['سجل تجاري رقم 60784', 'Commercial Registration No. 60784'], ['تأسست 2023', 'Founded 2023']]);
  const hero = legacy.sections.find((s) => s.type === 'heroSection').data;
  assert.doesNotMatch(hero.kicker.ar + hero.kicker.en, /غزة|Gaza/);
  assert.doesNotMatch(String(legacy.settings?.metaTitle?.ar ?? '') + String(legacy.settings?.metaTitle?.en ?? ''), /غزة|Gaza/);
  const seo = src('src/lib/seo.ts');
  const fallback = seo.slice(seo.indexOf('const FALLBACK'), seo.indexOf('export function pageMetadata'));
  assert.doesNotMatch(fallback, /غزة|Gaza/);
});
