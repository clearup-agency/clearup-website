import schemaJson from './schema.json';

// Form definitions for the admin (the same fields and Arabic labels the site had in the old CMS).
export type Field = {
  name: string; title?: string; description?: string; type: string; group?: string;
  fields?: Field[]; of?: Field[]; options?: { list?: (string | number | { title: string; value: string | number })[]; layout?: string; accept?: string; rows?: number; compress?: 'story' | 'logo'; bulk?: 'story'; hideable?: boolean };
  rows?: number; initialValue?: unknown;
};
export type SectionType = Field & { groups?: { name: string; title: string }[] };
const RAW = schemaJson as unknown as { sections: SectionType[]; settings: SectionType; fonts: { title: string; value: string }[] };

/** Per-section design options, the same for every section type («تصميم القسم»): background colour or image,
 *  text colour, vertical space and alignment. Empty = the section's own design. */
export const DESIGN_FIELD: Field = {
  name: 'design', title: 'تصميم القسم', type: 'object', group: 'design',
  description: 'اتركها فارغة ليبقى القسم بتصميمه الأصلي.',
  fields: [
    { name: 'tone', title: 'لون القسم', description: 'غامق أو بنفسجي = شريط ملوّن بنص فاتح (الأصفر يظهر على الغامق فقط).', type: 'string', options: { layout: 'radio', list: [{ title: 'افتراضي', value: '' }, { title: 'غامق', value: 'dark' }, { title: 'بنفسجي', value: 'purple' }, { title: 'فاتح', value: 'light' }] } },
    { name: 'bg', title: 'لون الخلفية', type: 'color' },
    { name: 'text', title: 'لون النص', type: 'color' },
    { name: 'bgImage', title: 'صورة خلفية', type: 'image' },
    { name: 'pad', title: 'المسافة فوق وتحت', type: 'string', options: { layout: 'radio', list: [{ title: 'افتراضي', value: '' }, { title: 'صغيرة', value: 's' }, { title: 'متوسطة', value: 'm' }, { title: 'كبيرة', value: 'l' }] } },
    { name: 'align', title: 'محاذاة النص', type: 'string', options: { layout: 'radio', list: [{ title: 'افتراضي', value: '' }, { title: 'بداية السطر', value: 'start' }, { title: 'وسط', value: 'center' }] } },
  ],
};
export const SCHEMA: typeof RAW = {
  ...RAW,
  sections: RAW.sections.map((t) => ({
    ...t,
    groups: [...(t.groups ?? [{ name: 'content', title: 'المحتوى' }]).filter((g) => g.name !== 'design'), { name: 'design', title: 'تصميم القسم' }],
    fields: [...(t.fields ?? []).filter((f) => f.name !== 'design'), DESIGN_FIELD],
  })),
};

export const SECTION_TYPES: Record<string, SectionType> = Object.fromEntries(SCHEMA.sections.map((t) => [t.name, t]));
export const typeTitle = (type: string) => SECTION_TYPES[type]?.title ?? type;

/** A short Arabic label for a section in the list: its title (or eyebrow), else the section kind. */
export function sectionLabel(data: Record<string, any>): string {
  const pick = (v: any): string => {
    if (!v) return '';
    if (Array.isArray(v)) return v.map(pick).filter(Boolean).join(' ');
    if (typeof v === 'string') return v;
    if (typeof v === 'object') return String(v.ar || v.en || '');
    return '';
  };
  for (const k of ['title', 'headline', 'heading', 'eyebrow', 'kicker', 'q', 'name']) {
    const t = pick(data?.[k]).trim();
    if (t) return t.length > 70 ? t.slice(0, 68) + '…' : t;
  }
  return '';
}

export const newKey = () => 'k' + Math.random().toString(16).slice(2, 12);

/** Deep copy with fresh _key values on every array item (for duplicate / add). */
export function rekey<T>(v: T): T {
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === 'object' ? { ...rekey(x), ...('_key' in (x as object) ? { _key: newKey() } : {}) } : x)) as T;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rekey(x)])) as T;
  return v;
}

/** Empty value for a field, honouring its initialValue. */
export function emptyValue(f: Field): unknown {
  if (f.initialValue !== undefined) return f.initialValue;
  switch (f.type) {
    case 'localeString': return { _type: 'localeString', ar: '', en: '' };
    case 'localeText': return { _type: 'localeText', ar: '', en: '' };
    case 'localeBlock': return { _type: 'localeBlock', ar: [], en: [] };
    case 'array': return [];
    case 'boolean': return false;
    case 'object': return Object.fromEntries((f.fields ?? []).map((x) => [x.name, emptyValue(x)]));
    default: return undefined;
  }
}
