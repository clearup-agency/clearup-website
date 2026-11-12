import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
// The content the database is seeded with (migrated from the old CMS) must match the admin's form
// definitions: every section type exists, every bilingual text has both languages, images point at real files.
const seed = JSON.parse(readFileSync(new URL('../seed/content.json', import.meta.url), 'utf8'));
const schema = JSON.parse(readFileSync(new URL('../src/admin/schema.json', import.meta.url), 'utf8'));
const types = new Set(schema.sections.map((t) => t.name));

test('seed is a clearup-content file with settings and the 12 homepage sections in order', () => {
  assert.equal(seed.format, 'clearup-content');
  assert.ok(seed.settings && typeof seed.settings === 'object');
  assert.deepEqual(seed.sections.map((s) => s.type), [
    'heroSection', 'clientsSection', 'problemSection', 'systemSection', 'resultsSection', 'servicesSection',
    'auditSection', 'ninetySection', 'founderSection', 'testimonialsSection', 'faqSection', 'finalCtaSection',
  ]);
});
test('every section type in the seed has an admin form, and ids are unique', () => {
  for (const s of seed.sections) assert.ok(types.has(s.type), s.type);
  assert.equal(new Set(seed.sections.map((s) => s.id)).size, seed.sections.length);
});
test('every bilingual field has Arabic and English, and array items have keys', () => {
  const walk = (v, path) => {
    if (Array.isArray(v)) return v.forEach((x, i) => { if (x && typeof x === 'object') assert.ok(x._key, path + '[' + i + '] needs _key'); walk(x, path + '[' + i + ']'); });
    if (!v || typeof v !== 'object') return;
    if (v._type === 'localeString' || v._type === 'localeText') {
      assert.ok(String(v.ar).trim(), path + '.ar empty');
      assert.ok(String(v.en).trim(), path + '.en empty');
      return;
    }
    for (const [k, x] of Object.entries(v)) walk(x, path + '.' + k);
  };
  walk(seed.settings, 'settings');
  seed.sections.forEach((s, i) => walk(s.data, 'sections[' + i + ']'));
});
test('no Sanity references are left; every local image/video exists in public/', () => {
  const txt = JSON.stringify(seed);
  assert.doesNotMatch(txt, /cdn\.sanity\.io|"_ref"|"asset"/);
  for (const m of txt.matchAll(/"url":"(\/media\/[^"]+)"/g)) assert.ok(existsSync(new URL('../public' + m[1], import.meta.url)), m[1]);
});
test('every settings field the site reads has a form field', () => {
  const names = new Set(schema.settings.fields.map((f) => f.name));
  for (const k of ['logo', 'colors', 'whatsapp', 'socials', 'metaTitle', 'metaDescription', 'ogImage', 'navLinks']) assert.ok(names.has(k), k);
});
