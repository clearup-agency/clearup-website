import { test } from 'node:test';
import assert from 'node:assert/strict';

// Nov 15, 2026: Google still lists the old site's pages (/about, /contact…) — they redirect to the new pages
test('old site URLs redirect permanently to the new Arabic pages', async () => {
  const cfg = (await import('../next.config.mjs')).default;
  const r = await cfg.redirects();
  const to = (src) => r.find((x) => x.source === src);
  for (const [src, dest] of [['/about', '/ar/about/'], ['/contact/', '/ar/contact/'], ['/services', '/ar/services/'], ['/portfolio/', '/ar/work/'], ['/home', '/ar/']]) {
    assert.equal(to(src)?.destination, dest, src);
    assert.equal(to(src)?.permanent, true, src);
  }
  assert.equal(to('/')?.destination, '/ar/');
});

test('Netlify applies the same old-URL redirects itself (netlify.toml)', async () => {
  const { readFileSync } = await import('node:fs');
  const toml = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');
  for (const [from, to] of [['/about', '/ar/about/'], ['/contact', '/ar/contact/'], ['/services', '/ar/services/'], ['/portfolio', '/ar/work/'], ['/home', '/ar/']]) {
    assert.match(toml, new RegExp(`from = "${from}"\\s+to = "${to}"\\s+status = 301\\s+force = true`), from);
  }
});
