import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LANGS, type Lang } from '@/content';
import { buildView, fetchRaw } from '@/lib/cms';
import { pageMetadata } from '@/lib/seo';
import { ldJson, pageSummary, structuredData } from '@/lib/geo';
import { pagePath, type PageId } from '@/lib/pages';
import Nav from './Nav';
import Footer from './Footer';
import Reveal from './Reveal';
import PageBody from './PageBody';
import ChatLauncher from './chat/ChatLauncher';
import MobileBar from './MobileBar';

/* One public page of the multi-page site (Home, Services, Work, a case study, About, Contact): the same
   shell everywhere — header, breadcrumbs, the page's sections, footer, chat. Content comes from the
   database through the cached reader (src/lib/cms.ts): pre-rendered, refreshed on «نشر», 0 queries per visitor. */

export const asLang = (l: string): Lang => ((LANGS as string[]).includes(l) ? (l as Lang) : 'ar');

// The chatbot's AI mode needs a free key on the server (README → «الشات بوت»); only this yes/no reaches the page.
const aiReady = () => process.env.STATIC_EXPORT !== '1' && !!(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);

export async function siteView(lang: Lang, page: PageId, caseSlug?: string) {
  const v = buildView(await fetchRaw(), lang, page, { caseSlug: caseSlug ?? null });
  // a client page that isn't in the cached copy yet (added a moment ago in the admin — the first read after «نشر»
  // can still be the old copy): read the database once before answering «not found»
  if (caseSlug && !v.caseView && process.env.STATIC_EXPORT !== '1') return buildView(await fetchRaw(true), lang, page, { caseSlug });
  return v;
}

export async function siteMetadata(lang: Lang, page: PageId, caseSlug?: string): Promise<Metadata> {
  const v = await siteView(lang, page, caseSlug);
  if (caseSlug && !v.caseView) return { title: 'ClearUp' };
  const slug = pagePath(lang, page, v.caseView?.slug).split('/').slice(2).join('/').replace(/\/$/, '') || 'home';
  // description: the admin's own for this page, else the page's opening summary (the same words AI answers quote)
  const md = pageMetadata(lang, v.settings, { slug, title: v.seo.title, description: v.seo.description || (page === 'home' && !caseSlug ? undefined : pageSummary(v)) });
  // a page's own share image (or the case's cover) instead of the site's
  if (v.seo.image?.src && md.openGraph) {
    md.openGraph = { ...md.openGraph, images: [{ url: v.seo.image.src, alt: v.seo.title || 'ClearUp' }] };
    md.twitter = { ...(md.twitter ?? {}), images: [{ url: v.seo.image.src }] } as Metadata['twitter'];
  }
  return md;
}

export default async function SitePage({ lang, page, caseSlug }: { lang: Lang; page: PageId; caseSlug?: string }) {
  const view = await siteView(lang, page, caseSlug);
  if (caseSlug && !view.caseView) notFound();
  return (
    <>
      <script
        type="application/ld+json"
        // structured data for Google and AI answers: the company, the website, this page and what it is about (src/lib/geo.ts)
        dangerouslySetInnerHTML={{ __html: ldJson(structuredData(view)) }}
      />
      <Nav d={view.base} />
      <main id="top" className={'pg pg--' + (caseSlug ? 'case' : page)}>
        <PageBody view={view} />
      </main>
      <Footer d={view.base} />
      <Reveal />
      {/* phones: book / WhatsApp always one tap away (not on Contact, where the form is the page) */}
      {page !== 'contact' && (
        <MobileBar lang={lang} book={view.base.nav.ctaHref || view.ctx.links.contact} whatsapp={view.base.site.whatsapp} words={view.base.footer as { book?: string; wa?: string }} chatSide={view.chatbot.enabled ? view.chatbot.side : null} />
      )}
      <ChatLauncher bot={{ ...view.chatbot, ai: view.chatbot.ai && aiReady() }} />
    </>
  );
}
