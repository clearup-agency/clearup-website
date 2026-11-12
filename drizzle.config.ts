import { defineConfig } from 'drizzle-kit';

// `npm run db:generate` writes a new SQL migration into drizzle/ after a change to src/db/schema.ts.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
