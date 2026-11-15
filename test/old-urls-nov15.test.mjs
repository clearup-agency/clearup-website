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
