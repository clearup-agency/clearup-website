import type { Metadata } from 'next';
import { asLang } from '@/components/SitePage';

/* Nov 24, 2026: «الخدمات والنظام» became «البرامج» at /programs/. On the server build next.config.mjs (and Netlify,
   netlify.toml) redirect /<lang>/services/ before this page is reached; the static export has no redirects, so
   this page sends the visitor on (and tells search engines where the page is now). */
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = asLang((await params).lang);
  return { robots: { index: false }, alternates: { canonical: `/${lang}/programs/` } };
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const to = `/${asLang((await params).lang)}/programs/`;
  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${to}`} />
      <p style={{ padding: 40 }}><a href={to}>{to}</a></p>
    </>
  );
}
