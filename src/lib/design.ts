/* Per-section design («تصميم القسم» in the admin) → a few CSS rules for that one section.
   The section is the element right after its <span data-sx> marker (in the editor's preview a hidden
   selection marker may sit between them). Values were validated on publish; checked again here. */
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const PAD: Record<string, string> = { s: 'clamp(56px, 7vw, 96px)', m: 'clamp(104px, 12vw, 190px)', l: 'clamp(150px, 17vw, 270px)' };
const safeUrl = (u: unknown) => (typeof u === 'string' && /^(https:\/\/|\/media\/|\/media-db\/|\/brand\/)[^"'()\\\s<>]*$/.test(u) ? u : '');

export function designCss(key: string, d: unknown): string {
  if (!d || typeof d !== 'object' || !/^[\w-]{1,40}$/.test(key)) return '';
  const o = d as Record<string, any>;
  const rules: string[] = [];
  const bg = typeof o.bg === 'string' && HEX.test(o.bg) ? o.bg : '';
  const img = safeUrl(o.bgImage?.src ?? o.bgImage?.url);
  if (img) rules.push(`background:${bg || 'transparent'} url("${img}") center/cover no-repeat!important`);
  else if (bg) rules.push(`background:${bg}!important`);
  if (typeof o.text === 'string' && HEX.test(o.text)) rules.push(`color:${o.text}!important;--ink:${o.text};--muted:${o.text}`);
  if (PAD[o.pad]) rules.push(`--sec:${PAD[o.pad]};padding-block:${PAD[o.pad]}!important`);
  if (o.align === 'center') rules.push('text-align:center');
  if (o.align === 'start') rules.push('text-align:start');
  if (!rules.length) return '';
  const sel = `[data-sx="${key}"]+*,[data-sx="${key}"]+[data-cu-mark]+*`;
  let css = `${sel}{${rules.join(';')}}`;
  if (o.align === 'center') css += `:is(${sel}) :is(.shead,.h2,.shead__lead,.eyebrow){margin-inline:auto;text-align:center;justify-content:center}`;
  return css;
}

/** The section's band colour («لون القسم»: افتراضي / غامق / بنفسجي / فاتح) — Nov 8, 2026, Mohamed: the site was all
 *  white but one section; dark and purple bands give it rhythm. '' = the section's own look. */
export const TONES = ['dark', 'purple', 'light'] as const;
export function toneOf(d: unknown): (typeof TONES)[number] | '' {
  const t = d && typeof d === 'object' ? (d as Record<string, unknown>).tone : '';
  return (TONES as readonly string[]).includes(t as string) ? (t as (typeof TONES)[number]) : '';
}
