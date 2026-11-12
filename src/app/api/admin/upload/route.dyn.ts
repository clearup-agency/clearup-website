import { NextResponse } from 'next/server';
import { db, schema } from '@/db/client';
import { currentAdmin } from '@/admin/auth';
import { ALLOWED, DB_MAX_BYTES, FONT_EXT, asPreset, cloudinary, cloudinarySignature, fontMime, safeName, sameOrigin } from '@/admin/media';
import { newKey } from '@/admin/content';

export const dynamic = 'force-dynamic';

/** GET → how to upload: straight to Cloudinary (signed) or to this endpoint (database storage). */
export async function GET(req: Request) {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'سجّل الدخول أولاً' }, { status: 401 });
  // ?preset=story-image|story-video|logo → Cloudinary compresses the file before storing it (src/admin/media.ts)
  const sig = cloudinarySignature('clearup', asPreset(new URL(req.url).searchParams.get('preset')));
  return NextResponse.json(sig ? { mode: 'cloudinary', ...sig } : { mode: 'db', maxBytes: DB_MAX_BYTES });
}

/** POST multipart (file) → stored in the database; POST JSON → registers a file the browser put on Cloudinary. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!(await currentAdmin())) return NextResponse.json({ error: 'سجّل الدخول أولاً' }, { status: 401 });
  const id = newKey();
  if ((req.headers.get('content-type') || '').includes('application/json')) {
    const c = cloudinary();
    const b = await req.json().catch(() => null);
    if (!c || !b?.url || !String(b.url).startsWith(`https://res.cloudinary.com/${c.cloud}/`)) return NextResponse.json({ error: 'رابط غير صالح' }, { status: 400 });
    await db().insert(schema.media).values({
      id, provider: 'cloudinary', url: b.url, filename: safeName(b.filename), mime: String(b.mime || ''), size: Number(b.size) || 0,
      width: Number(b.width) || null, height: Number(b.height) || null,
    });
    return NextResponse.json({ id, url: b.url, width: Number(b.width) || undefined, height: Number(b.height) || undefined });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'لم يصل أي ملف' }, { status: 400 });
  const type = FONT_EXT.test(file.name) ? fontMime(file.name) : file.type;
  if (!ALLOWED.test(type)) return NextResponse.json({ error: 'نوع الملف غير مدعوم (صور PNG/JPG/WebP/SVG، فيديو MP4، أو خط woff2/woff/ttf/otf)' }, { status: 400 });
  if (file.size > DB_MAX_BYTES) return NextResponse.json({ error: 'الملف أكبر من 4 ميغابايت. صغّره أو فعّل Cloudinary.' }, { status: 413 });
  const name = safeName(file.name);
  const url = `/media-db/${id}/${name}`;
  const width = Number(form!.get('width')) || null;
  const height = Number(form!.get('height')) || null;
  await db().insert(schema.media).values({ id, provider: 'db', url, filename: name, mime: type, size: file.size, width, height, bytes: Buffer.from(await file.arrayBuffer()) });
  return NextResponse.json({ id, url, width: width ?? undefined, height: height ?? undefined });
}
