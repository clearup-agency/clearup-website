/* Fonts for the site, chosen in the admin («إعدادات الموقع» → الخطوط): one for Arabic pages, one for English.
   A font is either a ready preset, any Google Fonts family (paste its link or name), or an uploaded .woff2.
   Pure code (no server imports): used by the public layout, the admin's live preview and the tests. */

export type FontChoice =
  | { kind: 'preset'; id: string }
  | { kind: 'google'; family: string; weights: number[] }
  | { kind: 'file'; family: string; url: string };

export type Preset = { label: string; family: string; google?: string; script: 'ar' | 'en' | 'both'; local?: boolean };

const SYS_AR = "'Segoe UI', Tahoma, system-ui, sans-serif";
const SYS_EN = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

// Thmanyah is self-hosted (its licence: download only from font.thmanyah.com — files are not in git).
export const PRESETS: Record<string, Preset> = {
  thmanyah: { label: 'ثمانية — Thmanyah Sans', family: "'Thmanyah Sans'", script: 'both', local: true },
  'ibm-plex-sans-arabic': { label: 'IBM Plex Sans Arabic', family: "'IBM Plex Sans Arabic'", google: 'IBM Plex Sans Arabic:400;500;700', script: 'ar' },
  alexandria: { label: 'Alexandria (خط موقعهم الحالي)', family: "'Alexandria'", google: 'Alexandria:400;500;700;800;900', script: 'both' },
  'readex-pro': { label: 'Readex Pro', family: "'Readex Pro'", google: 'Readex Pro:400;500;700', script: 'both' },
  tajawal: { label: 'Tajawal', family: "'Tajawal'", google: 'Tajawal:400;500;700;800;900', script: 'ar' },
  cairo: { label: 'Cairo', family: "'Cairo'", google: 'Cairo:400;500;700;800;900', script: 'both' },
  rubik: { label: 'Rubik', family: "'Rubik'", google: 'Rubik:400;500;700;800;900', script: 'both' },
  'noto-kufi-arabic': { label: 'Noto Kufi Arabic', family: "'Noto Kufi Arabic'", google: 'Noto Kufi Arabic:400;500;700;800;900', script: 'ar' },
  'inter-tight': { label: 'Inter Tight', family: "'Inter Tight'", google: 'Inter Tight:400;500;600;700;800;900', script: 'en' },
  'plus-jakarta-sans': { label: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans'", google: 'Plus Jakarta Sans:400;500;600;700;800', script: 'en' },
  manrope: { label: 'Manrope', family: "'Manrope'", google: 'Manrope:400;500;600;700;800', script: 'en' },
  'bricolage-grotesque': { label: 'Bricolage Grotesque', family: "'Bricolage Grotesque'", google: 'Bricolage Grotesque:400;500;600;700;800', script: 'en' },
  'schibsted-grotesk': { label: 'Schibsted Grotesk', family: "'Schibsted Grotesk'", google: 'Schibsted Grotesk:400;500;600;700;800;900', script: 'en' },
  onest: { label: 'Onest', family: "'Onest'", google: 'Onest:400;500;600;700;800;900', script: 'en' },
  'dm-sans': { label: 'DM Sans', family: "'DM Sans'", google: 'DM Sans:400;500;600;700;800;900', script: 'en' },
  'space-grotesk': { label: 'Space Grotesk', family: "'Space Grotesk'", google: 'Space Grotesk:400;500;600;700', script: 'en' },
};

// What a site with no font settings uses. Arabic: Thmanyah (unchanged). English: see DEFAULT_EN.
export const DEFAULT_AR: FontChoice = { kind: 'preset', id: 'thmanyah' };
export const DEFAULT_EN: FontChoice = { kind: 'preset', id: 'manrope' };

const FAMILY_RE = /^[A-Za-z0-9][A-Za-z0-9 \-]{0,60}$/;
const clampWeights = (ws: number[]) => [...new Set(ws.filter((w) => Number.isInteger(w) && w >= 100 && w <= 1000 && w % 100 === 0))].sort((a, b) => a - b);

/** Reads what the admin pasted: a Google Fonts page (fonts.google.com/specimen/Cairo), a css2/css link,
 *  an <link …> or @import snippet, or just a family name. Weights come from the link when it names them. */
export function parseGoogleFont(input: string): { family: string; weights: number[] | null } | { error: string } {
  let s = String(input ?? '').trim();
  if (!s) return { error: 'empty' };
  // a pasted <link href="…"> or @import url(…) snippet → the URL inside
  const inner = /https?:\/\/[^\s"'()<>]+/.exec(s);
  if (inner) s = inner[0].replace(/&amp;/g, '&');
  if (/^https?:\/\//i.test(s)) {
    let u: URL;
    try { u = new URL(s); } catch { return { error: 'bad-url' }; }
    const host = u.hostname.toLowerCase();
    if (host === 'fonts.google.com') {
      const m = /\/(?:specimen|share)\/([^/?#]+)/.exec(u.pathname);
      if (!m) return { error: 'not-a-font-page' };
      const family = decodeURIComponent(m[1]).replace(/\+/g, ' ').trim();
      return FAMILY_RE.test(family) ? { family, weights: null } : { error: 'bad-family' };
    }
    if (host === 'fonts.googleapis.com') {
      const fam = u.searchParams.getAll('family')[0];
      if (!fam) return { error: 'no-family' };
      if (u.pathname.startsWith('/css2')) return parseCss2Family(fam);
      // legacy /css?family=Cairo:400,700|Inter
      const [name, w] = fam.split('|')[0].split(':');
      const family = name.replace(/\+/g, ' ').trim();
      if (!FAMILY_RE.test(family)) return { error: 'bad-family' };
      const weights = w ? clampWeights(w.split(',').map((x) => parseInt(x, 10))) : [];
      return { family, weights: weights.length ? weights : null };
    }
    return { error: 'not-google' };
  }
  const family = s.replace(/\+/g, ' ').replace(/\s+/g, ' ').trim();
  return FAMILY_RE.test(family) ? { family, weights: null } : { error: 'bad-family' };
}

// "Cairo:wght@200..1000", "Inter Tight:ital,wght@0,400;0,700;1,400", "Manrope"
function parseCss2Family(fam: string): { family: string; weights: number[] | null } | { error: string } {
  const [name, axes] = fam.split(':');
  const family = name.replace(/\+/g, ' ').trim();
  if (!FAMILY_RE.test(family)) return { error: 'bad-family' };
  if (!axes) return { family, weights: null };
  const at = axes.indexOf('@');
  if (at < 0) return { family, weights: null };
  const tags = axes.slice(0, at).split(',');
  const wi = tags.indexOf('wght');
  if (wi < 0) return { family, weights: null };
  const ws: number[] = [];
  for (const tuple of axes.slice(at + 1).split(';')) {
    const v = tuple.split(',')[wi];
    if (!v) continue;
    const range = /^(\d+)\.\.(\d+)$/.exec(v);
    if (range) { for (let w = Math.ceil(+range[1] / 100) * 100; w <= +range[2]; w += 100) ws.push(w); }
    else ws.push(parseInt(v, 10));
  }
  const weights = clampWeights(ws);
  return { family, weights: weights.length ? weights : null };
}

/** The Google Fonts stylesheet for a family + weights (display=swap so text shows at once). */
export function css2Url(family: string, weights: number[] = [400, 700]): string {
  const ws = clampWeights(weights);
  const fam = family.trim().replace(/ /g, '+');
  return `https://fonts.googleapis.com/css2?family=${fam}${ws.length ? ':wght@' + ws.join(';') : ''}&display=swap`;
}

/** Normalises whatever is stored (an object, the old string setting, nothing) into a FontChoice. */
export function asFontChoice(v: unknown, fallback: FontChoice): FontChoice {
  if (typeof v === 'string' && PRESETS[v]) return { kind: 'preset', id: v };
  if (!v || typeof v !== 'object') return fallback;
  const o = v as Record<string, unknown>;
  if (o.kind === 'preset' && typeof o.id === 'string' && PRESETS[o.id]) return { kind: 'preset', id: o.id };
  if (o.kind === 'google' && typeof o.family === 'string' && FAMILY_RE.test(o.family)) {
    const ws = clampWeights(Array.isArray(o.weights) ? o.weights.map(Number) : []);
    return { kind: 'google', family: o.family, weights: ws.length ? ws : [400, 700] };
  }
  if (o.kind === 'file' && typeof o.url === 'string' && /^https:\/\/res\.cloudinary\.com\/|^\/media-db\//.test(o.url)) {
    const family = typeof o.family === 'string' && FAMILY_RE.test(o.family) ? o.family : 'Custom Font';
    return { kind: 'file', family, url: o.url };
  }
  return fallback;
}

/** The CSS font-family stack for a choice. Arabic text inside an English page falls back to Thmanyah. */
export function fontStack(c: FontChoice, lang: 'ar' | 'en'): string {
  const name = c.kind === 'preset' ? (PRESETS[c.id] ?? PRESETS.thmanyah).family : `'${c.family}'`;
  const isThm = c.kind === 'preset' && c.id === 'thmanyah';
  return lang === 'ar'
    ? `${name}${isThm ? ", 'IBM Plex Sans Arabic'" : ", 'Thmanyah Sans'"}, ${SYS_AR}`
    : `${name}, ${isThm ? '' : "'Thmanyah Sans', "}${SYS_EN}`;
}

/** What has to be loaded for a choice: a Google stylesheet, an @font-face for an uploaded file, or nothing
 *  (Thmanyah's @font-face comes from components/ThmanyahHead.tsx). */
export function fontLoad(c: FontChoice): { href?: string; faceCss?: string; thmanyah?: boolean } {
  if (c.kind === 'preset') {
    const p = PRESETS[c.id] ?? PRESETS.thmanyah;
    if (p.local) return { thmanyah: true };
    const [fam, ws] = (p.google ?? '').split(':');
    return { href: css2Url(fam, (ws ?? '400;700').split(';').map(Number)) };
  }
  if (c.kind === 'google') return { href: css2Url(c.family, c.weights) };
  const fmt = /\.woff2(\?|$)/i.test(c.url) ? 'woff2' : /\.woff(\?|$)/i.test(c.url) ? 'woff' : /\.otf(\?|$)/i.test(c.url) ? 'opentype' : 'truetype';
  return { faceCss: `@font-face{font-family:'${c.family}';src:url('${c.url.replace(/'/g, '%27')}') format('${fmt}');font-weight:100 1000;font-style:normal;font-display:swap}` };
}

export const fontLabel = (c: FontChoice) => (c.kind === 'preset' ? (PRESETS[c.id]?.label ?? c.id) : c.family);
