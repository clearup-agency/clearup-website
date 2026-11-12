import 'server-only';
import crypto from 'node:crypto';
import { driveLink } from '@/lib/links';

// Image uploads: Cloudinary when CLOUDINARY_URL is set (cloudinary://API_KEY:API_SECRET@CLOUD_NAME),
// otherwise the bytes go into the database (fine for development and small sites).
export function cloudinary(): { cloud: string; key: string; secret: string } | null {
  const u = process.env.CLOUDINARY_URL;
  if (!u) return null;
  const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(u.trim());
  return m ? { key: m[1], secret: m[2], cloud: m[3] } : null;
}

/* Compression at import («أعمال العملاء (ستوري)»): Cloudinary applies these INCOMING transformations before it
   stores the file, so what is kept (and what counts against the storage quota) is already the small version.
   story-image: at most 1080×1920 (Instagram's story size), WebP q75 — typically 100–300 KB.
   story-video: at most 720×1280, H.264 (main) ~1.2 Mbps + AAC, MP4 with the index up front — about 9–10 MB per
   minute; processed in the background (async) because long videos can't be converted inside one request, plus
   a poster frame made at the same time. logo: at most 400×400 WebP q80 (a few KB). */
export type Preset = 'story-image' | 'story-video' | 'logo';
export const PRESETS: Record<Preset, Record<string, string>> = {
  'story-image': { transformation: 'c_limit,w_1080,h_1920/q_75', format: 'webp' },
  'story-video': { transformation: 'c_limit,w_720,h_1280/vc_h264:main:3.1,ac_aac,br_1200k', format: 'mp4', async: 'true', eager: 'so_0,q_auto,c_limit,w_720/jpg', eager_async: 'true' },
  logo: { transformation: 'c_limit,w_400,h_400/q_80', format: 'webp' },
};
export const asPreset = (x: unknown): Preset | undefined => (typeof x === 'string' && x in PRESETS ? (x as Preset) : undefined);
export const STORY_FOLDER = 'clearup/stories';

function sign(params: Record<string, string>, secret: string): string {
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(toSign + secret).digest('hex');
}
const publicId = () => 's' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');

/** Signed parameters so the browser uploads straight to Cloudinary (no size limit from our server).
 *  With a preset the file is compressed on the way in, and its public id is fixed here so the final
 *  address is known even while a video is still being processed. */
export function cloudinarySignature(folder = 'clearup', preset?: Preset) {
  const c = cloudinary();
  if (!c) return null;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const params: Record<string, string> = preset
    ? { folder: STORY_FOLDER, timestamp, public_id: publicId(), ...PRESETS[preset] }
    : { folder, timestamp };
  const kind = preset === 'story-video' ? 'video' : 'auto';
  return { uploadUrl: `https://api.cloudinary.com/v1_1/${c.cloud}/${kind}/upload`, params: { ...params, api_key: c.key, signature: sign(params, c.secret) }, ...(preset ? { finalUrl: finalUrl(c.cloud, preset, params.public_id) } : {}) };
}

/** Where a preset upload ends up (stable even before an async video is ready). */
export function finalUrl(cloud: string, preset: Preset, id: string): string {
  const kind = preset === 'story-video' ? 'video' : 'image';
  return `https://res.cloudinary.com/${cloud}/${kind}/upload/${STORY_FOLDER}/${id}.${PRESETS[preset].format}`;
}

/** Cloudinary fetches a public URL itself and stores the compressed version (nothing passes through our server). */
export async function cloudinaryFromUrl(fileUrl: string, preset: Preset): Promise<{ url: string; bytes?: number; width?: number; height?: number; pending?: boolean }> {
  const c = cloudinary();
  if (!c) throw new Error('Cloudinary غير مفعّل');
  const id = publicId();
  const params: Record<string, string> = { folder: STORY_FOLDER, public_id: id, timestamp: String(Math.floor(Date.now() / 1000)), ...PRESETS[preset] };
  const kind = preset === 'story-video' ? 'video' : 'image';
  const body = new URLSearchParams({ ...params, file: fileUrl, api_key: c.key, signature: sign(params, c.secret) });
  const r = await fetch(`https://api.cloudinary.com/v1_1/${c.cloud}/${kind}/upload`, { method: 'POST', body, signal: AbortSignal.timeout(55_000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error?.message || `Cloudinary ${r.status}`);
  if (j.status === 'pending') return { url: finalUrl(c.cloud, preset, id), pending: true };
  return { url: j.secure_url, bytes: j.bytes, width: j.width, height: j.height };
}

/** A stored file's facts (Admin API), or null while it doesn't exist yet (an async video still processing). */
export async function cloudinaryResource(url: string): Promise<{ bytes: number; width?: number; height?: number; duration?: number } | null> {
  const c = cloudinary();
  const m = /^https:\/\/res\.cloudinary\.com\/([^/]+)\/(image|video)\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i.exec(url);
  if (!c || !m || m[1] !== c.cloud) return null;
  const r = await fetch(`https://api.cloudinary.com/v1_1/${c.cloud}/resources/${m[2]}/upload/${m[3]}`, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${c.key}:${c.secret}`).toString('base64') }, cache: 'no-store', signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  return j && typeof j.bytes === 'number' ? { bytes: j.bytes, width: j.width, height: j.height, duration: j.duration } : null;
}

/* Google Drive: a file shared «anyone with the link» downloads from drive.usercontent.google.com; a public
   folder lists its files on drive.google.com/embeddedfolderview (no API key needed). Link forms: src/lib/links.ts. */
export function driveFileId(u: string): string | null {
  const d = driveLink(u);
  return d && d.kind !== 'folder' ? d.id : null;
}
export function driveFolderId(u: string): string | null {
  const d = driveLink(u);
  return d && d.kind === 'folder' ? d.id : null;
}
export const driveDownloadUrl = (id: string) => `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;

/** What a Drive file is (type + size) without downloading it; null when it isn't public. */
export async function driveProbe(id: string): Promise<{ mime: string; size: number; name: string } | null> {
  // Drive sometimes answers a burst of requests with an error page: two more tries before saying "not public"
  for (let a = 0; a < 3; a++) {
    const r = await driveProbeOnce(id).catch(() => null);
    if (r) return r;
    await new Promise((res) => setTimeout(res, 800 * (a + 1)));
  }
  return null;
}
async function driveProbeOnce(id: string): Promise<{ mime: string; size: number; name: string } | null> {
  const r = await fetch(driveDownloadUrl(id), { headers: { Range: 'bytes=0-0' }, redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  const mime = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const size = Number((r.headers.get('content-range') || '').split('/')[1]) || Number(r.headers.get('content-length')) || 0;
  const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(r.headers.get('content-disposition') || '')?.[1] || '';
  try { await r.body?.cancel(); } catch { /* ignore */ }
  if (!r.ok || mime.startsWith('text/html')) return null;
  return { mime, size, name: decodeURIComponent(name) };
}

/** A public Drive folder's images and videos, in the folder's order. */
export async function driveFolder(id: string): Promise<{ id: string; name: string; kind: 'image' | 'video' }[] | null> {
  const r = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}`, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!r.ok) return null;
  const html = await r.text();
  const out: { id: string; name: string; kind: 'image' | 'video' }[] = [];
  // one block per entry (a sub-folder's block has no image/video type: skipped, not merged with the next one)
  for (const block of html.split('<div class="flip-entry"').slice(1)) {
    if (out.length >= 60) break;
    const id = /^\s*id="entry-([\w-]+)"/.exec(block)?.[1];
    const type = /type\/(image|video)\//.exec(block)?.[1] as 'image' | 'video' | undefined;
    const name = /<div class="flip-entry-title">([\s\S]*?)<\/div>/.exec(block)?.[1] ?? '';
    if (id && type) out.push({ id, kind: type, name: name.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim() });
  }
  return out;
}

export const ALLOWED = /^(image\/(png|jpe?g|webp|gif|svg\+xml|avif)|video\/(mp4|webm)|font\/(woff2?|ttf|otf)|application\/(font-woff2?|x-font-(ttf|otf)))$/;
/** Font files often arrive with no type (or octet-stream): their extension decides. */
export const FONT_EXT = /\.(woff2?|ttf|otf)$/i;
export const fontMime = (name: string) => ({ woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf' } as Record<string, string>)[(name.split('.').pop() || '').toLowerCase()] ?? '';
export const DB_MAX_BYTES = 4 * 1024 * 1024; // hosting functions accept ~4.5 MB per request

export const safeName = (n: string) => (n || 'file').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-80) || 'file';

/** Same-site check for the admin's POST endpoints (cookies are SameSite=Lax as well). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === (req.headers.get('x-forwarded-host') || req.headers.get('host'));
  } catch {
    return false;
  }
}
