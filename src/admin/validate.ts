import type { Field } from './content';
import { SCHEMA, SECTION_TYPES } from './content';
import { asFontChoice } from '@/lib/fonts';
import { isEmail } from '@/lib/contact';

// Every save goes through here: only fields the form defines are kept, each with the right shape,
// texts are capped, and links/images may only use safe addresses (no "javascript:" links).
const MAX_TEXT = 20_000;
const MAX_BYTES = 400_000;
const SAFE_LINK = /^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/i;
// /tools/ = the tool drawings shipped with the site (public/tools/*.svg, «أدوات نستخدمها»); without it every «نشر» from
// the live editor was refused (Nov 9, 2026)
const SAFE_MEDIA = /^(\/media\/|\/media-db\/|\/brand\/|\/tools\/|https:\/\/)/i;
const LINK_NAMES = /^(href|url|ctaHref|videoUrl|instagram|link)$/;

export class ValidationError extends Error {}

const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, MAX_TEXT) : v == null ? undefined : String(v).slice(0, MAX_TEXT));
const keyOf = (v: any) => (typeof v?._key === 'string' && /^[\w-]{1,40}$/.test(v._key) ? v._key : 'k' + Math.random().toString(16).slice(2, 12));

function link(v: unknown, label: string): string | undefined {
  const s = str(v)?.trim();
  if (!s) return s === '' ? '' : undefined;
  if (!SAFE_LINK.test(s)) throw new ValidationError(`الرابط في «${label}» غير صالح — ابدأه بـ https:// أو # أو /`);
  return s;
}

function clean(f: Field, v: any): any {
  if (v === undefined || v === null) return undefined;
  const label = f.title || f.name;
  switch (f.type) {
    case 'localeString':
    case 'localeText': {
      if (typeof v !== 'object') return { _type: f.type, ar: str(v) ?? '', en: '' };
      const o: any = { _type: f.type, ar: str(v.ar) ?? '', en: str(v.en) ?? '' };
      if (v._key) o._key = keyOf(v);
      // a line of a list hidden from visitors with 👁 (the strip's client names) stays hidden, not deleted
      if (v._key && v.hidden === true) o.hidden = true;
      return o;
    }
    case 'localeBlock': {
      const lang = (a: any) => (Array.isArray(a) ? a.slice(0, 200).filter((b) => b && typeof b === 'object').map((b) => ({
        _type: 'block', _key: keyOf(b), style: ['normal', 'h3', 'blockquote'].includes(b.style) ? b.style : 'normal',
        ...(b.listItem === 'bullet' || b.listItem === 'number' ? { listItem: b.listItem, level: 1 } : {}),
        markDefs: Array.isArray(b.markDefs) ? b.markDefs.filter((m: any) => m?._key && typeof m.href === 'string' && SAFE_LINK.test(m.href)).map((m: any) => ({ _key: String(m._key), _type: 'link', href: m.href })) : [],
        children: (Array.isArray(b.children) ? b.children : []).map((c: any) => ({ _key: keyOf(c), _type: 'span', text: str(c?.text) ?? '', marks: Array.isArray(c?.marks) ? c.marks.filter((m: unknown) => typeof m === 'string').slice(0, 5) : [] })),
      })) : []);
      return { _type: 'localeBlock', ar: lang(v.ar), en: lang(v.en) };
    }
    case 'string': {
      const s = LINK_NAMES.test(f.name) ? link(v, label) : str(v);
      const list = f.options?.list?.map((o) => (typeof o === 'object' ? o.value : o));
      if (list?.length && s && !list.includes(s)) return undefined;
      if (f.name === 'anchor' && s && !/^[a-z0-9-]{0,40}$/.test(s)) throw new ValidationError('«رابط القسم» يقبل أحرفاً إنجليزية صغيرة وأرقاماً و - فقط');
      if (f.name === 'contactTo' && s && !isEmail(s.trim())) throw new ValidationError('«إيميل استقبال الرسائل» غير صحيح — اكتبه مثل name@gmail.com');
      if (f.name === 'contactTo' && s) return s.trim().toLowerCase();
      if (f.name === 'whatsapp' && s && !/^[0-9]{8,15}$/.test(s)) throw new ValidationError('رقم واتساب: أرقام فقط مع رمز الدولة، بدون + أو مسافات');
      return s;
    }
    case 'url':
      return link(v, label);
    case 'number': {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }
    case 'range': {
      const n = Number(v);
      if (!Number.isFinite(n)) return undefined;
      const o = f.options as { min?: number; max?: number } | undefined;
      return Math.min(o?.max ?? n, Math.max(o?.min ?? n, n));
    }
    case 'font': {
      // only the shapes the site can load safely (a preset, a Google family name, an uploaded file of ours)
      const sentinel = { kind: 'preset', id: '__none' } as const;
      const c = asFontChoice(v, sentinel as never);
      if ((c as unknown) === sentinel) throw new ValidationError(`الخط في «${label}» غير صالح — اختر من القائمة أو الصق رابطاً من Google Fonts`);
      return c;
    }
    case 'boolean':
      return Boolean(v);
    case 'color': {
      const hex = str(v?.hex)?.trim() ?? '';
      return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex) ? { _type: 'color', hex } : hex === '' ? undefined : (() => { throw new ValidationError(`اللون في «${label}» يجب أن يكون مثل #5B2096`); })();
    }
    case 'image':
    case 'file': {
      if (typeof v !== 'object') return undefined;
      const url = str(v.url)?.trim();
      if (!url) return undefined;
      if (!SAFE_MEDIA.test(url)) throw new ValidationError(`عنوان الملف في «${label}» غير صالح`);
      const o: any = { _type: f.type, url };
      if (v._key) o._key = keyOf(v);
      if (f.type === 'image') {
        if (Number(v.width) > 0) o.width = Math.round(Number(v.width));
        if (Number(v.height) > 0) o.height = Math.round(Number(v.height));
      }
      for (const sub of f.fields ?? []) { const x = clean(sub, v[sub.name]); if (x !== undefined) o[sub.name] = x; }
      return o;
    }
    case 'array': {
      if (!Array.isArray(v)) return [];
      const m = f.of?.[0];
      if (!m) return [];
      return v.slice(0, 100).map((it) => {
        if (m.type === 'object') {
          const o = cleanFields(m.fields ?? [], it);
          return { _key: keyOf(it), _type: m.name, ...o };
        }
        const x = clean({ ...m, name: f.name, title: f.title }, it);
        return x && typeof x === 'object' && !Array.isArray(x) ? { ...x, _key: keyOf(it) } : x;
      }).filter((x) => x !== undefined);
    }
    case 'object':
      return cleanFields(f.fields ?? [], v);
    default:
      return undefined;
  }
}

function cleanFields(fields: Field[], v: any): Record<string, unknown> {
  const src = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.name === 'hidden') continue;
    const x = clean(f, src[f.name]);
    if (x !== undefined) out[f.name] = x;
  }
  return out;
}

function sizeCheck(o: unknown) {
  if (JSON.stringify(o).length > MAX_BYTES) throw new ValidationError('المحتوى كبير جداً');
  return o;
}

export function cleanSection(type: string, data: unknown): Record<string, unknown> {
  const t = SECTION_TYPES[type];
  if (!t) throw new ValidationError('نوع قسم غير معروف');
  return sizeCheck(cleanFields(t.fields ?? [], data)) as Record<string, unknown>;
}

export function cleanSettings(data: unknown): Record<string, unknown> {
  return sizeCheck(cleanFields(SCHEMA.settings.fields ?? [], data)) as Record<string, unknown>;
}

export const isId = (x: unknown): x is string => typeof x === 'string' && /^[\w-]{1,40}$/.test(x);
