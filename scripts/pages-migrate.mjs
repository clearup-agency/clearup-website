// One source for the site and the admin (Mohamed, Nov 8, 2026: «الموقع الي بظهر في لوحة الادمن للتعديل غير الموقع
// الي بظهر على رابط فيرسل النهائي»). Until the first «نشر» from the new editor, the site and the editor build the
// pages from the old one-page tables (`sections` + `site_settings`, through fromLegacy in src/lib/pages.ts) on
// every read. This copies exactly that result — the content the live site shows right now — into the tables the
// admin edits (site_v2_settings + site_v2_sections), once, so both read and write the same rows from then on.
// The old tables are left as they are (read only, a fallback that is never reached while site_v2 has content).
//
//   DATABASE_URL=… node scripts/pages-migrate.mjs                 → dry run: prints what would be written
//   DATABASE_URL=… node scripts/pages-migrate.mjs --out f.json    → also writes the snapshot it would store
//   DATABASE_URL=… node scripts/pages-migrate.mjs --apply         → writes it in one transaction + an «السجل» entry
//
// Idempotent and safe: if site_v2 already has content (anything published from the admin) it writes NOTHING —
// it only reports whether that content equals the legacy-derived one. A second --apply changes nothing.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSync } from 'esbuild';
import pg from 'pg';
import { pgSsl } from './db-ssl.mjs';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set'); process.exit(1); }
const apply = process.argv.includes('--apply');
const outAt = process.argv.indexOf('--out');
const outFile = outAt > 0 ? process.argv[outAt + 1] : null;

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = mkdtempSync(path.join(tmpdir(), 'cu-pages-'));
const entry = path.join(dir, 'entry.ts');
writeFileSync(entry, `export { fromLegacy } from ${JSON.stringify(path.join(root, 'src/lib/pages.ts'))};\nexport { seedContent, buildView, snapshotToRaw } from ${JSON.stringify(path.join(root, 'src/lib/view.ts'))};\n`);
const out = path.join(dir, 'pages.mjs');
buildSync({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': path.join(root, 'src') }, jsx: 'automatic', logLevel: 'silent' });
const { fromLegacy, seedContent, buildView, snapshotToRaw } = await import(pathToFileURL(out).href);

/** Exactly what src/lib/cms.ts → loadLegacy() gives the site and the editor today. */
async function legacySnapshot(client) {
  const s = await client.query('SELECT data FROM site_settings LIMIT 1');
  const rows = await client.query('SELECT id, type, hidden, data FROM sections ORDER BY position');
  const legacy = { settings: s.rows[0]?.data ?? {}, sections: rows.rows.map((r) => ({ id: r.id, type: r.type, hidden: r.hidden, data: r.data })) };
  const c = rows.rows.length ? fromLegacy(legacy) : fromLegacy(seedContent);
  return { settings: c.settings, sections: c.sections.map((x) => ({ id: x.id, type: x.type, hidden: !!x.hidden, data: x.data, page: x.page || 'home' })) };
}
// Postgres jsonb stores object keys in its own order, so compare with sorted keys (arrays keep their order).
const sorted = (v) => (Array.isArray(v) ? v.map(sorted) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted(v[k])])) : v);
const canon = (c) => JSON.stringify(sorted({ settings: c.settings, sections: c.sections.map((x) => ({ id: x.id, type: x.type, hidden: !!x.hidden, data: x.data, page: x.page || 'home' })) }));
/** Every page and case study, ar + en, as visitors get it — to prove the stored rows render the same site. */
const pagesOf = (c) => {
  const out = [];
  const slugs = c.sections.filter((x) => x.type === 'caseStudy').map((x) => String(x.data?.slug ?? '')).filter(Boolean);
  for (const lang of ['ar', 'en']) {
    for (const page of ['home', 'services', 'work', 'about', 'contact']) out.push(buildView(snapshotToRaw(c), lang, page));
    for (const caseSlug of slugs) out.push(buildView(snapshotToRaw(c), lang, 'work', { caseSlug }));
  }
  return JSON.stringify(sorted(out));
};

const client = new pg.Client({ connectionString: url, ssl: pgSsl(url) });
await client.connect();
const host = new URL(url).hostname;
try {
  await client.query('BEGIN');
  const want = await legacySnapshot(client);
  const again = await legacySnapshot(client);
  if (canon(want) !== canon(again)) throw new Error('fromLegacy is not deterministic — refusing');
  if (outFile) writeFileSync(outFile, JSON.stringify(want, null, 1));

  const vs = await client.query('SELECT id, data FROM site_v2_settings');
  const vr = await client.query('SELECT id, page, type, hidden, data FROM site_v2_sections ORDER BY position');
  const dr = await client.query('SELECT updated_at FROM site_v2_drafts');
  const byPage = {};
  for (const x of want.sections) byPage[x.page] = (byPage[x.page] ?? 0) + 1;
  console.log(`database ${host}: legacy-derived content = ${want.sections.length} sections ${JSON.stringify(byPage)}, ${Object.keys(want.settings).length} settings keys`);

  if (vs.rows.length || vr.rows.length) {
    const have = { settings: vs.rows[0]?.data ?? {}, sections: vr.rows };
    console.log(`site_v2 already has content (${vr.rows.length} sections) — nothing written. ${canon(have) === canon(want) ? 'It equals the legacy-derived content (already migrated).' : 'It differs from the legacy-derived content (edited/published from the admin) — left untouched.'}`);
    await client.query('ROLLBACK');
  } else if (!apply) {
    console.log(`dry run — nothing written (add --apply to write). Unpublished drafts: ${dr.rows.length}`);
    await client.query('ROLLBACK');
  } else {
    if (dr.rows.length) throw new Error('an unpublished draft exists in site_v2_drafts — publish or discard it in the admin first; nothing written');
    await client.query('INSERT INTO site_v2_versions (user_email, action, detail, snapshot) VALUES ($1, $2, $3, $4)',
      ['pages-migrate', 'migrate', `نقل المحتوى الحالي للموقع إلى جداول لوحة التحكم (${want.sections.length} قسم) — المصدر الواحد للموقع والأدمن`, JSON.stringify(want)]);
    await client.query('INSERT INTO site_v2_settings (id, data, updated_at) VALUES (1, $1, now())', [JSON.stringify(want.settings)]);
    for (let i = 0; i < want.sections.length; i++) {
      const x = want.sections[i];
      await client.query('INSERT INTO site_v2_sections (id, page, type, position, hidden, data) VALUES ($1, $2, $3, $4, $5, $6)', [x.id, x.page, x.type, i, x.hidden, JSON.stringify(x.data)]);
    }
    const back = await client.query('SELECT id, page, type, hidden, data FROM site_v2_sections ORDER BY position');
    const backS = await client.query('SELECT data FROM site_v2_settings WHERE id = 1');
    const stored = { settings: backS.rows[0]?.data ?? {}, sections: back.rows };
    if (canon(stored) !== canon(want)) throw new Error('read-back differs from what was written — rolled back');
    if (pagesOf(stored) !== pagesOf(want)) throw new Error('the stored rows would render a different page — rolled back');
    await client.query('COMMIT');
    console.log(`applied: ${want.sections.length} sections + settings written to site_v2 (read back identical). The live pages pick it up on the next «نشر» or within an hour; content is the same either way.`);
  }
} catch (e) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('error:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
