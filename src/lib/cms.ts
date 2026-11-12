import { unstable_cache } from 'next/cache';
import { clientRecords, rawSections } from './clients';
import { asc } from 'drizzle-orm';
import { db, isDbConfigured, schema } from '@/db/client';
import type { ContentSnapshot } from '@/db/schema';
import { seedContent, snapshotToRaw, type Raw } from './view';
import { CASE_TYPE, fromLegacy, isMultiPage, PAGE_IDS } from './pages';

export * from './view';

/* The site's single data door.
   - With DATABASE_URL set: reads the settings + sections from Postgres, cached under the tag "content".
     Visitors never hit the database: pages are pre-rendered (ISR) and the admin's «حفظ ونشر» clears the
     tag (revalidateTag), so the edit is live in seconds.
   - Without it (or if the database is unreachable at build time): the bundled seed/content.json.
   Both have the same shape, so the site renders the same either way. */

export const CONTENT_TAG = 'content';
type Loaded = ContentSnapshot & { updatedAt?: string; settingsUpdated?: string; pageUpdated?: Record<string, string>; fromLegacy?: boolean };


/** Reads everything from the database (no cache). Used by the admin and by the cached reader below.
 *  The multi-page tables (site_v2_*) are the content; while they are still empty (nothing published from
 *  the new editor yet, and scripts/pages-migrate.mjs not run), the pages are built from the one-page site's
 *  tables — read only — so the site and the editor always open on the real content. */
export async function loadContentFromDb(): Promise<Loaded> {
  const d = db();
  const [settingsRows, rows] = await Promise.all([
    d.select().from(schema.siteSettings).limit(1),
    d.select().from(schema.sections).orderBy(asc(schema.sections.position)),
  ]);
  if (!settingsRows.length && !rows.length) return loadLegacy();
  const times = rows.map((r) => r.updatedAt.getTime());
  return {
    settings: (settingsRows[0]?.data ?? {}) as Raw,
    settingsUpdated: settingsRows[0]?.updatedAt.toISOString(),
    updatedAt: times.length ? new Date(Math.max(...times)).toISOString() : undefined,
    sections: rows.map((r) => ({ id: r.id, type: r.type, hidden: r.hidden, data: r.data as Raw, page: r.page })),
    pageUpdated: pageTimes(rows.map((r) => ({ page: r.page, type: r.type, slug: (r.data as Raw)?.slug, at: r.updatedAt.toISOString() }))),
  };
}

/** The one-page site's content, split into the pages (read only; nothing is written). */
export async function loadLegacy(): Promise<Loaded> {
  const d = db();
  const [settingsRows, rows] = await Promise.all([
    d.select().from(schema.legacySiteSettings).limit(1),
    d.select().from(schema.legacySections).orderBy(asc(schema.legacySections.position)),
  ]);
  const legacy = { settings: (settingsRows[0]?.data ?? {}) as Raw, sections: rows.map((r) => ({ id: r.id, type: r.type, hidden: r.hidden, data: r.data as Raw })) };
  const c = rows.length ? fromLegacy(legacy) : fromLegacy(seedContent);
  return { ...c, settingsUpdated: settingsRows[0]?.updatedAt.toISOString(), fromLegacy: true };
}

function pageTimes(rows: { page: string; type: string; slug?: unknown; at: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const k = r.type === CASE_TYPE ? `work/${String(r.slug ?? '')}` : r.page;
    if (!out[k] || out[k] < r.at) out[k] = r.at;
  }
  return out;
}

/* The data cache is shared by every deployment of the project in the same environment, so two previews on
   different databases would otherwise read (and overwrite) each other's content. The key carries a short
   fingerprint of the database host + name (never the password), so each database has its own entry. */
function dbScope(): string {
  try {
    const u = new URL(process.env.DATABASE_URL || '');
    const s = `${u.hostname.replace('-pooler', '')}${u.pathname}`;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return (h >>> 0).toString(36);
  } catch {
    return 'nodb';
  }
}
// Nov 9, 2026: the key also carries the deployment, so a new deploy always opens on the database as it is now
// (a fix written straight to the database, e.g. a text correction, is live with the next deploy instead of
// waiting up to an hour for the shared cache entry of the previous deploy to expire)
const cachedContent = unstable_cache(loadContentFromDb, ['clearup-content-v2-pages', dbScope(), process.env.VERCEL_DEPLOYMENT_ID || ''], { tags: [CONTENT_TAG], revalidate: 3600 });

export async function fetchContent(fresh = false): Promise<Loaded & { source: 'db' | 'fallback' }> {
  if (isDbConfigured()) {
    try {
      const c = process.env.STATIC_EXPORT === '1' || fresh ? await loadContentFromDb() : await cachedContent();
      if (c.sections.length || Object.keys(c.settings).length) return { ...(isMultiPage(c) ? c : { ...c, ...fromLegacy(c) }), source: 'db' };
    } catch (err) {
      console.warn('[cms] database read failed, using bundled content:', (err as Error).message);
    }
  }
  return { ...fromLegacy(seedContent), source: 'fallback' };
}

/** Settings + the page in the shape the components read (sections carry _type/_key/hidden). */
export async function fetchRaw(fresh = false): Promise<{ settings: Raw | null; page: Raw | null; source: 'db' | 'fallback' }> {
  const c = await fetchContent(fresh);
  return snapshotToRaw(c, c.source);
}

/** For sitemap.xml: every page and every published case study, with its last edit time. */
export async function fetchSitemapData(): Promise<{ settingsUpdated?: string; pages: { slug: string; updated?: string }[] }> {
  const c = await fetchContent();
  const t = c.pageUpdated ?? {};
  const pages = PAGE_IDS.filter((p) => p === 'home' || c.sections.some((s) => (s.page || 'home') === p && !s.hidden))
    .map((p) => ({ slug: p === 'home' ? 'home' : p, updated: t[p] ?? c.updatedAt }));
  const cases = caseSlugs(c).map((slug) => ({ slug: `work/${slug}`, updated: t[`work/${slug}`] ?? c.updatedAt }));
  return { settingsUpdated: c.settingsUpdated, pages: [...pages, ...cases] };
}

/** Slugs of the client pages visitors can open (a client with works, a testimonial or a project story,
 *  or a visible case study, with a real name) — the same records the pages build (lib/clients.ts). */
export function caseSlugs(c: ContentSnapshot): string[] {
  return clientRecords(rawSections(c.sections))
    .filter((r) => r.hasPage && !r.hidden && typeof r.client?.ar === 'string' && r.client.ar.trim() && !/\[[^\]]*\]/.test(r.client.ar))
    .map((r) => r.slug);
}
