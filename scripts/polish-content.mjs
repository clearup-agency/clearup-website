// The Nov 2026 site-polish copy pass for a database that already has content (src/lib/polish.ts).
// It only replaces texts that still hold the OLD wording, so the admin's own edits are never touched, and a
// second run changes nothing. Read-only unless --apply.
//
//   DATABASE_URL=… node scripts/polish-content.mjs            → prints what would change (writes nothing)
//   DATABASE_URL=… node scripts/polish-content.mjs --apply    → applies it in one transaction, keeps the
//        content as it was before in «السجل» (site_v2_versions, undo from the admin), and updates the
//        unpublished draft the same way if there is one.
// After --apply the live pages pick it up on the next «حفظ ونشر» in the admin, or within an hour by themselves.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSync } from 'esbuild';
import pg from 'pg';
import { pgSsl } from './db-ssl.mjs';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set'); process.exit(1); }
const apply = process.argv.includes('--apply');

const root = fileURLToPath(new URL('..', import.meta.url));
const out = path.join(mkdtempSync(path.join(tmpdir(), 'cu-polish-')), 'polish.mjs');
buildSync({ entryPoints: [path.join(root, 'src/lib/polish.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': path.join(root, 'src') }, logLevel: 'silent' });
const { polishContent } = await import(pathToFileURL(out).href);

const client = new pg.Client({ connectionString: url, ssl: pgSsl(url) });
await client.connect();
const host = new URL(url).hostname;
try {
  await client.query('BEGIN');
  const s = await client.query('SELECT data FROM site_v2_settings WHERE id = 1');
  const rows = await client.query('SELECT id, page, type, hidden, data FROM site_v2_sections ORDER BY position');
  const before = { settings: s.rows[0]?.data ?? {}, sections: rows.rows.map((r) => ({ id: r.id, type: r.type, hidden: r.hidden, data: r.data, page: r.page })) };
  if (!before.sections.length) throw new Error('no content in site_v2_sections — nothing to polish');
  const { content, changes } = polishContent(before);
  const draft = await client.query('SELECT data FROM site_v2_drafts WHERE id = 1');
  const d = draft.rows[0] ? polishContent(draft.rows[0].data) : null;

  console.log(`database ${host}: ${changes.length} change(s) to the published content` + (d ? `, ${d.changes.length} to the unpublished draft` : ', no unpublished draft'));
  for (const c of changes) console.log(`- ${c.where} · ${c.field}\n    was: ${JSON.stringify(c.from)}\n    now: ${JSON.stringify(c.to)}`);
  if (!apply || (!changes.length && !(d && d.changes.length))) {
    await client.query('ROLLBACK');
    console.log(apply ? 'nothing to apply (already polished)' : 'dry run — nothing written (add --apply to write)');
  } else {
    if (changes.length) {
      await client.query('INSERT INTO site_v2_versions (user_email, action, detail, snapshot) VALUES ($1, $2, $3, $4)',
        ['polish-script', 'polish', `site polish copy pass: ${changes.length} change(s)`, JSON.stringify(before)]);
      await client.query(`INSERT INTO site_v2_settings (id, data, updated_at) VALUES (1, $1, now())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`, [JSON.stringify(content.settings)]);
      const old = new Map(before.sections.map((x) => [x.id, x]));
      const ids = content.sections.map((x) => x.id);
      for (let i = 0; i < content.sections.length; i++) {
        const x = content.sections[i];
        const o = old.get(x.id);
        if (!o) {
          await client.query('INSERT INTO site_v2_sections (id, page, type, position, hidden, data) VALUES ($1, $2, $3, $4, $5, $6)', [x.id, x.page || 'home', x.type, i, !!x.hidden, JSON.stringify(x.data)]);
        } else {
          const same = JSON.stringify(o.data) === JSON.stringify(x.data) && !!o.hidden === !!x.hidden;
          await client.query(same ? 'UPDATE site_v2_sections SET position = $2 WHERE id = $1'
            : 'UPDATE site_v2_sections SET position = $2, hidden = $3, data = $4, updated_at = now() WHERE id = $1',
          same ? [x.id, i] : [x.id, i, !!x.hidden, JSON.stringify(x.data)]);
        }
      }
      if (ids.length !== new Set(ids).size) throw new Error('duplicate section ids — aborted');
    }
    if (d && d.changes.length) await client.query('UPDATE site_v2_drafts SET data = $1 WHERE id = 1', [JSON.stringify(d.content)]);
    await client.query('COMMIT');
    console.log('applied. The previous content is kept in «السجل» (undo).');
  }
} catch (e) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('NOT APPLIED:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
