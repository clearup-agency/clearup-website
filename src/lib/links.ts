// Pasted links for «أعمال العملاء (ستوري)»: any common form of a YouTube, Instagram or Google Drive link,
// with or without https://, inside a shared message ("شوف هذا https://…"), with tracking bits (?si= ?igsh= &t=).
// Used by the admin (to sort what was pasted) and by the server (to import it) and by the site (to play it).

export type LinkSource = 'youtube' | 'instagram' | 'drive-file' | 'drive-folder' | 'drive-open' | 'direct' | 'unknown';

const URLISH = /(?:https?:\/\/|www\.|m\.|(?:youtu\.be|youtube\.com|instagram\.com|instagr\.am|drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com)\/)[^\s<>"'«»]+/gi;

/** Every link in a block of pasted text (one per line, or several in one message), cleaned up. */
export function splitLinks(text: string): string[] {
  const out: string[] = [];
  for (const m of String(text ?? '').matchAll(URLISH)) {
    const u = normalizeLink(m[0]);
    if (u && !out.includes(u)) out.push(u);
  }
  return out;
}

/** One link as a full https:// address (adds the scheme, trims trailing punctuation), or '' if it isn't one. */
export function normalizeLink(raw: string): string {
  let s = String(raw ?? '').trim();
  const found = s.match(URLISH);
  if (!found) return '';
  s = found[0].replace(/[),.;!؟،]+$/u, '');
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  s = s.replace(/^http:\/\//i, 'https://');
  try { return new URL(s).toString(); } catch { return ''; }
}

/** The 11-character YouTube id in any form: watch?v=, youtu.be/, /shorts/, /embed/, /live/, /v/, m. / music. / nocookie. */
export function youtubeId(u: unknown): string | null {
  if (typeof u !== 'string') return null;
  const m = u.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\/?\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/|v\/|e\/)|youtu\.be\/)([\w-]{11})(?![\w-])/i)
    || u.match(/youtube\.com\/attribution_link\?[^#]*v%3D([\w-]{11})/i);
  return m ? m[1] : null;
}
export const youtubeIsShort = (u: string) => /youtube\.com\/shorts\//i.test(u);

/** Instagram post/reel: { type: reel | p | tv, code }; /reels/ and /username/reel/ forms included. */
export function instagramPost(u: unknown): { type: 'reel' | 'p' | 'tv'; code: string } | null {
  if (typeof u !== 'string') return null;
  const m = u.match(/(?:instagram\.com|instagr\.am)\/(?:[\w.]+\/)?(reels?|p|tv)\/([\w-]{5,})/i);
  if (!m) return null;
  const t = m[1].toLowerCase();
  return { type: t === 'reels' || t === 'reel' ? 'reel' : (t as 'p' | 'tv'), code: m[2] };
}
export const instagramUrl = (p: { type: string; code: string }) => `https://www.instagram.com/${p.type}/${p.code}/`;

/** Google Drive: a file, a folder, or an ?id= link that could be either (open?id=). */
export function driveLink(u: unknown): { kind: 'file' | 'folder' | 'open'; id: string } | null {
  if (typeof u !== 'string') return null;
  let m = u.match(/drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?(?:mobile\/)?folders\/|folderview\?(?:[^#]*&)?id=|embeddedfolderview\?(?:[^#]*&)?id=)([\w-]{20,})/i);
  if (m) return { kind: 'folder', id: m[1] };
  m = u.match(/(?:drive|docs)\.google\.com\/(?:file\/(?:u\/\d+\/)?d\/|uc\?(?:[^#]*&)?id=|thumbnail\?(?:[^#]*&)?id=)([\w-]{20,})/i)
    || u.match(/drive\.usercontent\.google\.com\/(?:download|u\/\d+\/download)\?(?:[^#]*&)?id=([\w-]{20,})/i)
    || u.match(/lh3\.googleusercontent\.com\/d\/([\w-]{20,})/i);
  if (m) return { kind: 'file', id: m[1] };
  m = u.match(/drive\.google\.com\/open\?(?:[^#]*&)?id=([\w-]{20,})/i);
  if (m) return { kind: 'open', id: m[1] };
  return null;
}

export function linkSource(u: string): LinkSource {
  if (youtubeId(u)) return 'youtube';
  if (instagramPost(u)) return 'instagram';
  const d = driveLink(u);
  if (d) return d.kind === 'file' ? 'drive-file' : d.kind === 'folder' ? 'drive-folder' : 'drive-open';
  if (/^https:\/\/[^\s]+\.(?:jpe?g|png|webp|gif|avif|mp4|mov|m4v|webm)(?:\?[^\s]*)?$/i.test(u)) return 'direct';
  return 'unknown';
}

/** What the admin shows on a work's card: where it came from. */
export const SOURCE_LABEL: Record<string, string> = {
  youtube: 'يوتيوب', instagram: 'إنستغرام', drive: 'درايف', upload: 'من جهازك', direct: 'رابط', link: 'رابط',
};
