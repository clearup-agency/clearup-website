import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Nov 15, 2026: any address outside /ar/ and /en/ shows the site's own 404 (not Next.js's plain black page)
test('unknown addresses are rewritten to the site 404 (server build only); known prefixes and files are left alone', () => {
  const src = readFileSync(new URL('../src/proxy.dyn.ts', import.meta.url), 'utf8');
  assert.match(src, /export function proxy/);
  assert.match(src, /NextResponse\.rewrite\(new URL\('\/ar\/__not-found__\/'/);
  const m = src.match(/matcher: \['(.+)'\]/)[1].replace(/\\\\/g, '\\');
  const re = new RegExp('^' + m + '$');
  for (const p of ['/test-123/', '/about-old', '/random/deep/path/']) assert.ok(re.test(p), p);
  for (const p of ['/ar/', '/en/about/', '/admin/login/', '/api/contact/', '/robots.txt', '/brand/logo.svg', '/_next/static/x.js', '/preview/ar/', '/media-db/1/a.png']) assert.ok(!re.test(p), p);
});
