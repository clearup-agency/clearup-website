import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';
import { after } from 'next/server';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { ContentSnapshot, SectionRow } from '@/db/schema';
import { CONTENT_TAG } from '@/lib/cms';
import { requireAdmin, type Admin } from './auth';
import { SECTION_TYPES, newKey } from './content';
import { cleanSection, cleanSettings } from './validate';
import { DEFAULT_CHATBOT } from '@/content/chatbot';
import { fillDefaults, SECTION_DEFAULTS, SETTINGS_DEFAULTS } from '@/content/defaults';
import { sourceRow } from './shared';
import { CASES, CASE_TYPE, isPageId, uniqueSlugs, validSlug } from '@/lib/pages';
import { loadLegacy } from '@/lib/cms';

export type Result = { ok: boolean; error?: string; id?: string };
export type Tx = Parameters<Parameters<ReturnType<typeof db>['transaction']>[0]>[0];

export async function snapshot(tx: Tx | ReturnType<typeof db> = db()): Promise<ContentSnapshot> {
  const [s] = await tx.select().from(schema.siteSettings).limit(1);
  const rows = await tx.select().from(schema.sections).orderBy(asc(schema.sections.position));
  return { settings: (s?.data ?? {}) as Record<string, unknown>, sections: rows.map((r) => ({ id: r.id, type: r.type, hidden: r.hidden, data: r.data, page: r.page })) };
}

/** Clears the cached pages so the change is on the live site within seconds. */
function publish() {
  revalidateTag(CONTENT_TAG, { expire: 0 });
  revalidatePath('/', 'layout');
}
/** Publishes now, and once more 2 s later: a page a visitor happened to be regenerating during the save
 *  (it read the old content) is thrown away too, so a quick series of edits always ends up live. */
function publishTwice() {
  publish();
  after(async () => {
    await new Promise((r) => setTimeout(r, 2000));
    publish();
  });
}

/** Runs a change in one transaction, keeps the content as it was before (undo + audit), then publishes. */
export async function mutate(action: string, detail: string, fn: (tx: Tx, admin: Admin) => Promise<void | string>): Promise<Result> {
  const admin = await requireAdmin();
  try {
    let id: string | undefined;
    await db().transaction(async (tx) => {
      const before = await snapshot(tx);
      const r = await fn(tx, admin);
      if (typeof r === 'string') id = r;
      await tx.insert(schema.versions).values({ userEmail: admin.email, action, detail, snapshot: before });
      // keep the last 200 versions
      await tx.execute(sql`DELETE FROM site_v2_versions WHERE id IN (SELECT id FROM site_v2_versions ORDER BY id DESC OFFSET 200)`);
    });
    publishTwice();
    return { ok: true, id };
  } catch (e) {
    console.error('[admin]', action, e);
    return { ok: false, error: (e as Error).message || 'حدث خطأ' };
  }
}

export async function writeAll(tx: Tx, c: ContentSnapshot) {
  await tx.delete(schema.sections);
  await tx.insert(schema.siteSettings).values({ id: 1, data: c.settings, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.siteSettings.id, set: { data: c.settings, updatedAt: new Date() } });
  if (c.sections.length) {
    await tx.insert(schema.sections).values(c.sections.map((s, i) => ({ id: s.id, type: s.type, hidden: !!s.hidden, data: s.data, position: i, page: s.page || 'home' })));
  }
}

export async function renumber(tx: Tx, ids: string[]) {
  for (let i = 0; i < ids.length; i++) await tx.update(schema.sections).set({ position: i }).where(eq(schema.sections.id, ids[i]));
}
export async function orderedIds(tx: Tx) {
  return (await tx.select({ id: schema.sections.id }).from(schema.sections).orderBy(asc(schema.sections.position))).map((r) => r.id);
}

export function validateBackup(x: any): ContentSnapshot {
  if (!x || typeof x !== 'object' || x.format !== 'clearup-content') throw new Error('هذا ليس ملف نسخة احتياطية من لوحة ClearUp');
  if (!x.settings || typeof x.settings !== 'object' || !Array.isArray(x.sections)) throw new Error('الملف ناقص (الإعدادات أو الأقسام)');
  const ids = new Set<string>();
  const sections: SectionRow[] = x.sections.map((s: any, i: number) => {
    if (!s || typeof s.type !== 'string' || !SECTION_TYPES[s.type]) throw new Error(`القسم رقم ${i + 1} من نوع غير معروف`);
    let id = typeof s.id === 'string' && s.id ? s.id : newKey();
    if (ids.has(id)) id = newKey();
    ids.add(id);
    // which page it is on: one of the five, or "cases" for a case study (an old one-page backup → home)
    const page = s.type === CASE_TYPE ? CASES : isPageId(s.page) ? s.page : 'home';
    const data = cleanSection(s.type, s.data);
    if (s.type === CASE_TYPE && data.slug !== undefined && data.slug !== '' && !validSlug(data.slug)) {
      throw new Error(`رابط صفحة القصة «${String(data.slug)}» غير صالح — أحرف إنجليزية صغيرة وأرقام و - فقط`);
    }
    return { id, type: s.type, hidden: !!s.hidden, data, page };
  });
  return { settings: cleanSettings(x.settings), sections: uniqueSlugs(sections) };
}


/** What the live editor opens on: the live content, plus the unpublished draft if there is one. */
export async function editorState(): Promise<{ published: ContentSnapshot; draft: ContentSnapshot | null; draftAt: string | null; version: number | null }> {
  await requireAdmin();
  const d = db();
  const [stored, rows, ver] = await Promise.all([snapshot(d), d.select().from(schema.drafts).limit(1), d.select({ id: schema.versions.id }).from(schema.versions).orderBy(desc(schema.versions.id)).limit(1)]);
  // nothing published from this editor yet: open on the one-page site's content, split into the pages
  const published = stored.sections.length || Object.keys(stored.settings).length ? stored : await legacyAsPages();
  const draft = rows[0]?.data ?? null;
  return { published: withDefaults(published), draft: draft && withDefaults(draft), draftAt: rows[0]?.updatedAt.toISOString() ?? null, version: ver[0]?.id ?? null };
}

async function legacyAsPages(): Promise<ContentSnapshot> {
  const c = await loadLegacy();
  return { settings: c.settings, sections: c.sections };
}

/** Words the site falls back to when they were never saved (the chatbot's starting questions, the footer's
 *  buttons, a section's labels — src/content/defaults.ts) are shown in the editor as they appear on the site, so
 *  they can be found and edited; they reach the database on the next نشر. */
export function withDefaults(c: ContentSnapshot): ContentSnapshot {
  const settings = fillDefaults({ ...(c.settings ?? {}), ...(c.settings?.chatbot ? {} : { chatbot: structuredClone(DEFAULT_CHATBOT) }) }, SETTINGS_DEFAULTS);
  // a section that only shows another section's text (Home's services cards…) gets no copies of the words
  const sections = c.sections.map((s) => (SECTION_DEFAULTS[s.type] && !sourceRow(s, c.sections) ? { ...s, data: fillDefaults((s.data ?? {}) as Record<string, unknown>, SECTION_DEFAULTS[s.type]) } : s));
  return { ...c, settings, sections };
}
