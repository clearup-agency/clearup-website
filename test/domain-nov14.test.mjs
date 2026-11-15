import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Nov 14, 2026: clearupagency.com is live on Netlify — production builds use it and may be indexed
const toml = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');

test('production uses the official domain and is indexable; previews are not', () => {
  const prod = toml.split('[context.production.environment]')[1] ?? '';
  assert.match(prod, /NEXT_PUBLIC_SITE_URL = "https:\/\/clearupagency\.com"/);
  assert.match(prod, /NEXT_PUBLIC_SEO_INDEXABLE = "true"/);
  assert.doesNotMatch(toml.split('[context.production.environment]')[0], /SEO_INDEXABLE/);
});

test('the Netlify address redirects to the official domain', () => {
  assert.match(toml, /from = "https:\/\/wepclearup\.netlify\.app\/\*"\s+to = "https:\/\/clearupagency\.com\/:splat"\s+status = 301/);
});

test('Google Search Console verification code is set for production', () => {
  const prod = toml.split('[context.production.environment]')[1] ?? '';
  assert.match(prod, /NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION = "X_iY82nerUtIm-kGb8eQjXVr7GtSqG4pShzBoxVfZe0"/);
});

test('the SEO switches are baked into the build (Netlify gives netlify.toml values to the build only)', () => {
  const seo = readFileSync(new URL('../src/lib/seo.ts', import.meta.url), 'utf8');
  assert.match(seo, /process\.env\.NEXT_PUBLIC_SEO_INDEXABLE \|\| process\.env\.SEO_INDEXABLE\) !== 'true'/);
  assert.match(seo, /process\.env\.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION \|\| process\.env\.GOOGLE_SITE_VERIFICATION/);
});
