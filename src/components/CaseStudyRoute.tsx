import type { Metadata } from 'next';
import SitePage, { asLang, siteMetadata } from '@/components/SitePage';
import { caseSlugs, fetchContent } from '@/lib/cms';

// The case-study page (/[lang]/work/[slug]) — one implementation shared by both route files:
//   app/[lang]/work/[slug]/page.dyn.tsx     server build (ISR, dynamicParams = true)
//   app/[lang]/work/[slug]/page.static.tsx  static export (dynamicParams = false)
// Only their route-segment config differs: Next.js needs those as literals in the route file itself,
// and `output: export` rejects dynamicParams = true. Change the page here, never in the route files.

type Params = { params: Promise<{ lang: string; slug: string }> };

export async function generateStaticParams() {
  const c = await fetchContent();
  return caseSlugs(c).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await params;
  return siteMetadata(asLang(p.lang), 'work', p.slug);
}

export default async function CaseStudyPage({ params }: Params) {
  const p = await params;
  return <SitePage lang={asLang(p.lang)} page="work" caseSlug={p.slug} />;
}
