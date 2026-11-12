import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';
// The live editor renders the draft in the browser with the same code as the public pages (src/lib/view.ts).
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/'); // not URL.pathname: that is /D:/... on Windows
const out = path.join(mkdtempSync(path.join(tmpdir(), 'cu-view-')), 'view.mjs');
buildSync({ entryPoints: [root + 'src/lib/view.ts'], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, logLevel: 'silent' });
const { buildView, snapshotToRaw, seedContent } = await import(pathToFileURL(out).href);
const seed = JSON.parse(readFileSync(root + 'seed/content.json', 'utf8'));

test('a draft renders every visible section, in the draft order, in both languages', () => {
  const draft = { settings: seed.settings, sections: [...seed.sections].reverse() };
  for (const lang of ['ar', 'en']) {
    const v = buildView(snapshotToRaw(draft), lang);
    assert.deepEqual(v.sections.map((s) => s.key), draft.sections.map((s) => s.id));
    assert.equal(v.lang, lang);
  }
});
test('hidden sections stay off the page, except the one being edited (shown, flagged hidden)', () => {
  const sections = seed.sections.map((s, i) => (i === 1 ? { ...s, hidden: true } : s));
  const raw = snapshotToRaw({ settings: seed.settings, sections });
  assert.equal(buildView(raw, 'ar').sections.length, seed.sections.length - 1);
  const v = buildView(raw, 'ar', 'home', { showHidden: sections[1].id });
  assert.equal(v.sections.length, seed.sections.length);
  assert.equal(v.sections[1].hidden, true);
  assert.equal(v.sections[0].hidden, undefined);
});
test('typing a new text or colour in the draft changes what the preview renders', () => {
  const s = structuredClone(seedContent);
  s.settings.brandName = 'TEST BRAND';
  s.settings.colors = { ...(s.settings.colors || {}), purple: { _type: 'color', hex: '#C2185B' } };
  const v = buildView(snapshotToRaw(s), 'ar');
  assert.equal(v.base.site.brandName, 'TEST BRAND');
  assert.equal(v.colors.purple, '#C2185B');
});
test('the preview may only be framed by our own admin; the admin itself never', () => {
  const cfg = readFileSync(root + 'next.config.mjs', 'utf8');
  assert.match(cfg, /'\/preview\/:path\*'[\s\S]*frame-ancestors 'self'/);
  assert.match(cfg, /frame-ancestors 'none'/);
  const page = readFileSync(root + 'src/app/preview/[lang]/page.dyn.tsx', 'utf8');
  assert.match(page, /editorState\(\)/, 'preview page must check the admin session');
  const frame = readFileSync(root + 'src/admin/ui/PreviewFrame.tsx', 'utf8');
  assert.match(frame, /e\.origin !== window\.location\.origin/, 'preview must ignore messages from other origins');
});
