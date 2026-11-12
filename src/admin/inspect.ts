import type { Field } from './content';

/* Inspect-style editing (like Chrome DevTools): every element on the preview that shows a field is
   tagged with that field's path; clicking it opens the section and focuses that exact field in the panel.
   A path is "title.0", "stats.2.v", "clip.poster" … — field names and array indexes, joined with dots.
   Settings fields (header, footer) are prefixed with "s:" ("s:navLinks.1.label"). Pure code, tested. */

export type Candidate = { path: string; text?: string; url?: string };

const norm = (s: string) => s.replace(/[\u2066-\u2069\u200e\u200f]/g, '').replace(/\s+/g, ' ').trim();
export const normText = norm;

const blockText = (blocks: unknown): string[] =>
  Array.isArray(blocks) ? blocks.map((b: any) => norm((b?.children ?? []).map((c: any) => c?.text ?? '').join(''))).filter(Boolean) : [];

/** Every text / image a section's data puts on the page, in the given language, with its path.
 *  Nov 9, 2026 (Mohamed: «بدي تعديل لكل اشي حرفياً زي ال inspect»): also
 *  • each paragraph of a longer text (a text shown as several paragraphs is still one field),
 *  • a list of short texts shown on one line joined by « · » (the whole list is one field),
 *  • the other language's text after this language's (a name shown in English on the Arabic page),
 *  • the Cloudinary asset of an image, whatever size the page asked for (…/upload/<sizes>/v123/x.jpg). */
export function candidates(data: unknown, lang: 'ar' | 'en', prefix = ''): Candidate[] {
  const own = collect(data, lang);
  const seen = new Set(own.map((c) => c.path + '\u0000' + (c.text ?? '')));
  const other = collect(data, lang === 'ar' ? 'en' : 'ar').filter((c) => c.text && !seen.has(c.path + '\u0000' + c.text));
  const out = [...own, ...other];
  return prefix ? out.map((c) => ({ ...c, path: prefix + c.path })) : out;
}

function collect(data: unknown, lang: 'ar' | 'en'): Candidate[] {
  const out: Candidate[] = [];
  const pushText = (path: string, raw: string) => {
    const s = norm(raw);
    if (!s) return;
    out.push({ path, text: s });
    const paras = raw.split(/\n\s*\n|\n/).map(norm).filter(Boolean);
    if (paras.length > 1) for (const p of paras) out.push({ path, text: p });
  };
  const walk = (v: any, path: string) => {
    if (Array.isArray(v)) {
      v.forEach((x, i) => walk(x, path ? `${path}.${i}` : String(i)));
      // a list of short texts shown on one line, «a · b · c» (the services' items, the system's deliverables)
      const parts = v.map((x) => (x && typeof x === 'object' && (x._type === 'localeString' || x._type === 'localeText') ? norm(String((String(x[lang] ?? '').trim() ? x[lang] : x.ar) ?? '')) : typeof x === 'string' ? norm(x) : '')).filter(Boolean);
      if (parts.length > 1 && parts.length === v.length) out.push({ path, text: parts.join(' · ') });
      return;
    }
    if (typeof v === 'string' && /\.\d+$/.test(path)) {
      // a plain-text list member (a few lists keep plain strings)
      if (v.length < 600 && !/^https?:|^#|^\//.test(v)) pushText(path, v);
      return;
    }
    if (!v || typeof v !== 'object') return;
    switch (v._type) {
      case 'localeString':
      case 'localeText': {
        pushText(path, String((String(v[lang] ?? '').trim() ? v[lang] : v.ar) ?? ''));
        return;
      }
      case 'localeBlock': {
        const blocks = Array.isArray(v[lang]) && v[lang].length ? v[lang] : v.ar;
        for (const t of blockText(blocks)) out.push({ path, text: t });
        return;
      }
      case 'image':
      case 'file':
        if (typeof v.url === 'string' && v.url) out.push({ path, url: v.url });
        if (v.alt) walk(v.alt, `${path}.alt`);
        return;
      case 'color':
        return;
    }
    for (const [k, x] of Object.entries(v)) if (!k.startsWith('_')) walk(x, path ? `${path}.${k}` : k);
  };
  walk(data, '');
  return out;
}

/** The part of a media URL that names the file whatever size / format a page asked for: a Cloudinary URL's
 *  "v123/folder/name" (no extension), else the URL itself. */
export function assetKey(u: string): string {
  const m = u.match(/\/upload\/(?:[^/]*\/)*?(v\d+\/[^?#]+?)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i);
  return m ? m[1] : u;
}

/** Splits "stats.2.v" into the trail of fields it goes through (for labels and the breadcrumb). */
export function fieldTrail(fields: Field[], path: string): { title: string; field?: Field; index?: number; path: string }[] {
  const trail: { title: string; field?: Field; index?: number; path: string }[] = [];
  let cur: Field[] = fields;
  let member: Field | null = null; // the array member type after an array field
  let acc = '';
  for (const seg of path.split('.').filter(Boolean)) {
    acc = acc ? `${acc}.${seg}` : seg;
    if (/^\d+$/.test(seg)) {
      const i = Number(seg);
      trail.push({ title: String(i + 1), index: i, path: acc });
      cur = member?.type === 'object' || member?.type === 'image' ? member.fields ?? [] : [];
      member = null;
      continue;
    }
    const f = cur.find((x) => x.name === seg);
    if (!f) break;
    trail.push({ title: f.title || f.name, field: f, path: acc });
    if (f.type === 'array') { member = f.of?.[0] ?? null; cur = []; }
    else cur = f.fields ?? [];
  }
  return trail;
}

/** A short label for a tagged element: "العنوان الكبير · 2". */
export function pathLabel(fields: Field[], path: string): string {
  const t = fieldTrail(fields, path);
  const names = t.filter((x) => x.field).map((x) => x.title);
  const idx = t.filter((x) => x.index !== undefined).map((x) => x.title);
  const last = names[names.length - 1] ?? '';
  const parent = names.length > 1 ? names[names.length - 2] : '';
  return [parent && parent !== last ? parent : '', last].filter(Boolean).join(' › ') + (idx.length ? ' · ' + idx.join('.') : '');
}

/** The longest prefix of `path` that the panel shows (it may not render every leaf, e.g. alt text of an empty image). */
export function parents(path: string): string[] {
  const segs = path.split('.');
  const out: string[] = [];
  for (let i = segs.length; i > 0; i--) out.push(segs.slice(0, i).join('.'));
  return out;
}
