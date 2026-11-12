import { NextResponse } from 'next/server';
import { db, schema } from '@/db/client';
import { currentAdmin } from '@/admin/auth';
import { cloudinary, cloudinaryFromUrl, cloudinaryResource, driveDownloadUrl, driveFolder, driveProbe, safeName, sameOrigin, type Preset } from '@/admin/media';
import { newKey } from '@/admin/content';
import { driveLink, instagramPost, instagramUrl, linkSource, normalizeLink, youtubeId, youtubeIsShort } from '@/lib/links';
import { instagramMedia, remoteSize } from '@/admin/instagram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Cloudinary's free plan refuses bigger files. Bigger ones are not refused: the admin compresses them in the
// browser first (the answer says { kind: "big" } and the browser fetches the file through /api/admin/drive).
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 95 * 1024 * 1024;

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** POST { url, use: "story" | "logo" } — one pasted link for «أعمال العملاء (ستوري)» (any common form, see src/lib/links.ts):
 *   • Google Drive file → imported ONCE into Cloudinary, compressed on the way in → { url, kind, source: "drive", before, after }
 *     (a video over 95 MB / image over 10 MB → { kind: "big", id, size, mime, name }: the browser compresses it, then uploads)
 *   • public Drive folder → { folder: [{ url, name, kind }] } (the editor imports them one by one)
 *   • Instagram reel/post (public) → its video/image copied ONCE into Cloudinary, so it plays full-screen like any story
 *     → { url, kind, link, source: "instagram" } (a carousel → { items }); if Instagram won't hand it over → { link, kind: "embed" }
 *   • YouTube (watch, youtu.be, shorts, m.) → checked at YouTube, kept as a link and played from there
 *     (YouTube refuses downloads from servers) → { link, kind: "embed", source: "youtube", thumb, title }
 *   • a direct https image/video file → copied into Cloudinary like a Drive file
 *  GET ?check=<cloudinary url> → { ready, bytes } (a long video is compressed in the background). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail('forbidden', 403);
  if (!(await currentAdmin())) return fail('سجّل الدخول أولاً', 401);
  const b = await req.json().catch(() => null);
  const raw = normalizeLink(typeof b?.url === 'string' ? b.url.slice(0, 2000) : '');
  const use: 'story' | 'logo' = b?.use === 'logo' ? 'logo' : 'story';
  if (!raw) return fail('هذا ليس رابطاً. انسخ الرابط من زر «مشاركة» والصقه هنا.');
  const src = linkSource(raw);

  if (src === 'youtube') {
    if (use === 'logo') return fail('للشعار الصق رابط صورة (من Drive مثلاً) أو ارفع الصورة');
    const id = youtubeId(raw)!;
    const o = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (o && (o.status === 404 || o.status === 400)) return fail('فيديو يوتيوب هذا مش موجود أو انحذف. تأكد من الرابط.');
    if (o && (o.status === 401 || o.status === 403)) return fail('فيديو يوتيوب هذا خاص أو ممنوع عرضه بمواقع ثانية. خلّيه «عام» أو «غير مدرج» من YouTube Studio.');
    const j = o?.ok ? await o.json().catch(() => null) : null;
    // a vertical video (a Short) fills the story; a wide one is shown whole. The link's form records which.
    const tall = j && Number(j.height) > Number(j.width) ? true : j ? false : youtubeIsShort(raw);
    const link = tall ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`;
    return NextResponse.json({ link, kind: 'embed', source: 'youtube', thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, title: typeof j?.title === 'string' ? j.title : undefined });
  }

  if (src === 'instagram') {
    if (use === 'logo') return fail('للشعار الصق رابط صورة (من Drive مثلاً) أو ارفع الصورة');
    const post = instagramPost(raw)!;
    const link = instagramUrl(post);
    if (cloudinary()) {
      const got = await instagramMedia(link).catch(() => null);
      if (got?.length) {
        try {
          const items = [];
          for (const m of got.slice(0, 10)) {
            const before = await remoteSize(m.url);
            const up = await cloudinaryFromUrl(m.url, m.kind === 'video' ? 'story-video' : 'story-image');
            await db().insert(schema.media).values({
              id: newKey(), provider: 'cloudinary', url: up.url, filename: safeName('instagram-' + post.code), mime: m.kind === 'video' ? 'video/mp4' : 'image/webp',
              size: up.bytes ?? 0, width: up.width ?? null, height: up.height ?? null,
            });
            items.push({ url: up.url, kind: m.kind, link, source: 'instagram', before, after: up.bytes ?? null, pending: !!up.pending, width: up.width, height: up.height });
          }
          return NextResponse.json(items.length === 1 ? items[0] : { items });
        } catch { /* fall through: keep the link, Instagram's own player shows it */ }
      }
    }
    return NextResponse.json({ link, kind: 'embed', source: 'instagram' });
  }

  if (src === 'drive-folder' || src === 'drive-open') {
    const id = driveLink(raw)!.id;
    const files = await driveFolder(id).catch(() => null);
    if (files?.length) {
      if (use === 'logo') return fail('للشعار الصق رابط ملف واحد، لا مجلد');
      return NextResponse.json({ folder: files.map((f) => ({ url: `https://drive.google.com/file/d/${f.id}/view`, name: f.name, kind: f.kind })) });
    }
    if (src === 'drive-folder') {
      return fail(files ? 'المجلد فاضي: ما فيه صور أو فيديوهات.' : 'المجلد مش مشارك للعامة. في Drive: مشاركة ← «أي شخص لديه الرابط» ثم الصق الرابط مرة ثانية.');
    }
    // open?id= that isn't a folder: a file
  }

  if (src === 'drive-file' || src === 'drive-open' || src === 'direct') {
    if (!cloudinary()) return fail('الاستيراد يحتاج Cloudinary (CLOUDINARY_URL)');
    const id = src === 'direct' ? null : driveLink(raw)!.id;
    const info = id ? await driveProbe(id).catch(() => null) : await directProbe(raw);
    if (!info) return fail(id ? 'الملف مش مشارك للعامة. في Drive: مشاركة ← «أي شخص لديه الرابط» ثم الصق الرابط مرة ثانية.' : 'ما قدرنا نفتح هذا الرابط. تأكد إنه رابط صورة أو فيديو مباشر.');
    const kind = info.mime.startsWith('video/') ? 'video' : info.mime.startsWith('image/') ? 'image'
      : /\.(mp4|mov|m4v|webm|3gp)$/i.test(info.name) ? 'video' : /\.(jpe?g|png|webp|heic|heif|gif|avif)$/i.test(info.name) ? 'image' : null;
    if (!kind) return fail(`هذا الملف مش صورة ولا فيديو (${info.mime || 'نوع غير معروف'}).`);
    if (use === 'logo' && kind !== 'image') return fail('الشعار لازم يكون صورة');
    if (id && ((kind === 'image' && info.size > MAX_IMAGE) || (kind === 'video' && info.size > MAX_VIDEO))) {
      // too big for the free plan as it is: the browser fetches it (through /api/admin/drive), compresses it, uploads it
      return NextResponse.json({ kind: 'big', type: kind, id, size: info.size, mime: info.mime, name: info.name, source: 'drive' });
    }
    if ((kind === 'image' && info.size > MAX_IMAGE) || (kind === 'video' && info.size > MAX_VIDEO)) return fail('الملف كبير جداً. نزّله على جهازك وارفعه من هنا: الموقع بيضغطه لحاله.', 413);
    const preset: Preset = use === 'logo' ? 'logo' : kind === 'video' ? 'story-video' : 'story-image';
    try {
      const up = await cloudinaryFromUrl(id ? driveDownloadUrl(id) : raw, preset);
      await db().insert(schema.media).values({
        id: newKey(), provider: 'cloudinary', url: up.url, filename: safeName(info.name || id || 'link'), mime: kind === 'video' ? 'video/mp4' : 'image/webp',
        size: up.bytes ?? 0, width: up.width ?? null, height: up.height ?? null,
      });
      return NextResponse.json({ url: up.url, kind, source: id ? 'drive' : 'direct', link: raw, before: info.size, after: up.bytes ?? null, pending: !!up.pending, width: up.width, height: up.height, name: info.name });
    } catch (e) {
      return fail('ما زبط الاستيراد: ' + (e as Error).message, 502);
    }
  }

  return fail('هذا الرابط مش مدعوم. الصق رابط يوتيوب أو إنستغرام أو Google Drive (ملف أو مجلد)، أو ارفع الملف من جهازك.');
}

async function directProbe(u: string): Promise<{ mime: string; size: number; name: string } | null> {
  const r = await fetch(u, { headers: { Range: 'bytes=0-0' }, redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(12_000) }).catch(() => null);
  if (!r || !r.ok) return null;
  const mime = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const size = Number((r.headers.get('content-range') || '').split('/')[1]) || Number(r.headers.get('content-length')) || 0;
  try { await r.body?.cancel(); } catch { /* ignore */ }
  return { mime, size, name: decodeURIComponent(new URL(u).pathname.split('/').pop() || '') };
}

export async function GET(req: Request) {
  if (!(await currentAdmin())) return fail('سجّل الدخول أولاً', 401);
  const url = new URL(req.url).searchParams.get('check') || '';
  const r = await cloudinaryResource(url).catch(() => null);
  return NextResponse.json(r ? { ready: true, ...r } : { ready: false });
}
