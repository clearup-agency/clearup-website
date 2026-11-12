// Creates/updates the database tables (SQL files in drizzle/). Safe to run again; already-applied steps are skipped.
//   DATABASE_URL=postgres://… node scripts/db-migrate.mjs
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { pgSsl } from './db-ssl.mjs';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set'); process.exit(1); }
const pool = new pg.Pool({ connectionString: url, ssl: pgSsl(url) });
await migrate(drizzle(pool), { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
await pool.end();
console.log('database tables are up to date');
