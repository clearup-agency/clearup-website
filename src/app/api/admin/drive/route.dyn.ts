import { currentAdmin } from '@/admin/auth';
import { driveDownloadUrl } from '@/admin/media';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// A piece of a public Google Drive file, for the admin's browser (Drive itself doesn't let a web page read its
// files). Used only for files too big for the free Cloudinary plan: the browser reads the file in pieces,
// compresses it to 720p and uploads the small result. Each piece ≤ 4 MB (a hosting function's reply limit).
const CHUNK = 4 * 1024 * 1024;

export async function GET(req: Request) {
  if (!(await currentAdmin())) return new Response('unauthorized', { status: 401 });
  const q = new URL(req.url).searchParams;
  const id = q.get('id') || '';
  const start = Number(q.get('start'));
  const end = Math.min(Number(q.get('end')), start + CHUNK - 1);
  if (!/^[\w-]{20,}$/.test(id) || !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) return new Response('bad request', { status: 400 });
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(driveDownloadUrl(id), { headers: { Range: `bytes=${start}-${end}` }, redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(25_000) }).catch(() => null);
    if (r && r.status === 206) {
      const buf = new Uint8Array(await r.arrayBuffer());
      return new Response(buf, { status: 206, headers: { 'content-type': 'application/octet-stream', 'content-range': r.headers.get('content-range') || `bytes ${start}-${start + buf.length - 1}/*`, 'cache-control': 'private, no-store' } });
    }
    try { await r?.body?.cancel(); } catch { /* ignore */ }
    if (r && r.status !== 429 && r.status < 500) return new Response('drive refused', { status: 502 });
  }
  return new Response('drive busy', { status: 503 });
}
