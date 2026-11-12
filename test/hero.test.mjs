import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
const site = new URL('../site/', import.meta.url);
const read = (p) => readFileSync(new URL(p, site), 'utf8');
// needs the static build in site/ (scripts/preview-site.sh); skipped when it hasn't been built
const skip = existsSync(new URL('ar/index.html', site)) ? false : 'no static build in site/ (run scripts/preview-site.sh)';
for (const lang of ['ar', 'en']) {
  test(`hero v4 (landing) is in the built ${lang} page`, { skip }, () => {
    const html = read(`${lang}/index.html`);
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1"/);
    assert.match(html, /<title>[^<]{10,}<\/title>/);
    assert.match(html, /class="hl"/);
    assert.match(html, /class="hl__s"/);           // the struck word
    assert.match(html, /class="hl__bg"/);          // the Business Model Canvas photo grid
    assert.doesNotMatch(html, /mk__arrow|hx__clean|hx__chips/); // the animated mark (v3) and v2 are gone
    assert.match(html, new RegExp(`href="(#book|/${lang}/contact/)"`)); // book-a-call CTA (the Contact page on the multi-page site)
    assert.match(html, /wa\.me\//);                 // WhatsApp
    assert.doesNotMatch(html, /mark3d|three\.module/); // old 3D hero gone
    assert.match(html, lang === 'ar' ? /dir="rtl"/ : /dir="ltr"/);
  });
}
// Thmanyah's files are git-ignored (licence): with them the page inlines their @font-face; without them it must
// not reference them at all (that was 4 × 404 per page view) and loads IBM Plex Sans Arabic instead.
const thmInRepo = existsSync(new URL('../public/fonts/thmanyah/thmanyahsans-Regular.woff2', import.meta.url));
test('the site font: Thmanyah Sans when its files are present, else IBM Plex Sans Arabic — never a missing file', { skip }, () => {
  const cssDirs = ['_next/static/css/', '_next/static/chunks/'].filter((p) => existsSync(new URL(p, site)));
  const css = cssDirs.flatMap((p) => readdirSync(new URL(p, site)).filter((f) => f.endsWith('.css')).map((f) => read(p + f))).join('');
  assert.match(css, /Thmanyah Sans/);              // first in the font stack
  assert.doesNotMatch(css, /Alexandria/);
  for (const lang of ['ar', 'en']) {
    const html = read(`${lang}/index.html`);
    for (const u of [...(html + css).matchAll(/\/fonts\/thmanyah\/[\w-]+\.woff2/g)].map((m) => m[0])) assert.ok(existsSync(new URL('.' + u, site)), u);
    // Arabic uses Thmanyah by default; English uses the Latin font picked in the admin
    if (lang === 'ar') assert.match(html, thmInRepo ? /id="thmanyah-font"/ : /id="fallback-font"[^]*IBM Plex Sans Arabic/);
  }
});
test('every local asset referenced by the AR page exists', { skip }, () => {
  const html = read('ar/index.html');
  const refs = [...html.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)].map((m) => m[1]).filter((u) => !u.endsWith('/'));
  for (const u of refs) assert.ok(existsSync(new URL('.' + u, site)), u);
});
