import type { SiteView } from './view';
import { DEFAULT_AR, DEFAULT_EN, fontLoad, fontStack, type FontChoice } from './fonts';

export { PRESETS as FONTS } from './fonts';

export type Motion = { enabled: boolean; heroSpeed: number; parallax: number; reveal: boolean };
export const DEFAULT_MOTION: Motion = { enabled: true, heroSpeed: 1, parallax: 100, reveal: true };

/** Animation settings from «إعدادات الموقع» → الحركة, clamped to safe ranges. */
export function asMotion(v: unknown): Motion {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const num = (x: unknown, d: number, lo: number, hi: number) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d);
  return {
    enabled: o.enabled !== false,
    heroSpeed: num(o.heroSpeed, 1, 0.25, 3),
    parallax: num(o.parallax, 100, 0, 200),
    reveal: o.reveal !== false,
  };
}

/** The page's font for its language. */
export const pageFont = (view: Pick<SiteView, 'lang' | 'fontAr' | 'fontEn'>): FontChoice => (view.lang === 'en' ? view.fontEn : view.fontAr);

const isDefault = (c: FontChoice, d: FontChoice) => JSON.stringify(c) === JSON.stringify(d);

/** Brand colours + the page font + motion settings → CSS (overrides globals.css defaults). */
export function themeCss(view: Pick<SiteView, 'colors' | 'lang' | 'fontAr' | 'fontEn' | 'motion'>): string {
  // only well-formed hex values reach the CSS (a half-typed colour in the admin is ignored)
  const vars = Object.entries(view.colors)
    .filter(([k, v]) => /^[a-z]+$/.test(k) && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v)))
    .map(([k, v]) => `--${k}:${v}`);
  const font = pageFont(view);
  if (!(view.lang === 'ar' && isDefault(font, DEFAULT_AR))) vars.push(`--f:${fontStack(font, view.lang)}`);
  const m = view.motion;
  if (m.heroSpeed !== 1) vars.push(`--hx-speed:${+(1 / m.heroSpeed).toFixed(3)}`);
  if (m.parallax !== 100) vars.push(`--hx-par:${+(m.enabled ? m.parallax / 100 : 0).toFixed(2)}`);
  else if (!m.enabled) vars.push('--hx-par:0');
  let css = vars.length ? `:root{${vars.join(';')}}` : '';
  const face = fontLoad(font).faceCss;
  if (face) css = face + css;
  if (!m.enabled) css += '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important}';
  if (!m.reveal) css += '.js [data-reveal]{opacity:1!important;transform:none!important;transition:none!important}';
  return css;
}

/** The Google Fonts stylesheet the page needs, if any. */
export const googleFontHref = (view: Pick<SiteView, 'lang' | 'fontAr' | 'fontEn'>) => fontLoad(pageFont(view)).href ?? null;
export { DEFAULT_AR, DEFAULT_EN };
