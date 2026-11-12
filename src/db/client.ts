import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// DATABASE_URL is the only switch: local Postgres in dev, Neon (pooled connection string) in production.
export const isDbConfigured = () => Boolean(process.env.DATABASE_URL);

const g = globalThis as unknown as { __clearupDb?: NodePgDatabase<typeof schema>; __clearupPool?: Pool };

export function db(): NodePgDatabase<typeof schema> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  if (!g.__clearupDb) {
    const url = process.env.DATABASE_URL;
    const local = /@(localhost|127\.0\.0\.1)|host=\/|\?host=/.test(url);
    g.__clearupPool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000, // Neon free tier wakes from sleep in ~1 s
      ssl: local || /sslmode=disable/.test(url) ? undefined : { rejectUnauthorized: true },
    });
    g.__clearupDb = drizzle(g.__clearupPool, { schema });
  }
  return g.__clearupDb;
}
export { schema };
