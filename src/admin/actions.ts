'use server';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { ContentSnapshot } from '@/db/schema';
import { seedContent } from '@/lib/cms';
import { changePassword as doChangePassword, login as doLogin, logout as doLogout, requireAdmin } from './auth';
import { SECTION_TYPES, emptyValue, newKey, rekey, typeTitle } from './content';
import { editorState, mutate, orderedIds, renumber, validateBackup, withDefaults, writeAll, type Result } from './store';
import crypto from 'node:crypto';
import { cleanSection, cleanSettings, isId } from './validate';
import { checkGoogleFont, type FontCheck } from '@/lib/fonts-server';
import { unclaimedCases } from '@/lib/clients';

const bad = (error: string): Result => ({ ok: false, error });

// ——— sign in / out ———
export async function loginAction(_prev: unknown, form: FormData): Promise<{ error?: string }> {
  const r = await doLogin(String(form.get('email') ?? ''), String(form.get('password') ?? ''));
  if (!r.ok) return { error: r.error };
  redirect('/admin/');
}
export async function logoutAction() {
  await doLogout();
  redirect('/admin/login/');
}

export async function changePasswordAction(_prev: unknown, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const current = String(form.get('current') ?? '');
  const next = String(form.get('next') ?? '');
  const again = String(form.get('again') ?? '');
  if (next !== again) return { error: 'كلمتا المرور الجديدتان غير متطابقتين.' };
  return doChangePassword(current, next);
}

// ——— sections ———
export async function setHidden(id: string, hidden: boolean) {
  if (!isId(id) || typeof hidden !== 'boolean') return bad('طلب غير صالح');
  return mutate(hidden ? 'hide' : 'show', id, async (tx) => {
    await tx.update(schema.sections).set({ hidden, updatedAt: new Date() }).where(eq(schema.sections.id, id));
  });
}

export async function reorder(ids: string[]) {
  if (!Array.isArray(ids) || !ids.every(isId)) return bad('طلب غير صالح');
  return mutate('reorder', ids.join(','), async (tx) => {
    const current = await orderedIds(tx);
    if (current.length !== ids.length || !current.every((x) => ids.includes(x))) throw new Error('تغيّرت القائمة، حدّث الصفحة وحاول مرة أخرى');
    await renumber(tx, ids);
  });
}

export async function duplicateSection(id: string) {
  if (!isId(id)) return bad('طلب غير صالح');
  return mutate('duplicate', id, async (tx) => {
    const [s] = await tx.select().from(schema.sections).where(eq(schema.sections.id, id));
    if (!s) throw new Error('القسم غير موجود');
    const nid = newKey();
    const data = rekey(s.data) as Record<string, unknown>;
    delete data.anchor; // two sections can't share one menu link
    await tx.insert(schema.sections).values({ id: nid, type: s.type, hidden: true, data, position: 9999, page: s.page });
    const ids = (await orderedIds(tx)).filter((x) => x !== nid);
    ids.splice(ids.indexOf(id) + 1, 0, nid);
    await renumber(tx, ids);
    return nid;
  });
}

export async function deleteSection(id: string) {
  if (!isId(id)) return bad('طلب غير صالح');
  return mutate('delete', id, async (tx) => {
    await tx.delete(schema.sections).where(eq(schema.sections.id, id));
    await renumber(tx, await orderedIds(tx));
  });
}

export async function addSection(type: string, afterId?: string) {
  const t = typeof type === 'string' ? SECTION_TYPES[type] : undefined;
  if (afterId !== undefined && !isId(afterId)) return bad('طلب غير صالح');
  if (!t) return { ok: false, error: 'نوع غير معروف' } as Result;
  return mutate('add', typeTitle(type), async (tx) => {
    const template = seedContent.sections.find((s) => s.type === type);
    let data: Record<string, unknown>;
    if (template) {
      data = rekey(template.data) as Record<string, unknown>;
      delete data.anchor;
    } else {
      data = Object.fromEntries((t.fields ?? []).filter((f) => f.name !== 'hidden').map((f) => [f.name, emptyValue(f)]).filter(([, v]) => v !== undefined));
    }
    const nid = newKey();
    // new sections start hidden, so nothing half-written shows on the site
    await tx.insert(schema.sections).values({ id: nid, type, hidden: true, data, position: 9999, page: 'home' });
    const ids = (await orderedIds(tx)).filter((x) => x !== nid);
    const at = afterId ? ids.indexOf(afterId) + 1 : ids.length;
    ids.splice(at <= 0 ? ids.length : at, 0, nid);
    await renumber(tx, ids);
    return nid;
  });
}

export async function saveSection(id: string, data: Record<string, unknown>) {
  if (!isId(id)) return bad('طلب غير صالح');
  await requireAdmin();
  const [row] = await db().select({ type: schema.sections.type }).from(schema.sections).where(eq(schema.sections.id, id));
  if (!row) return bad('القسم غير موجود (ربما حُذف)');
  let clean: Record<string, unknown>;
  try { clean = cleanSection(row.type, data); } catch (e) { return bad((e as Error).message); }
  return mutate('edit', id, async (tx) => {
    const r = await tx.update(schema.sections).set({ data: clean, updatedAt: new Date() }).where(eq(schema.sections.id, id)).returning({ id: schema.sections.id });
    if (!r.length) throw new Error('القسم غير موجود (ربما حُذف)');
  });
}

export async function saveSettings(data: Record<string, unknown>) {
  await requireAdmin();
  let clean: Record<string, unknown>;
  try { clean = cleanSettings(data); } catch (e) { return bad((e as Error).message); }
  return mutate('settings', 'site settings', async (tx) => {
    await tx.insert(schema.siteSettings).values({ id: 1, data: clean, updatedAt: new Date() })
      .onConflictDoUpdate({ target: schema.siteSettings.id, set: { data: clean, updatedAt: new Date() } });
  });
}

// ——— backups / versions ———
export async function importContent(json: unknown) {
  let c: ContentSnapshot;
  try { c = validateBackup(json); } catch (e) { return { ok: false, error: (e as Error).message } as Result; }
  return mutate('import', `${c.sections.length} sections`, async (tx) => {
    await writeAll(tx, c);
    await tx.delete(schema.drafts); // the editor opens on what is now live
  });
}

export async function restoreVersion(versionId: number) {
  if (!Number.isInteger(versionId)) return bad('طلب غير صالح');
  return mutate('restore', String(versionId), async (tx) => {
    const [v] = await tx.select().from(schema.versions).where(eq(schema.versions.id, versionId));
    if (!v) throw new Error('النسخة غير موجودة');
    await writeAll(tx, v.snapshot);
    await tx.delete(schema.drafts);
  });
}

export async function listVersions(limit = 30) {
  await requireAdmin();
  return db().select({ id: schema.versions.id, at: schema.versions.at, userEmail: schema.versions.userEmail, action: schema.versions.action, detail: schema.versions.detail })
    .from(schema.versions).orderBy(desc(schema.versions.id)).limit(limit);
}


// ——— live editor: the draft (autosaved while editing) and «نشر» ———
const MAX_DRAFT_BYTES = 3_000_000;

/** Shape check only (the draft is shown to the admin alone, in the preview, where links don't navigate).
 *  The full field-by-field cleaning runs on «نشر». */
function draftShape(x: unknown): ContentSnapshot {
  const c = x as ContentSnapshot;
  if (!c || typeof c !== 'object' || !c.settings || typeof c.settings !== 'object' || Array.isArray(c.settings) || !Array.isArray(c.sections)) throw new Error('مسودة غير صالحة');
  if (c.sections.length > 400) throw new Error('عدد الأقسام كبير جداً');
  for (const s of c.sections) {
    if (!s || !isId(s.id) || typeof s.type !== 'string' || !SECTION_TYPES[s.type] || typeof s.hidden !== 'boolean' || !s.data || typeof s.data !== 'object') throw new Error('مسودة غير صالحة');
  }
  if (JSON.stringify(c).length > MAX_DRAFT_BYTES) throw new Error('المحتوى كبير جداً');
  return { settings: c.settings, sections: c.sections.map((s) => ({ id: s.id, type: s.type, hidden: s.hidden, data: s.data, ...(typeof s.page === 'string' && s.page.length < 20 ? { page: s.page } : {}) })) };
}

/** Keeps the editor's work in the database so a refresh or another device continues where it stopped. Not public. */
export async function saveDraft(content: unknown): Promise<Result> {
  const admin = await requireAdmin();
  let c: ContentSnapshot;
  try { c = draftShape(content); } catch (e) { return bad((e as Error).message); }
  await db().insert(schema.drafts).values({ id: 1, data: c, userEmail: admin.email, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.drafts.id, set: { data: c, userEmail: admin.email, updatedAt: new Date() } });
  return { ok: true };
}

export async function discardDraft(): Promise<Result> {
  await requireAdmin();
  await db().delete(schema.drafts);
  return { ok: true };
}

/** «نشر»: cleans every field, replaces the live content in one transaction (the old content goes to the history
 *  first, so it can be undone), deletes the draft and refreshes the public pages within seconds. */
export async function publishDraft(content: unknown, base?: number | null, force = false): Promise<Result & { content?: ContentSnapshot; conflict?: boolean; version?: number | null }> {
  await requireAdmin();
  // something was published elsewhere (another device, or the «أعمال العملاء» page) after this editor opened:
  // say so instead of silently putting the older content back
  if (!force && base !== undefined) {
    const [v] = await db().select({ id: schema.versions.id }).from(schema.versions).orderBy(desc(schema.versions.id)).limit(1);
    if ((v?.id ?? null) !== base) return { ok: false, conflict: true, error: 'CONFLICT' };
  }
  let c: ContentSnapshot;
  try {
    c = validateBackup({ format: 'clearup-content', ...draftShape(content) });
  } catch (e) { return bad((e as Error).message); }
  const fontErr = await verifyFonts(c.settings);
  if (fontErr) return bad(fontErr);
  const r = await mutate('publish', `${c.sections.length} sections`, async (tx) => {
    await writeAll(tx, c);
    await tx.delete(schema.drafts);
  });
  if (!r.ok) return r;
  const [v] = await db().select({ id: schema.versions.id }).from(schema.versions).orderBy(desc(schema.versions.id)).limit(1);
  return { ...r, content: c, version: v?.id ?? null };
}

/** One entry of the history, to open in the editor (it goes live only when «نشر» is pressed). */
export async function loadVersion(versionId: number): Promise<Result & { content?: ContentSnapshot }> {
  await requireAdmin();
  if (!Number.isInteger(versionId)) return bad('طلب غير صالح');
  const [v] = await db().select().from(schema.versions).where(eq(schema.versions.id, versionId));
  if (!v) return bad('النسخة غير موجودة');
  return { ok: true, content: withDefaults(v.snapshot) };
}

// ——— fonts: «الصق رابط Google Fonts» ———
/** Reads a pasted Google Fonts link (or family name) and checks it at Google: the family exists, which weights it has. */
export async function checkFontAction(input: string): Promise<FontCheck> {
  await requireAdmin();
  return checkGoogleFont(String(input ?? '').slice(0, 500));
}

/** Before publishing: every Google font chosen in the settings must really exist (checked on the server). */
async function verifyFonts(settings: Record<string, unknown>): Promise<string | null> {
  for (const k of ['fontAr', 'fontEn']) {
    const f = settings[k] as { kind?: string; family?: string } | undefined;
    if (f?.kind !== 'google' || !f.family) continue;
    const r = await checkGoogleFont(f.family);
    if (!r.ok) return r.error;
  }
  return null;
}


// ——— «أعمال العملاء (ستوري)» page: saves ONE stories section and publishes it right away ———
/** The stories sections as the admin should see them now (the unpublished draft's copy when there is one),
 *  plus a fingerprint of what is live, so a save made from a stale screen is caught instead of overwriting. */
export async function storiesState() {
  const st = await editorState();
  const src = st.draft ?? st.published;
  const sections = src.sections.filter((s) => s.type === 'clientStoriesSection').map((s, i) => ({ id: s.id, page: s.page || 'home', idx: i, data: s.data as Record<string, unknown>, hidden: s.hidden }));
  const live = Object.fromEntries(st.published.sections.filter((s) => s.type === 'clientStoriesSection').map((s) => [s.id, fingerprint((s.data as any)?.clients)]));
  // the older case studies («قصص العملاء») no client claims yet: shown as clients on the same screen
  const own = sections.filter((s) => !s.data.mirror);
  const primary = (own.find((s) => !s.hidden) ?? own[0])?.id ?? null;
  return { sections, live, primary, cases: primary ? unclaimedCases(src.sections) : [] };
}
function fingerprint(v: unknown): string {
  return crypto.createHash('sha1').update(JSON.stringify(v ?? [])).digest('hex').slice(0, 16);
}

/** «حفظ ونشر» on the stories page: replaces that section's clients (and the mirror switch) on the live site and in
 *  the editor's draft, as one publish in the history. `live` = the fingerprint the page was opened with. */
export async function saveStories(id: string, page: string, idx: number, clients: unknown, mirror: unknown, live: string, force = false, removedCases?: unknown): Promise<Result & { live?: string; conflict?: boolean }> {
  if (!isId(id) || !Array.isArray(clients)) return bad('طلب غير صالح');
  const removed = Array.isArray(removedCases) ? removedCases.filter(isId).slice(0, 200) : null;
  await requireAdmin();
  let clean: Record<string, unknown>;
  try { clean = cleanSection('clientStoriesSection', { clients, mirror: !!mirror }); } catch (e) { return bad((e as Error).message); }
  let conflict = false;
  const r = await mutate('stories', 'أعمال العملاء (ستوري)', async (tx) => {
    let rows = await tx.select().from(schema.sections);
    if (!rows.length) {
      // nothing published from the admin yet (the site shows its built-in content): publish that first, as is
      const st = await editorState();
      await writeAll(tx, st.published);
      rows = await tx.select().from(schema.sections);
    }
    let row = rows.find((x) => x.id === id && x.type === 'clientStoriesSection');
    if (!row) row = rows.filter((x) => x.type === 'clientStoriesSection')[idx];
    if (!row || (row.page || 'home') !== (page || 'home')) throw new Error('قسم الستوري غير موجود. حدّث الصفحة.');
    const cur = fingerprint((row.data as any)?.clients);
    if (!force && live && cur !== live) { conflict = true; throw new Error('CONFLICT'); }
    const data: Record<string, unknown> = { ...(row.data as Record<string, unknown>), clients: clean.clients ?? [], mirror: !!clean.mirror };
    // older case studies deleted from «العملاء» (their rows stay in the history; the site stops showing them)
    if (removed) data.removedCases = removed;
    await tx.update(schema.sections).set({ data, updatedAt: new Date() }).where(eq(schema.sections.id, row.id));
    // the editor's unpublished draft keeps the same clients, so a later «نشر» there doesn't bring back the old ones
    const [d] = await tx.select().from(schema.drafts).limit(1);
    if (d?.data && Array.isArray((d.data as ContentSnapshot).sections)) {
      const dd = d.data as ContentSnapshot;
      const sections = dd.sections.map((s) => (s.id === row!.id ? { ...s, data: { ...(s.data as Record<string, unknown>), clients: data.clients, mirror: data.mirror, ...(removed ? { removedCases: removed } : {}) } } : s));
      await tx.update(schema.drafts).set({ data: { ...dd, sections }, updatedAt: new Date() }).where(eq(schema.drafts.id, d.id));
    }
  });
  if (conflict) return { ok: false, conflict: true, error: 'تغيّرت أعمال العملاء من جهاز أو نافذة ثانية بعد ما فتحت هذه الصفحة.' };
  return r.ok ? { ...r, live: fingerprint(clean.clients ?? []) } : r;
}

/** The newest entry of the history (the editor publishes only on top of what it opened, unless told to). */
export async function latestVersionId(): Promise<number | null> {
  await requireAdmin();
  const [v] = await db().select({ id: schema.versions.id }).from(schema.versions).orderBy(desc(schema.versions.id)).limit(1);
  return v?.id ?? null;
}
