import { NextResponse } from 'next/server';
import { db, schema } from '@/db/client';
import { currentAdmin } from '@/admin/auth';
import { sameOrigin } from '@/admin/media';
import { snapshot } from '@/admin/store';
import { importContent } from '@/admin/actions';

export const dynamic = 'force-dynamic';

/** GET → the whole site as one JSON file (settings, sections, and images stored in the database). */
export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: 'سجّل الدخول أولاً' }, { status: 401 });
  const c = await snapshot();
  const media = (await db().select().from(schema.media)).map((m) => ({ ...m, bytes: m.bytes ? m.bytes.toString('base64') : null }));
  const body = JSON.stringify({ format: 'clearup-content', version: 1, exportedAt: new Date().toISOString(), exportedBy: admin.email, ...c, media }, null, 1);
  const day = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="clearup-backup-${day}.json"`, 'Cache-Control': 'no-store' },
  });
}

/** POST (the JSON file) → replaces the content with the backup. The current content is kept as a version first. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!(await currentAdmin())) return NextResponse.json({ error: 'سجّل الدخول أولاً' }, { status: 401 });
  const json = await req.json().catch(() => null);
  if (!json) return NextResponse.json({ ok: false, error: 'الملف ليس JSON صالحاً' }, { status: 400 });
  // images that lived in the database come back too (existing ones are left as they are)
  for (const m of Array.isArray(json.media) ? json.media : []) {
    if (!m?.id || !m.url || !m.provider) continue;
    await db().insert(schema.media).values({
      id: String(m.id), provider: String(m.provider), url: String(m.url), filename: String(m.filename || 'file'), mime: String(m.mime || ''),
      size: Number(m.size) || 0, width: m.width ?? null, height: m.height ?? null, bytes: m.bytes ? Buffer.from(m.bytes, 'base64') : null,
    }).onConflictDoNothing();
  }
  const r = await importContent(json);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
