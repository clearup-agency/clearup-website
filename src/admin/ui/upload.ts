// Browser side of uploads: straight to Cloudinary when the server says so, else to our own endpoint.
// A `preset` (story images/videos, logos) asks Cloudinary to compress the file before storing it; the result
// then carries the size before and after. A long video is compressed in the background: we wait for it here.
export type Preset = 'story-image' | 'story-video' | 'logo';
import { IMAGE_LIMIT, VIDEO_LIMIT, compressVideo, downloadDrive, shrinkImage, type OnStep, type Step } from './compress';
export type { Step, OnStep } from './compress';
export type Uploaded = { url: string; width?: number; height?: number; before?: number; after?: number };

function imageSize(file: File): Promise<{ width?: number; height?: number }> {
  if (!file.type.startsWith('image/')) return Promise.resolve({});
  return new Promise((res) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { res({ width: im.naturalWidth || undefined, height: im.naturalHeight || undefined }); URL.revokeObjectURL(url); };
    im.onerror = () => { res({}); URL.revokeObjectURL(url); };
    im.src = url;
  });
}

/** Waits until Cloudinary has finished a background (async) video, then returns its stored size. */
export async function waitReady(url: string, onStep?: OnStep): Promise<{ bytes?: number; width?: number; height?: number }> {
  const t0 = Date.now();
  while (Date.now() - t0 < 8 * 60_000) {
    await new Promise((r) => setTimeout(r, 3000));
    onStep?.({ stage: 'process', secs: Math.round((Date.now() - t0) / 1000) });
    const j = await fetch('/api/admin/import/?check=' + encodeURIComponent(url), { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
    if (j?.ready) return { bytes: j.bytes, width: j.width, height: j.height };
  }
  throw new Error('التجهيز أخذ وقتاً أطول من المعتاد. احفظ وارجع بعد دقائق، الفيديو بيظهر لحاله.');
}

/** Sends a form to Cloudinary with upload progress (fetch can't report it). */
function post(url: string, fd: FormData, onPct?: (p: number) => void): Promise<any> {
  return new Promise((res, rej) => {
    const x = new XMLHttpRequest();
    x.open('POST', url);
    x.upload.onprogress = (e) => { if (e.lengthComputable) onPct?.(Math.round((e.loaded / e.total) * 100)); };
    x.onload = () => { try { res(JSON.parse(x.responseText)); } catch { rej(new Error('ردّ غير مفهوم من خادم الصور')); } };
    x.onerror = () => rej(new Error('انقطع الاتصال أثناء الرفع. تأكد من الإنترنت وجرّب مرة ثانية.'));
    x.send(fd);
  });
}

export async function uploadFile(file: File, preset?: Preset, onStep?: OnStep): Promise<Uploaded> {
  const original = file.size;
  // too big for the free plan as it is → made small here first (nothing for the admin to do)
  if (preset === 'story-video' && file.size > VIDEO_LIMIT) file = await compressVideo(file, onStep);
  else if (preset && preset !== 'story-video' && file.size > IMAGE_LIMIT && file.type !== 'image/svg+xml') file = await shrinkImage(file);
  const how = await fetch('/api/admin/upload/' + (preset ? '?preset=' + preset : ''), { cache: 'no-store' }).then((r) => r.json());
  if (how.error) throw new Error(how.error);
  const dims = await imageSize(file);
  if (how.mode === 'cloudinary') {
    if (file.size > 100 * 1024 * 1024) throw new Error('الفيديو لسا أكبر من 100 MB حتى بعد الضغط (طويل جداً). قصّه لأقل من 10 دقائق.');
    const fd = new FormData();
    fd.append('file', file);
    for (const [k, v] of Object.entries(how.params as Record<string, string>)) fd.append(k, v);
    onStep?.({ stage: 'upload', pct: 0 });
    const c = await post(how.uploadUrl, fd, (pct) => onStep?.({ stage: 'upload', pct }));
    const pending = c.status === 'pending';
    const url: string | undefined = pending ? how.finalUrl : c.secure_url;
    if (!url) throw new Error(c.error?.message ? 'ما زبط الرفع: ' + c.error.message : 'ما زبط الرفع');
    let stored: { bytes?: number; width?: number; height?: number } = { bytes: c.bytes, width: c.width, height: c.height };
    if (pending) stored = await waitReady(url, onStep);
    const reg = await fetch('/api/admin/upload/', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, filename: file.name, mime: preset === 'story-video' ? 'video/mp4' : preset ? 'image/webp' : file.type, size: stored.bytes ?? file.size, width: stored.width ?? dims.width, height: stored.height ?? dims.height }),
    }).then((r) => r.json());
    if (reg.error) throw new Error(reg.error);
    return { url: reg.url, width: reg.width, height: reg.height, ...(preset ? { before: original, after: stored.bytes } : {}) };
  }
  if (file.size > how.maxBytes) throw new Error('الملف أكبر من 4 ميغابايت. صغّره قبل الرفع.');
  const fd = new FormData();
  fd.append('file', file);
  if (dims.width) fd.append('width', String(dims.width));
  if (dims.height) fd.append('height', String(dims.height));
  const r = await fetch('/api/admin/upload/', { method: 'POST', body: fd });
  const j = await r.json().catch(() => ({ error: 'فشل الرفع' }));
  if (!r.ok || j.error) throw new Error(j.error || 'فشل الرفع');
  return { url: j.url, width: j.width, height: j.height };
}

export type Imported = {
  url?: string; kind?: 'image' | 'video' | 'embed'; link?: string; source?: string; thumb?: string; title?: string;
  before?: number; after?: number | null; pending?: boolean; width?: number; height?: number; name?: string;
  folder?: { url: string; name: string; kind: 'image' | 'video' }[]; items?: Imported[];
};

/** A pasted link (YouTube, Instagram, Google Drive file or folder, direct file) → imported/recognised by the server.
 *  A Drive video comes back while Cloudinary is still compressing it; this waits for it. A Drive file too big for
 *  the free plan is read here, compressed here and uploaded. */
export async function importLink(url: string, use: 'story' | 'logo', onStep?: OnStep): Promise<Imported> {
  const r = await fetch('/api/admin/import/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, use }) });
  const j: Imported & { error?: string; kind?: string; type?: 'image' | 'video'; id?: string; size?: number; mime?: string } = await r.json().catch(() => ({ error: 'ما قدرنا نتصل بالسيرفر. تأكد من الإنترنت.' }));
  if (!r.ok || j.error) throw new Error(j.error || 'ما زبط الاستيراد');
  if ((j.kind as string) === 'big' && j.id && j.size) {
    const file = await downloadDrive(j.id, j.size, j.name || 'drive', j.mime || '', onStep);
    const preset: Preset = use === 'logo' ? 'logo' : j.type === 'video' ? 'story-video' : 'story-image';
    const u = await uploadFile(file, preset, onStep);
    return { url: u.url, width: u.width, height: u.height, kind: j.type, source: 'drive', link: url, before: j.size, after: u.after ?? null, name: j.name };
  }
  const settle = async (x: Imported): Promise<Imported> => {
    if (!x.pending || !x.url) return x;
    const s = await waitReady(x.url, onStep);
    return { ...x, after: s.bytes ?? null, width: s.width, height: s.height, pending: false };
  };
  if (j.items) return { ...j, items: await Promise.all(j.items.map(settle)) };
  return settle(j);
}

export const fmtSize = (n?: number | null) => (typeof n === 'number' && n > 0 ? (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB') : '—');

/** The step in plain Arabic, for progress bars. */
export function stepText(s: Step | null): string {
  if (!s) return 'جاري الإضافة…';
  const p = typeof s.pct === 'number' ? ` ${s.pct}%` : '';
  if (s.stage === 'download') return 'تحميل من Drive…' + p;
  if (s.stage === 'compress') return 'ضغط الفيديو على جهازك…' + p;
  if (s.stage === 'upload') return 'رفع…' + p;
  return 'تجهيز الفيديو…' + (s.secs ? ` ${s.secs} ث` : '');
}
