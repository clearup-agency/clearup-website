import type { Metadata, Viewport } from 'next';
import { preconnect, preload as preloadResource } from 'react-dom';
import '../globals.css';
import { notFound } from 'next/navigation';
import { LANGS, type Lang } from '@/content';
import { buildView, fetchRaw } from '@/lib/cms';
import { googleFontHref, pageFont, themeCss } from '@/lib/theme';
import { fetchGoogleCss, latinFiles } from '@/lib/fonts-server';
import { isIndexable, SITE_URL } from '@/lib/seo';
import ThmanyahHead from '@/components/ThmanyahHead';

// The [lang] root layout — one implementation shared by both layout files (like work/[slug]):
//   layout.dyn.tsx     server build: no dynamicParams here, so a client page added in the admin after the build
//                      (/<lang>/work/<new-slug>/) renders on its first visit instead of 404 (a false here
//                      applies to every page below it)
//   layout.static.tsx  static export: dynamicParams = false (only ar/en)
// Site font: Thmanyah Sans (ثمانية) — the font Takwer Growth uses. Free for commercial websites
// under Thmanyah's own licence, but the files may only be downloaded from https://font.thmanyah.com
// (not redistributed), so they are NOT in the repo: put the woff2 files in public/fonts/thmanyah/.
// Without them the stack falls back to IBM Plex Sans Arabic / system fonts. See README.
// The admin can switch to another (Google) font in /admin: «الإعدادات» → الخط.

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}
const asLang = (l: string): Lang => ((LANGS as string[]).includes(l) ? (l as Lang) : 'ar');

// Site-wide metadata (base URL, icons, manifest, indexing). Each page adds its own title, description,
// canonical, hreflang and share image through pageMetadata() in src/lib/seo.ts.
export async function generateMetadata(): Promise<Metadata> {
  const indexable = isIndexable();
  // a favicon uploaded in «إعدادات الموقع» replaces the ClearUp mark
  const fav = (buildView(await fetchRaw(), 'ar').settings.favicon as { src?: string } | null)?.src;
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: 'ClearUp',
    icons: fav
      ? { icon: [{ url: fav }], apple: [{ url: fav }] }
      : {
        icon: [
          { url: '/favicon.ico', sizes: '32x32' },
          { url: '/brand/mark.svg', type: 'image/svg+xml' },
        ],
        apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
      },
    manifest: '/manifest.webmanifest',
    robots: indexable
      ? { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } }
      : { index: false, follow: false, googleBot: { index: false, follow: false } },
  };
}

export const viewport: Viewport = { themeColor: '#F5F7FA', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const given = (await params).lang;
  // only /ar/ and /en/ exist (the server build lets client pages added after the build render on their first
  // visit, so the language itself is checked here instead of with dynamicParams = false)
  if (!(LANGS as string[]).includes(given)) notFound();
  const lang = asLang(given);
  const view = buildView(await fetchRaw(), lang);
  const css = themeCss(view);
  const gf = googleFontHref(view);
  const thm = pageFont(view).kind === 'preset' && (pageFont(view) as { id: string }).id === 'thmanyah';
  // a Google font is fetched here (build / revalidation) and inlined; the browser only fetches its files
  const gcss = gf ? await fetchGoogleCss(gf) : null;
  const preload = gcss ? [...new Set([...latinFiles(gcss, [900, 800]).slice(0, 1), ...latinFiles(gcss, [400])])] : [];
  for (const u of preload) preloadResource(u, { as: 'font', type: 'font/woff2', crossOrigin: '' }); // deduped (see ThmanyahHead)
  // the site's pictures and video posters come from Cloudinary: open that connection while the HTML is still arriving
  preconnect('https://res.cloudinary.com');
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        {thm ? (
          <ThmanyahHead />
        ) : gf ? (
          <>
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            {gcss ? <style id="cms-font" dangerouslySetInnerHTML={{ __html: gcss }} /> : <link rel="stylesheet" href={gf} />}
          </>
        ) : null}
        {css && <style id="cms-theme" dangerouslySetInnerHTML={{ __html: css }} />}
        {/* marks JS as available so reveal-on-scroll can hide content; without JS everything is visible */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
