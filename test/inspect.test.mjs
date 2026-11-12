import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';
// Inspect-style editing: what the preview tags (field paths) must be paths the panel can find.
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/'); // not URL.pathname: that is /D:/... on Windows
const out = path.join(mkdtempSync(path.join(tmpdir(), 'cu-insp-')), 'inspect.mjs');
buildSync({ stdin: { contents: "export * from './src/admin/inspect.ts'; export { SECTION_TYPES, SCHEMA } from './src/admin/content.ts';", resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, loader: { '.json': 'json' }, logLevel: 'silent' });
const { candidates, fieldTrail, pathLabel, parents, normText, SECTION_TYPES, SCHEMA } = await import(pathToFileURL(out).href);
const seed = JSON.parse(readFileSync(root + 'seed/content.json', 'utf8'));
const hero = seed.sections.find((s) => s.type === 'heroSection');

test('hero texts and images get their field paths, in each language', () => {
  const ar = candidates(hero.data, 'ar');
  // this language's candidates come first (the other language's follow, for a name shown in English)
  const byPath = Object.fromEntries([...ar].reverse().map((c) => [c.path, c.text ?? c.url]));
  assert.equal(byPath['title.0'], normText(hero.data.title[0].ar));
  assert.equal(byPath['strike'], hero.data.strike.ar);
  assert.equal(byPath['stats.1.v'], hero.data.stats[1].v.ar);
  assert.equal(byPath['cta'], hero.data.cta.ar);
  const en = Object.fromEntries([...candidates(hero.data, 'en')].reverse().map((c) => [c.path, c.text]));
  assert.equal(en['title.0'], normText(hero.data.title[0].en));
});
test('an empty English text falls back to the Arabic one (as the page shows it)', () => {
  const c = candidates({ t: { _type: 'localeString', ar: 'مرحبا', en: '' } }, 'en');
  assert.deepEqual(c, [{ path: 't', text: 'مرحبا' }]);
});
test('rich text gives one candidate per paragraph, all on the field', () => {
  const c = candidates({ body: { _type: 'localeBlock', ar: [{ _type: 'block', children: [{ text: 'أ' }] }, { _type: 'block', children: [{ text: 'ب' }, { text: 'ج' }] }], en: [] } }, 'ar');
  assert.deepEqual(c, [{ path: 'body', text: 'أ' }, { path: 'body', text: 'بج' }]);
});
test('images and settings get prefixed paths; colours are not candidates', () => {
  const c = candidates({ logo: { _type: 'image', url: 'https://res.cloudinary.com/x/a.png' }, colors: { purple: { _type: 'color', hex: '#5B2096' } }, cta: { _type: 'localeString', ar: 'احجز', en: 'Book' } }, 'en', 's:');
  // …and the other language's text last (a word shown in the other language still finds its field)
  assert.deepEqual(c, [{ path: 's:logo', url: 'https://res.cloudinary.com/x/a.png' }, { path: 's:cta', text: 'Book' }, { path: 's:cta', text: 'احجز' }]);
});
test('every path the seed content produces resolves to a real field in the panel schema', () => {
  let n = 0;
  for (const s of seed.sections) {
    const fields = SECTION_TYPES[s.type].fields;
    for (const c of candidates(s.data, 'ar')) {
      const trail = fieldTrail(fields, c.path);
      const resolved = trail.map((t) => t.path).pop();
      assert.equal(resolved, c.path, `${s.type}: ${c.path}`);
      n++;
    }
  }
  for (const c of candidates(seed.settings, 'ar')) assert.equal(fieldTrail(SCHEMA.settings.fields, c.path).pop().path, c.path, c.path);
  assert.ok(n > 100, `only ${n} paths`);
});
test('labels and the breadcrumb trail read like the panel', () => {
  const f = SECTION_TYPES.heroSection.fields;
  assert.deepEqual(fieldTrail(f, 'stats.1.v').map((t) => t.title), ['الأرقام أسفل الواجهة', '2', 'الرقم']);
  assert.match(pathLabel(f, 'stats.1.v'), /الأرقام أسفل الواجهة › الرقم · 2/);
  assert.deepEqual(parents('a.1.b'), ['a.1.b', 'a.1', 'a']);
});
