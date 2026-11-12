import { Fragment } from 'react';
import type { SectionView } from '@/lib/view';
import { designCss, toneOf } from '@/lib/design';
import Hero from './Hero';
import Clients from './Clients';
import Pain from './Pain';
import System from './System';
import Results from './Results';
import Services from './Services';
import Audit from './Audit';
import Ninety from './Ninety';
import Founder from './Founder';
import Stories from './Stories';
import Faq from './Faq';
import Final from './Final';
import TextImage from './TextImage';
import Gallery from './Gallery';
import StatsStrip from './StatsStrip';
import ClientStories from './ClientStories';
import type { PageCtx } from '@/lib/view';
import PageHead from './pages/PageHead';
import SystemTeaser from './pages/SystemTeaser';
import Proof from './pages/Proof';
import ServicesTeaser from './pages/ServicesTeaser';
import WorkIndex from './pages/WorkIndex';
import Team from './pages/Team';
import Manifesto from './pages/Manifesto';
import CtaBand from './pages/CtaBand';
import ContactInfo from './pages/ContactInfo';
import WorkStories from './WorkStories';
import Tools from './Tools';
import Fit from './Fit';
import Offerings from './Offerings';
import Products from './Products';
import Process from './Process';

// the id each built-in section already carries; a different anchor set in the CMS gets its own marker
const DEFAULT_ID: Record<string, string> = {
  problemSection: 'pain', systemSection: 'system', resultsSection: 'results', servicesSection: 'services',
  auditSection: 'audit', ninetySection: 'ninety', founderSection: 'founder', testimonialsSection: 'stories',
  faqSection: 'faq', finalCtaSection: 'book', clientStoriesSection: 'client-works',
  workStoriesSection: 'our-work', offeringsSection: 'our-services', toolsSection: 'tools', fitSection: 'fit', productsSection: 'products', processSection: 'how',
};

const lng = (d: unknown): 'ar' | 'en' => ((d as { lang?: string }).lang === 'en' ? 'en' : 'ar');

/** Option A (Nov 11, 2026): the dark numbers strip continues straight on from the dark hero. When the admin's order
 *  puts only the clients' logo strip between them (hero → logos → numbers), the numbers move up to right after the
 *  hero; any other order is left exactly as the admin set it. */
export function numbersAfterHero(sections: SectionView[]): SectionView[] {
  const h = sections.findIndex((s) => s.type === 'heroSection');
  const n = sections.findIndex((s) => s.type === 'statsSection');
  if (h < 0 || n <= h + 1) return sections;
  if (!sections.slice(h + 1, n).every((s) => s.type === 'clientsSection')) return sections;
  const out = sections.slice();
  const [st] = out.splice(n, 1);
  out.splice(h + 1, 0, st);
  return out;
}

/** Renders the page's sections in the order the admin set in the CMS. */
export default function Sections({ sections, mark, focus, ctx }: { sections: SectionView[]; mark?: boolean; focus?: { id: string; path: string } | null; ctx?: PageCtx }) {
  return (
    <>
      {numbersAfterHero(sections).map(({ type, key, anchor, d, data, hidden }) => {
        let el: React.ReactNode = null;
        switch (type) {
          case 'heroSection': el = <Hero d={d} />; break;
          case 'clientsSection': el = <Clients d={d} />; break;
          case 'problemSection': el = <Pain d={d} />; break;
          case 'systemSection': el = data.compact && ctx ? <SystemTeaser d={d} more={data.more} href={ctx.links.services + '#system'} /> : <System d={d} />; break;
          case 'resultsSection': el = <Results d={d} />; break;
          case 'servicesSection': el = <Services d={d} />; break;
          case 'auditSection': el = <Audit d={d} />; break;
          case 'ninetySection': el = <Ninety d={d} />; break;
          case 'founderSection': el = <Founder d={d} top={ctx?.page === 'about'} />; break;
          case 'testimonialsSection': el = <Stories d={d} />; break;
          case 'faqSection': el = <Faq d={d} />; break;
          case 'finalCtaSection': el = <Final d={d} focus={focus && (focus.id === key || focus.path === 's:contactTo') ? focus.path : null} startOpen={ctx?.page === 'contact'} />; break;
          case 'textImageSection': el = <TextImage s={data} />; break;
          case 'gallerySection': el = <Gallery s={data} />; break;
          case 'statsSection': el = <StatsStrip s={data} d={d} />; break;
          case 'clientStoriesSection': el = <ClientStories s={data.mirror ? { ...data, clients: ctx?.stories?.clients ?? [] } : data} lang={(d as { lang?: string }).lang} hrefs={ctx?.clientHref} />; break;
          // the multi-page site's own sections
          case 'pageHeadSection': el = <PageHead s={data} />; break;
          case 'proofSection': el = ctx ? <Proof s={data} ctx={ctx} /> : null; break;
          case 'servicesTeaserSection': el = ctx ? <ServicesTeaser s={data} ctx={ctx} /> : null; break;
          case 'workIndexSection': el = ctx ? <WorkIndex s={data} ctx={ctx} /> : null; break;
          case 'teamSection': el = ctx ? <Team s={data} ctx={ctx} /> : null; break;
          case 'manifestoSection': el = <Manifesto s={data} />; break;
          case 'ctaBandSection': el = <CtaBand s={data} d={d} />; break;
          case 'contactInfoSection': el = <ContactInfo s={data} d={d} />; break;
          // Nov 8, 2026 (ClearUp's content file): works/behind-the-scenes stories, the five services, tools, «تناسبك إذا»
          case 'workStoriesSection': el = <WorkStories s={data} lang={lng(d)} />; break;
          case 'offeringsSection': el = <Offerings s={data} lang={lng(d)} servicesHref={ctx?.links.services} />; break;
          case 'toolsSection': el = <Tools s={data} lang={lng(d)} />; break;
          case 'fitSection': el = <Fit s={data} />; break;
          case 'productsSection': el = <Products s={data} />; break;
          case 'processSection': el = <Process s={data} />; break;
          default: return null; // unknown block type: skip quietly
        }
        if (!el) return null;
        const needsMarker = anchor && anchor !== 'top' && anchor !== DEFAULT_ID[type];
        const dz = designCss(key, data.design);
        const tone = toneOf(data.design);
        const body = (
          <>
            {needsMarker && <span id={anchor} className="anchor" aria-hidden="true" />}
            {/* «تصميم القسم» (background, text colour, spacing, alignment) — only when the admin set something */}
            {dz && <style dangerouslySetInnerHTML={{ __html: dz }} />}
            {dz && <span data-sx={key} hidden />}
            {/* the admin's live preview finds each section by this marker (never on the public site) */}
            {mark && <span data-cu-mark={key} data-hid={hidden ? '1' : undefined} hidden />}
            {el}
          </>
        );
        // «لون القسم» (dark / purple band): a box-less wrapper around the section and its markers, so every marker
        // still sits right before its section (design CSS, the editor's outline) — styles in globals.css «tone»
        return tone ? <div key={key} className={'tone tone--' + tone}>{body}</div> : <Fragment key={key}>{body}</Fragment>;
      })}
    </>
  );
}
