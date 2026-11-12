// Fills an EMPTY database with the site's content (seed/content.json — everything migrated from Sanity)
// and creates/updates the admin login from ADMIN_EMAIL + ADMIN_PASSWORD. The password is never stored in the repo.
//
//   DATABASE_URL=… ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/db-seed.mjs
//   --force-content   replace the content even if the database already has some (keeps a version for undo)
import fs from 'node:fs';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { pgSsl } from './db-ssl.mjs';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set'); process.exit(1); }
const force = process.argv.includes('--force-content');
const seed = JSON.parse(fs.readFileSync(new URL('../seed/content.json', import.meta.url), 'utf8'));
const client = new pg.Client({ connectionString: url, ssl: pgSsl(url) });
await client.connect();
try {
  await client.query('BEGIN');
  const { rows } = await client.query('SELECT count(*)::int AS n FROM sections');
  const hasContent = rows[0].n > 0;
  if (!hasContent || force) {
    if (hasContent) {
      const s = await client.query('SELECT data FROM site_settings WHERE id = 1');
      const secs = await client.query('SELECT id, type, hidden, data FROM sections ORDER BY position');
      await client.query('INSERT INTO versions (user_email, action, detail, snapshot) VALUES ($1, $2, $3, $4)', [
        'seed-script', 'seed', 'replaced by seed/content.json', JSON.stringify({ settings: s.rows[0]?.data ?? {}, sections: secs.rows }),
      ]);
    }
    await client.query('DELETE FROM sections');
    await client.query(
      `INSERT INTO site_settings (id, data, updated_at) VALUES (1, $1, now())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`, [JSON.stringify(seed.settings)]);
    let i = 0;
    for (const s of seed.sections) {
      await client.query('INSERT INTO sections (id, page, type, position, hidden, data) VALUES ($1, $2, $3, $4, $5, $6)',
        [s.id, 'home', s.type, i++, !!s.hidden, JSON.stringify(s.data)]);
    }
    console.log(`content: settings + ${seed.sections.length} sections loaded`);
  } else {
    console.log('content: database already has content — left as is (use --force-content to replace)');
  }

  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (email && password) {
    if (password.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters');
    const hash = await bcrypt.hash(password, 12);
    await client.query(
      `INSERT INTO admin_user (email, password_hash, name) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, session_version = admin_user.session_version + 1`,
      [email, hash, process.env.ADMIN_NAME || null]);
    await client.query('DELETE FROM login_attempts WHERE key = $1', ['email:' + email]);
    console.log(`admin: ${email} is ready (password set from ADMIN_PASSWORD)`);
  } else {
    console.log('admin: ADMIN_EMAIL / ADMIN_PASSWORD not set — no login created');
  }
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
