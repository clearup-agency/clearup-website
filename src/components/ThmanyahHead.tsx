import { preload as preloadResource } from 'react-dom';
import { fetchGoogleCss } from '@/lib/fonts-server';

// Thmanyah Sans' licence forbids redistribution, so its woff2 files are git-ignored and often absent
// (fresh clone, CI, a host deployed from git). next.config.mjs records at build time which of them exist in
// public/fonts/thmanyah/ (THMANYAH_FILES). This emits @font-face + preloads only for those — before, a
// build without them made 4 failing font requests (404) on every page — and, when none exist, loads
// IBM Plex Sans Arabic instead (it was named in the font stack but never actually loaded).
const FACES: Record<string, string> = { Regular: '400', Medium: '500', Bold: '600 700', Black: '800 900' };
const FILES = (process.env.THMANYAH_FILES ?? '').split(',').filter((f) => f in FACES);
const url = (f: string) => `/fonts/thmanyah/thmanyahsans-${f}.woff2`;
const PLEX = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap';

export const hasThmanyah = FILES.length > 0;

export default async function ThmanyahHead({ preload = ['Black', 'Regular'] }: { preload?: string[] }) {
  if (hasThmanyah) {
    const css = FILES.map((f) => `@font-face{font-family:'Thmanyah Sans';font-weight:${FACES[f]};font-style:normal;font-display:swap;src:url('${url(f)}') format('woff2')}`).join('');
    // react-dom's preload(), not a <link rel="preload"> element: React 19 hoists such an element into <head>
    // *and* renders it in place, so every font preload was in the page twice
    for (const f of preload) if (FILES.includes(f)) preloadResource(url(f), { as: 'font', type: 'font/woff2', crossOrigin: '' });
    return (
      <>
        <style id="thmanyah-font" dangerouslySetInnerHTML={{ __html: css }} />
      </>
    );
  }
  const css = await fetchGoogleCss(PLEX);
  return (
    <>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {css ? <style id="fallback-font" dangerouslySetInnerHTML={{ __html: css }} /> : <link rel="stylesheet" href={PLEX} />}
    </>
  );
}
