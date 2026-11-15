import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Nov 15, 2026: Google Analytics 4 on the public pages only, production only, with the actions that matter
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('GA4: production ID, public layout only (not the admin or its preview), official domain only', () => {
  const prod = read('netlify.toml').split('[context.production.environment]')[1] ?? '';
  assert.match(prod, /NEXT_PUBLIC_GA_ID = "G-HWVCJ0TNE8"/);
  assert.match(read('src/app/[lang]/layout.shared.tsx'), /<Analytics \/>/);
  assert.doesNotMatch(read('src/app/admin/layout.dyn.tsx'), /Analytics/);
  assert.doesNotMatch(read('src/app/preview/[lang]/layout.dyn.tsx'), /Analytics/);
  const a = read('src/components/Analytics.tsx');
  assert.match(a, /process\.env\.NEXT_PUBLIC_GA_ID/);
  assert.match(a, /clearupagency\\\\?\.com/);
});

test('GA4 events: WhatsApp / e-mail / phone clicks and a sent contact form', () => {
  const a = read('src/components/Analytics.tsx');
  for (const e of ['whatsapp_click', 'email_click', 'phone_click']) assert.match(a, new RegExp(`'${e}'`));
  assert.match(read('src/components/Final.tsx'), /setMode\('sent'\); track\('generate_lead'/);
});
