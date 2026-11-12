import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sep } from 'node:path';
// The font settings: what the admin pastes (a Google Fonts link or name) → family + weights → CSS.
const root = fileURLToPath(new URL('..', import.meta.url)).split(sep).join('/'); // not URL.pathname: that is /D:/... on Windows
const out = path.join(mkdtempSync(path.join(tmpdir(), 'cu-fonts-')), 'fonts.mjs');
buildSync({ entryPoints: [root + 'src/lib/theme.ts'], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': root + 'src' }, logLevel: 'silent' });
const T = await import(pathToFileURL(out).href);
const fontsOut = path.join(path.dirname(out), 'f.mjs');
buildSync({ entryPoints: [root + 'src/lib/fonts.ts'], bundle: true, format: 'esm', platform: 'node', outfile: fontsOut, logLevel: 'silent' });
const { parseGoogleFont, css2Url, asFontChoice, fontStack, fontLoad, DEFAULT_EN, DEFAULT_AR } = await import(pathToFileURL(fontsOut).href);

test('a Google Fonts specimen page gives the family (no weights)', () => {
  assert.deepEqual(parseGoogleFont('https://fonts.google.com/specimen/Cairo'), { family: 'Cairo', weights: null });
  assert.deepEqual(parseGoogleFont('https://fonts.google.com/specimen/Inter+Tight?query=inter'), { family: 'Inter Tight', weights: null });
  assert.deepEqual(parseGoogleFont('https://fonts.google.com/specimen/IBM+Plex+Sans+Arabic#standard-styles'), { family: 'IBM Plex Sans Arabic', weights: null });
});
test('a css2 link gives the family and its weights (lists, ranges, ital tuples)', () => {
  assert.deepEqual(parseGoogleFont('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap'), { family: 'Cairo', weights: [400, 700] });
  assert.deepEqual(parseGoogleFont('https://fonts.googleapis.com/css2?family=Inter:wght@300..600&display=swap'), { family: 'Inter', weights: [300, 400, 500, 600] });
  assert.deepEqual(parseGoogleFont('https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,400;0,800;1,400&display=swap'), { family: 'Inter Tight', weights: [400, 800] });
  assert.deepEqual(parseGoogleFont('https://fonts.googleapis.com/css2?family=Manrope&display=swap'), { family: 'Manrope', weights: null });
});
test('pasted <link> / @import snippets and the old css API work too', () => {
  assert.deepEqual(parseGoogleFont('<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&amp;display=swap" rel="stylesheet">').family, 'Cairo');
  assert.deepEqual(parseGoogleFont("@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@500;900&display=swap');"), { family: 'Tajawal', weights: [500, 900] });
  assert.deepEqual(parseGoogleFont('https://fonts.googleapis.com/css?family=Open+Sans:400,700|Roboto'), { family: 'Open Sans', weights: [400, 700] });
});
test('a bare family name is accepted; junk and other sites are refused', () => {
  assert.deepEqual(parseGoogleFont('  Plus Jakarta Sans '), { family: 'Plus Jakarta Sans', weights: null });
  assert.ok('error' in parseGoogleFont(''));
  assert.ok('error' in parseGoogleFont('https://evil.example.com/css2?family=Cairo'));
  assert.ok('error' in parseGoogleFont('https://fonts.google.com/'));
  assert.ok('error' in parseGoogleFont("Cairo'); } body { display:none"));
  assert.ok('error' in parseGoogleFont('<script>alert(1)</script>'));
});
test('css2Url builds a valid stylesheet link', () => {
  assert.equal(css2Url('Inter Tight', [900, 400, 400, 1200]), 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;900&display=swap');
  assert.equal(css2Url('Cairo', []), 'https://fonts.googleapis.com/css2?family=Cairo&display=swap');
});
test('stored settings are normalised; unsafe values fall back to the default', () => {
  assert.deepEqual(asFontChoice('cairo', DEFAULT_AR), { kind: 'preset', id: 'cairo' }); // the old single «font» setting
  assert.deepEqual(asFontChoice(undefined, DEFAULT_EN), DEFAULT_EN);
  assert.deepEqual(asFontChoice({ kind: 'google', family: 'Cairo', weights: [700, 400] }, DEFAULT_EN), { kind: 'google', family: 'Cairo', weights: [400, 700] });
  assert.deepEqual(asFontChoice({ kind: 'google', family: "x'}body{" }, DEFAULT_EN), DEFAULT_EN);
  assert.deepEqual(asFontChoice({ kind: 'file', family: 'Brand', url: 'https://attacker.example/f.woff2' }, DEFAULT_EN), DEFAULT_EN);
  assert.equal(asFontChoice({ kind: 'file', family: 'Brand', url: 'https://res.cloudinary.com/x/raw/upload/v1/f.woff2' }, DEFAULT_EN).kind, 'file');
});
test('stacks and loading: Thmanyah stays local for Arabic; English gets its font with Thmanyah as fallback', () => {
  assert.match(fontStack(DEFAULT_AR, 'ar'), /^'Thmanyah Sans'/);
  assert.deepEqual(fontLoad(DEFAULT_AR), { thmanyah: true });
  assert.match(fontStack(DEFAULT_EN, 'en'), /^'Manrope', 'Thmanyah Sans'/);
  assert.match(fontLoad({ kind: 'google', family: 'Cairo', weights: [400, 700] }).href, /family=Cairo:wght@400;700&display=swap$/);
  assert.match(fontLoad({ kind: 'file', family: 'Brand', url: 'https://res.cloudinary.com/x/raw/upload/v1/f.woff2' }).faceCss, /format\('woff2'\)/);
});
test('theme CSS: Arabic default adds nothing new; motion settings become variables', () => {
  const v = { colors: {}, lang: 'ar', fontAr: DEFAULT_AR, fontEn: DEFAULT_EN, motion: T.DEFAULT_MOTION };
  assert.equal(T.themeCss(v), '');
  const en = T.themeCss({ ...v, lang: 'en' });
  assert.match(en, /--f:'Manrope'/);
  const slow = T.themeCss({ ...v, motion: { enabled: true, heroSpeed: 0.5, parallax: 0, reveal: false } });
  assert.match(slow, /--hx-speed:2/);
  assert.match(slow, /--hx-par:0/);
  assert.match(slow, /data-reveal/);
  assert.match(T.themeCss({ ...v, motion: { ...T.DEFAULT_MOTION, enabled: false } }), /animation-duration:0s/);
});
