// Compression in the BROWSER, before anything is uploaded — so a phone video of any size works on the free
// Cloudinary plan (it refuses files over 100 MB): the video is re-encoded here to at most 720×1280,
// H.264 ~1.2 Mbps + AAC 128 kbps (about 9–10 MB per minute), using the browser's own video encoder (WebCodecs,
// through mediabunny). Very big photos are scaled down the same way. Loaded only when needed.

export type Step = { stage: 'download' | 'compress' | 'upload' | 'process'; pct?: number; secs?: number };
export type OnStep = (s: Step) => void;

export const VIDEO_LIMIT = 95 * 1024 * 1024; // over this: compress first (Cloudinary free plan: 100 MB)
export const IMAGE_LIMIT = 9.5 * 1024 * 1024; // over this: scale down first (Cloudinary free plan: 10 MB)

export function canCompressVideo(): boolean {
  return typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoDecoder' in window;
}

/** A video → MP4 at most 720 px on its short side (1280 on its long side), ~1.2 Mbps, AAC audio. */
export async function compressVideo(src: Blob, onStep?: OnStep): Promise<File> {
  if (!canCompressVideo()) throw new Error('المتصفح هذا ما بيقدر يضغط الفيديو. افتح لوحة التحكم من Chrome (على الجوال أو الكمبيوتر) وجرّب مرة ثانية.');
  const mb = await import('mediabunny');
  if (!(await mb.canEncodeAudio('aac').catch(() => false))) {
    const { registerAacEncoder } = await import('@mediabunny/aac-encoder');
    registerAacEncoder();
  }
  const input = new mb.Input({ source: new mb.BlobSource(src), formats: mb.ALL_FORMATS });
  const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new mb.BufferTarget() });
  const conv = await mb.Conversion.init({
    input, output,
    video: async (track) => {
      const w = await track.getDisplayWidth();
      const h = await track.getDisplayHeight();
      const s = Math.min(1, 720 / Math.min(w, h), 1280 / Math.max(w, h));
      const even = (n: number) => Math.max(2, Math.round((n * s) / 2) * 2);
      return { width: even(w), height: even(h), fit: 'fill' as const, codec: 'avc' as const, bitrate: 1_200_000, forceTranscode: true };
    },
    audio: { codec: 'aac' as const, bitrate: 128_000, numberOfChannels: 2, sampleRate: 48000 },
  });
  if (!conv.isValid) {
    const why = conv.discardedTracks.map((t) => t.reason).join(', ');
    throw new Error('ما قدرنا نقرأ هذا الفيديو' + (why ? ` (${why})` : '') + '. جرّب تصديره MP4 من الجوال.');
  }
  conv.onProgress = (p) => onStep?.({ stage: 'compress', pct: Math.min(99, Math.round(p * 100)) });
  onStep?.({ stage: 'compress', pct: 0 });
  await conv.execute();
  const buf = (output.target as InstanceType<typeof mb.BufferTarget>).buffer;
  if (!buf) throw new Error('ما زبط الضغط');
  const name = ((src as File).name || 'video').replace(/\.[^.]+$/, '') + '-720p.mp4';
  return new File([buf], name, { type: 'video/mp4' });
}

/** A photo over 10 MB → JPEG at most 2560 px on its long side (Cloudinary then makes the 1080×1920 WebP). */
export async function shrinkImage(src: Blob): Promise<File> {
  const bmp = await createImageBitmap(src);
  const s = Math.min(1, 2560 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  const out: Blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('ما زبط تصغير الصورة'))), 'image/jpeg', 0.88));
  return new File([out], ((src as File).name || 'image').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}

/** A big public Drive file, read in 4 MB pieces through our server (Drive doesn't let web pages read it directly). */
export async function downloadDrive(id: string, size: number, name: string, mime: string, onStep?: OnStep): Promise<File> {
  const CH = 4 * 1024 * 1024;
  const n = Math.ceil(size / CH);
  const parts: Blob[] = new Array(n);
  let done = 0; let next = 0;
  const one = async (i: number) => {
    const start = i * CH; const end = Math.min(size, start + CH) - 1;
    for (let a = 0; ; a++) {
      const r = await fetch(`/api/admin/drive/?id=${encodeURIComponent(id)}&start=${start}&end=${end}`, { cache: 'no-store' }).catch(() => null);
      if (r && r.status === 206) { parts[i] = await r.blob(); break; }
      if (a >= 4) throw new Error('ما قدرنا نحمّل الملف من Drive (انقطع الاتصال أو Drive رفض). جرّب مرة ثانية، أو نزّله على جهازك وارفعه.');
      await new Promise((res) => setTimeout(res, 1500 * (a + 1)));
    }
    done++;
    onStep?.({ stage: 'download', pct: Math.round((done / n) * 100) });
  };
  onStep?.({ stage: 'download', pct: 0 });
  await Promise.all(Array.from({ length: Math.min(4, n) }, async () => { while (next < n) await one(next++); }));
  return new File(parts, name || 'drive-file', { type: mime || 'application/octet-stream' });
}
