import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';

// Nov 25, 2026 (Mohamed: «أي تعديل على الموقع أو المحتوى أو أي صورة أو فيديو … يتعدل مباشرة من لوحة الأدمن»): every
// section of the value-proposition site has an admin form, and saving it from the admin keeps everything — the
// admin's save (cleanSection / cleanSettings) drops any field its form doesn't know, so nothing the pages show may
// live outside the forms.
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/');
mkdirSync(root + 'node_modules/.cache', { recursive: true });
const dir = mkdtempSync(root + 'node_modules/.cache/cu-adminv3-');
const bundle = (entry, name) => {
  const out = path.join(dir, name);
  buildSync({ entryPoints: [root + entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, logLevel: 'silent', jsx: 'automatic', loader: { '.tsx': 'tsx', '.json': 'json' } });
  return import(pathToFileURL(out).href);
};
const { cleanSection, cleanSettings } = await bundle('src/admin/validate.ts', 'validate.mjs');
const { SECTION_TYPES } = await bundle('src/admin/content.ts', 'content.mjs');
const snap = JSON.parse(readFileSync(root + 'preview/v3-content.json', 'utf8'));

// what a save keeps of a value: everything but the keys the admin manages itself or rebuilds
const SELF = new Set(['hidden', 'design', 'index', '_page']);
const norm = (v) => {
  if (Array.isArray(v)) return v.map(norm);
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, x] of Object.entries(v)) if (!SELF.has(k) && x !== undefined && x !== null) o[k] = norm(x);
    return o;
  }
  return v;
};

test('every section on every page has an admin form', () => {
  const missing = [...new Set(snap.sections.map((s) => s.type).filter((t) => !SECTION_TYPES[t]))];
  assert.deepEqual(missing, []);
});

test('saving any section from the admin keeps all of its content (texts, images, videos, links, lists)', () => {
  for (const s of snap.sections) {
    const saved = cleanSection(s.type, s.data);
    assert.deepEqual(norm(saved), norm(s.data), `${s.page} / ${s.type} (${s.id})`);
  }
});

test('saving the site settings keeps the menu dropdown, the footer link and the new pages\' search texts', () => {
  const saved = cleanSettings(snap.settings);
  const sectors = saved.navLinks.find((l) => l.href === '/sectors/');
  assert.equal(sectors.children.length, 4);
  assert.equal(sectors.children[0].href, '/sectors/development/');
  assert.ok(saved.footerDiag?.ar);
  for (const p of ['sectors', 'accelerator', 'assessment', 'sector-health']) assert.ok(saved.pageMeta[p], p);
});
