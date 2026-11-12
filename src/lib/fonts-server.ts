import 'server-only';
import { css2Url, parseGoogleFont } from './fonts';

// Google serves woff2 (with unicode-range subsets) only to modern browsers, so ask like one.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

/** Fetches a Google Fonts stylesheet on the server (at build / revalidation — never per visitor) so the page
 *  can inline it: no render-blocking request to fonts.googleapis.com, only the font files from gstatic. */
export async function fetchGoogleCss(href: string): Promise<string | null> {
  if (!href.startsWith('https://fonts.googleapis.com/')) return null;
  try {
    const r = await fetch(href, { headers: { 'user-agent': UA }, next: { revalidate: 86400 }, signal: AbortSignal.timeout(6000) } as RequestInit);
    if (!r.ok) return null;
    const css = await r.text();
    return /@font-face/.test(css) && !/<|<\/style/i.test(css) ? css : null;
  } catch {
    return null;
  }
}

/** The Latin-subset files of the given weights (to preload the hero's weight). */
export function latinFiles(css: string, weights: number[]): string[] {
  const out: string[] = [];
  for (const block of css.split('}')) {
    if (!/unicode-range:\s*U\+0000-00FF/i.test(block)) continue;
    const w = /font-weight:\s*(\d+)/.exec(block);
    const u = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/.exec(block);
    if (w && u && weights.includes(+w[1]) && !out.includes(u[1])) out.push(u[1]);
  }
  return out;
}

export type FontCheck = { ok: true; family: string; weights: number[]; href: string } | { ok: false; error: string };

const ERR: Record<string, string> = {
  empty: 'الصق رابط الخط من Google Fonts أو اكتب اسمه',
  'bad-url': 'الرابط غير صالح',
  'not-google': 'الرابط لازم يكون من fonts.google.com أو fonts.googleapis.com',
  'not-a-font-page': 'افتح صفحة الخط نفسه في Google Fonts وانسخ رابطها (مثل fonts.google.com/specimen/Cairo)',
  'no-family': 'الرابط لا يحتوي اسم خط',
  'bad-family': 'اسم الخط غير صالح',
};

/** Checks a pasted Google Fonts link/name really is a font, and which weights it has (each tried at Google). */
export async function checkGoogleFont(input: string): Promise<FontCheck> {
  const p = parseGoogleFont(input);
  if ('error' in p) return { ok: false, error: ERR[p.error] ?? 'تعذّر قراءة الرابط' };
  const base = await fetchGoogleCss(css2Url(p.family, []));
  if (!base) return { ok: false, error: `ما لقينا خط اسمه «${p.family}» في Google Fonts — تأكد من الاسم أو الرابط` };
  const wanted = p.weights ?? [300, 400, 500, 600, 700, 800, 900];
  const tried = await Promise.all(wanted.map(async (w) => ((await fetchGoogleCss(css2Url(p.family, [w]))) ? w : 0)));
  const weights = tried.filter(Boolean);
  const final = weights.length ? weights : [400];
  return { ok: true, family: p.family, weights: final, href: css2Url(p.family, final) };
}
