import type { Lang } from '@/content';
import type { Raw, SiteView } from './view';
import { abs, defaultOgImage, jsonLd, SITE_URL } from './seo';
import { filled, pagePath } from './pages';

/* GEO — being understood and quoted by AI answers (ChatGPT, Perplexity, Gemini, Google AI Overviews).
   Pure functions over the page's view, so the public pages, /llms.txt and the tests share one source:
   - structuredData(view): the page's JSON-LD graph — the company, the website, this page, its breadcrumbs,
     and per page: Service per service group, FAQPage, the founder (Person), a case study (CreativeWork,
     with the client's quote as a Review once a real quote is filled in);
   - pageSummary(view): the page's opening one-or-two sentences (meta description, schema, llms.txt).
   Only text the admin published goes in: placeholders ("[…]") and empty fields are left out, and no
   rating, price or number is added that the page itself does not show. One entity name everywhere: ClearUp. */

export const ENTITY = 'ClearUp';

const one = (v: unknown): string => (Array.isArray(v) ? v.map(one).filter(Boolean).join(' ') : filled(v) ? v.replace(/\s+/g, ' ').trim() : '');
const urlOf = (v: unknown) => (typeof v === 'string' && /^https?:\/\//.test(v) ? v : '');
const imgOf = (v: Raw | null | undefined) => (v && typeof v.src === 'string' && v.src ? abs(v.src) : '');
const sec = (view: SiteView, type: string): Raw | null => view.sections.find((s) => s.type === type)?.data ?? null;
const secs = (view: SiteView, type: string): Raw[] => view.sections.filter((s) => s.type === type).map((s) => s.data);

/** This page's address (absolute). */
export function pageUrl(view: SiteView): string {
  return abs(pagePath(view.lang, view.page, view.caseView?.slug));
}

/** The company line, from «محركات البحث» → description, with the name in front when it isn't there. */
export function entityLine(lang: Lang, settings: Raw): string {
  const d = one(settings.metaDescription);
  if (!d) return ENTITY;
  if (d.includes(ENTITY)) return d;
  return lang === 'ar' ? `${ENTITY} ${d}` : `${ENTITY}: ${d}`;
}

/** The page's plain opening summary. Case: its «ملخص» field; inner pages: «ملخص الصفحة», else the lead;
 *  Home: the page description from the admin, else the company line. */
export function pageSummary(view: SiteView): string {
  const { lang, settings } = view;
  if (view.caseView) {
    const c = view.caseView.data;
    const own = one(c.summary);
    if (own) return own;
    const client = one(c.client);
    const ind = one(c.industry);
    return lang === 'ar'
      ? `${client}${ind ? ` (${ind})` : ''}: قصة عميل من أعمال ${ENTITY}.`
      : `${client}${ind ? ` (${ind})` : ''}: a ${ENTITY} client story.`;
  }
  if (view.page === 'home') return one(view.seo.description) || entityLine(lang, settings);
  const head = sec(view, 'pageHeadSection');
  return one(head?.summary) || one(view.seo.description) || one(head?.lead) || entityLine(lang, settings);
}

export type QA = { q: string; a: string };
/** The page's questions with a real answer (FAQ sections the admin placed on this page). */
export function pageFaq(view: SiteView): QA[] {
  return secs(view, 'faqSection').flatMap((f) => (Array.isArray(f.items) ? f.items : []))
    .map((it: Raw) => ({ q: one(it?.q), a: one(it?.a) }))
    .filter((x) => x.q && x.a);
}

/** The service groups as the Services page shows them (name + what's in it). */
export function serviceGroups(view: SiteView): { name: string; items: string[] }[] {
  const s = sec(view, 'servicesSection') ?? view.ctx.services;
  return (Array.isArray(s?.groups) ? s!.groups : [])
    .map((g: Raw) => ({ name: one(g?.k), items: (Array.isArray(g?.items) ? g.items : []).map(one).filter(Boolean) }))
    .filter((g: { name: string }) => g.name);
}

/** The founder, from the About page's founder section (only filled fields). */
export function founderOf(view: SiteView): Raw | null {
  const f = sec(view, 'founderSection');
  const name = one(f?.name);
  if (!f || !name) return null;
  const handle = typeof f.igHandle === 'string' && /^[A-Za-z0-9._]{1,30}$/.test(f.igHandle) ? f.igHandle : '';
  return {
    name, role: one(f.role), body: one(f.body), photo: imgOf(f.photo),
    sameAs: handle ? ['https://instagram.com/' + handle] : [],
  };
}

const PAGE_TYPE: Record<string, string> = { home: 'WebPage', services: 'WebPage', work: 'CollectionPage', about: 'AboutPage', contact: 'ContactPage' };

/** The whole JSON-LD graph for one page. */
export function structuredData(view: SiteView): Raw {
  const { lang, settings } = view;
  const base = jsonLd(lang, settings) as Raw;
  const graph: Raw[] = [...base['@graph']];
  const org = { '@id': SITE_URL + '/#organization' };
  const url = pageUrl(view);
  const summary = pageSummary(view);
  const name = view.caseView ? one(view.caseView.data.client) : (view.page === 'home' ? one(settings.metaTitle) || ENTITY : `${view.pageTitle} — ${ENTITY}`);
  const crumbs = view.crumbs.length
    ? { '@type': 'BreadcrumbList', '@id': url + '#breadcrumb', itemListElement: view.crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, item: c.href ? abs(c.href) : url })) }
    : null;
  // the organisation's description = the company line (one name, same wording on every page)
  graph[0] = { ...graph[0], description: entityLine(lang, settings) };

  const page: Raw = {
    '@type': view.caseView ? 'WebPage' : PAGE_TYPE[view.page] ?? 'WebPage',
    '@id': url + '#webpage',
    url, name, description: summary, inLanguage: lang,
    isPartOf: { '@id': SITE_URL + '/#website' },
    publisher: org,
    ...(view.caseView ? {} : { about: org }),
    ...(crumbs ? { breadcrumb: { '@id': crumbs['@id'] } } : {}),
  };
  const img = view.seo.image?.src ? abs(view.seo.image.src) : abs(settings.ogImage?.src || defaultOgImage(lang));
  page.primaryImageOfPage = { '@type': 'ImageObject', url: img };
  graph.push(page);
  if (crumbs) graph.push(crumbs);

  // Services & System: one Service per group
  if (view.page === 'services' && !view.caseView) {
    const groups = serviceGroups(view);
    groups.forEach((g, i) => graph.push({
      '@type': 'Service', '@id': `${url}#service-${i + 1}`,
      name: g.name, serviceType: g.name,
      ...(g.items.length ? { description: g.items.join(lang === 'ar' ? '، ' : ', ') } : {}),
      provider: org, url: url + '#services', inLanguage: lang,
    }));
    if (groups.length) page.mainEntity = groups.map((_, i) => ({ '@id': `${url}#service-${i + 1}` }));
  }

  // FAQ: any page with a «الأسئلة الشائعة» section
  const faq = pageFaq(view);
  if (faq.length) {
    graph.push({
      '@type': 'FAQPage', '@id': url + '#faq', url, inLanguage: lang, isPartOf: { '@id': url + '#webpage' },
      mainEntity: faq.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })),
    });
  }

  // About: the founder
  if (view.page === 'about' && !view.caseView) {
    const f = founderOf(view);
    if (f) {
      const pid = SITE_URL + '/#founder';
      graph.push({
        '@type': 'Person', '@id': pid, name: f.name,
        ...(f.role ? { jobTitle: f.role } : {}),
        ...(f.body ? { description: f.body } : {}),
        ...(f.photo ? { image: f.photo } : {}),
        ...(f.sameAs.length ? { sameAs: f.sameAs } : {}),
        worksFor: org,
      });
      graph[0] = { ...graph[0], founder: { '@id': pid } };
      page.mainEntity = { '@id': pid };
    }
  }

  // a case study: the story as a CreativeWork about the client; the client's own words as a Review
  if (view.caseView) {
    const c = view.caseView.data;
    const client = one(c.client);
    const t = c.testimonial ?? {};
    const quote = one(t.quote);
    const person = one(t.name);
    const parts = [
      one(c.problem) && { k: lang === 'ar' ? 'المشكلة' : 'The problem', v: one(c.problem) },
      one(c.result) && { k: lang === 'ar' ? 'النتيجة' : 'The result', v: one(c.result) },
    ].filter(Boolean) as { k: string; v: string }[];
    const videos = (Array.isArray(c.videos) ? c.videos : []).map((v: Raw) => ({ url: urlOf(v?.url), name: one(v?.title) })).filter((v: { url: string }) => v.url);
    const work: Raw = {
      '@type': 'CreativeWork', '@id': url + '#case', url, name: client, headline: client, description: summary, inLanguage: lang,
      about: { '@type': 'Organization', name: client, ...(one(c.industry) ? { description: one(c.industry) } : {}) },
      ...(one(c.industry) ? { genre: one(c.industry) } : {}),
      ...(one(c.period) ? { temporalCoverage: one(c.period) } : {}),
      creator: org, publisher: org, isPartOf: { '@id': url + '#webpage' },
      ...(imgOf(c.cover) ? { image: imgOf(c.cover) } : {}),
      ...(parts.length ? { text: parts.map((p) => `${p.k}: ${p.v}`).join('\n') } : {}),
      ...(videos.length ? { associatedMedia: videos.map((v: { url: string; name: string }) => ({ '@type': 'MediaObject', url: v.url, ...(v.name ? { name: v.name } : {}) })) } : {}),
    };
    if (quote && person) {
      work.review = {
        '@type': 'Review', reviewBody: quote, inLanguage: lang, itemReviewed: org,
        author: { '@type': 'Person', name: person, ...(one(t.role) ? { jobTitle: one(t.role) } : {}), ...(client ? { worksFor: { '@type': 'Organization', name: client } } : {}) },
      };
    }
    page.mainEntity = { '@id': url + '#case' };
    graph.push(work);
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

/** JSON for a <script type="application/ld+json"> (no "</script>" break-out). */
export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
