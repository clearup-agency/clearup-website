import type { ContentSnapshot, SectionRow } from '@/db/schema';
import { sampleClientStories } from './stories-sample';
import { polishContent } from './polish';

/* The multi-page site's structure, in one pure module (no server imports): used by the public pages, the
   admin's live preview, the one-time copy from the one-page site (scripts/pages-migrate.mjs) and the tests.

   Pages: home, services, work, about, contact — each an ordered list of sections (SectionRow.page).
   Case studies («أعمالنا»): one row each on the pseudo-page "cases", type caseStudy; each is a page at
   /<lang>/work/<slug>/ and a card on the Work page (and on Home when «مميّزة»). */

export const PAGE_IDS = ['home', 'services', 'work', 'about', 'contact'] as const;
export type PageId = (typeof PAGE_IDS)[number];
export const CASES = 'cases';
export const CASE_TYPE = 'caseStudy';

/** Arabic names in the admin's page switcher, and each page's URL segment. */
export const PAGE_INFO: Record<PageId | 'cases', { title: string; slug: string }> = {
  home: { title: 'الرئيسية', slug: '' },
  services: { title: 'الخدمات والنظام', slug: 'services' },
  work: { title: 'أعمالنا', slug: 'work' },
  about: { title: 'من نحن', slug: 'about' },
  contact: { title: 'تواصل', slug: 'contact' },
  cases: { title: 'قصص العملاء', slug: 'work' },
};
export const isPageId = (p: unknown): p is PageId => typeof p === 'string' && (PAGE_IDS as readonly string[]).includes(p);
export const pageOf = (s: { page?: string | null }) => s.page || 'home';

/** "/ar/services/", "/en/work/al-noon/" — every internal URL is built here. */
export function pagePath(lang: string, page: string, caseSlug?: string): string {
  const seg = isPageId(page) || page === CASES ? PAGE_INFO[page as PageId].slug : page;
  return `/${lang}/${seg ? seg + '/' : ''}${caseSlug ? caseSlug + '/' : ''}`;
}

/** Links stored in the admin («القائمة»): "/services/" → the page in this language; "#faq" → that part of
 *  Home (or of the current page when it has it); "https://…", "mailto:", "tel:" as written. */
export function resolveHref(href: unknown, lang: string, onPage: string = 'home', anchorsHere: string[] = []): string {
  const h = typeof href === 'string' ? href.trim() : '';
  if (!h) return pagePath(lang, 'contact');
  if (/^(https?:|mailto:|tel:|\/\/)/i.test(h)) return h;
  if (h.startsWith('#')) {
    if (onPage === 'home' || anchorsHere.includes(h.slice(1))) return h;
    return pagePath(lang, 'home') + h;
  }
  if (h.startsWith('/')) {
    const clean = h.replace(/^\/(ar|en)(?=\/|$)/, '');
    const seg = clean.split('/').filter(Boolean);
    return `/${lang}/${seg.length ? seg.join('/') + '/' : ''}`;
  }
  return h;
}

/** Which page a nav link points to (for aria-current), or null. */
export function hrefPage(href: unknown): string | null {
  const h = typeof href === 'string' ? href.trim().replace(/^\/(ar|en)(?=\/|$)/, '') : '';
  if (!h.startsWith('/')) return null;
  const seg = h.split('/').filter(Boolean)[0] ?? '';
  if (!seg) return 'home';
  const hit = (Object.entries(PAGE_INFO) as [string, { slug: string }][]).find(([k, v]) => k !== CASES && v.slug === seg);
  return hit ? hit[0] : null;
}

/* ——— placeholders ———
   Text written in [square brackets] is a placeholder ("[اسم العميل]", "[؟]"). On case pages a placeholder is
   never shown to visitors: the element is left out until the admin fills it. The admin's preview shows it,
   striped, with «يظهر للزوار بعد التعبئة». */
export const isPlaceholder = (v: unknown): boolean => {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  return !s || /\[[^\]]*\]/.test(s);
};
export const filled = (v: unknown): v is string => typeof v === 'string' && !isPlaceholder(v);

/** URL-safe slug from a client name (Latin), e.g. "Al Noon Digital" → "al-noon-digital". */
export function slugify(s: string): string {
  return String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
export const validSlug = (s: unknown): s is string => typeof s === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 60;

/** Every case study's slug made valid and unique (an empty or repeated one gets one from the client's name). */
export function uniqueSlugs(rows: SectionRow[]): SectionRow[] {
  const seen = new Set<string>();
  return rows.map((r) => {
    if (r.type !== CASE_TYPE) return r;
    const d = r.data as Record<string, any>;
    const base = validSlug(d.slug) ? d.slug : slugify(d.client?.en || '') || 'case';
    let s = base, i = 2;
    while (seen.has(s)) s = `${base}-${i++}`;
    seen.add(s);
    return s === d.slug ? r : { ...r, data: { ...d, slug: s } };
  });
}

// ——— building blocks for content written in code (the one-time copy below) ———
let n = 0;
const key = (p: string) => `k${p}${(++n).toString(16).padStart(4, '0')}`;
export const ls = (ar: string, en: string) => ({ _type: 'localeString', ar, en });
export const lt = (ar: string, en: string) => ({ _type: 'localeText', ar, en });
const lsk = (ar: string, en: string) => ({ ...ls(ar, en), _key: key('s') });
const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const row = (page: string, type: string, data: Record<string, unknown>, id?: string, hidden = false): SectionRow =>
  ({ id: id ?? key('p'), page, type, hidden, data });

/** New wording this module writes (navigation, page headings, microcopy) — listed in the report as [CONFIRM]. */
export const NEW_COPY = {
  nav: { home: ls('الرئيسية', 'Home'), services: ls('الخدمات والنظام', 'Services & System'), work: ls('أعمالنا', 'Our work'), about: ls('من نحن', 'About'), contact: ls('تواصل', 'Contact') },
  crumbsHome: ls('الرئيسية', 'Home'),
  /** each inner page's opening summary (pageHeadSection.summary): one or two plain sentences that name ClearUp,
   *  built from wording already on the site, for readers, Google and AI answers. Editable per page. */
  summary: {
    services: lt('ClearUp تبني للشركات الصغيرة والمتوسطة نظام نمو واحداً، بست مراحل وأربع مجموعات خدمات.', 'ClearUp builds one growth system for SMEs, in six stages and four service groups.'),
    work: lt('قصص عملاء ClearUp: لكل عميل المشكلة، وماذا فعلنا، والنتيجة.', 'ClearUp’s client stories: for each client, the problem, what we did and the result.'),
    about: lt('ClearUp وكالة نمو وابتكار للشركات الصغيرة والمتوسطة. لا نبيع تصاميم، نبني أنظمة أرباح.', 'ClearUp is an innovation & growth agency for SMEs. We don’t sell designs. We build profit systems.'),
    contact: lt('احجز مع ClearUp مكالمة وضوح: 30 دقيقة بدون التزام، أو تواصل معنا مباشرة على واتساب.', 'Book a clarity call with ClearUp: 30 minutes, no commitment. Or reach us straight on WhatsApp.'),
  } as Record<string, { _type: string; ar: string; en: string }>,
  /** the case-study page's own headings (editable in «إعدادات الموقع» → «الصفحات») */
  caseLabels: {
    kicker: ls('قصة عميل', 'Client story'), problem: ls('التحدي', 'The challenge'), did: ls('الحل: ماذا فعلنا', 'What we did'),
    result: ls('النتيجة', 'The result'), numbers: ls('النتائج', 'Results'), watch: ls('شاهد الفيديو', 'Watch the video'),
    videos: ls('فيديوهات أخرى', 'More videos'), more: ls('قصص أخرى', 'More stories'), read: ls('اقرأ القصة', 'Read the story'), all: ls('كل الأعمال', 'All our work'),
    works: ls('الأعمال', 'The work'), testimonial: ls('رأي العميل', 'In their words'),
  } as Record<string, { _type: string; ar: string; en: string }>,
};

/** The case page's headings in one language: the admin's wording, else the defaults above. */
export function caseLabels(settings: Record<string, any> | null | undefined, lang: 'ar' | 'en'): Record<string, string> {
  const set = (settings?.caseLabels ?? {}) as Record<string, any>;
  return Object.fromEntries(Object.entries(NEW_COPY.caseLabels).map(([k, v]) => {
    const own = set[k];
    const s = typeof own === 'string' ? own : own?.[lang];
    return [k, typeof s === 'string' && s.trim() ? s : v[lang]];
  }));
}

type Raw = Record<string, any>;

/** The multi-page site built from the one-page site's content — nothing is invented: every text below either
 *  comes from the one-page site or is navigation/heading microcopy (NEW_COPY + the page heads), and every
 *  missing fact is a [placeholder] that visitors don't see. Pure: the one-page content is not modified. */
export function fromLegacy(legacy: ContentSnapshot): ContentSnapshot {
  n = 0;
  const src = (legacy.sections ?? []).filter((s) => pageOf(s) === 'home');
  const by = (type: string) => src.find((s) => s.type === type);
  const data = (type: string): Raw => clone((by(type)?.data ?? {}) as Raw);
  const keep = (page: string, type: string, patch: Raw = {}): SectionRow[] => {
    const s = by(type);
    if (!s) return [];
    // the same id on the first page it lands on (inspect history stays readable); a fresh id elsewhere
    return [{ id: s.id, page, type, hidden: !!s.hidden, data: { ...clone(s.data as Raw), ...patch } }];
  };
  const settings: Raw = clone((legacy.settings ?? {}) as Raw);
  const hero = data('heroSection');
  const results = data('resultsSection');
  const stories = data('testimonialsSection');
  const founder = data('founderSection');
  const final = data('finalCtaSection');
  const services = data('servicesSection');

  // ——— settings: menu → pages, the main button → Contact, per-page SEO (empty = the defaults) ———
  settings.navLinks = [
    { _key: key('n'), _type: 'navLink', href: '/services/', label: NEW_COPY.nav.services },
    { _key: key('n'), _type: 'navLink', href: '/work/', label: NEW_COPY.nav.work },
    { _key: key('n'), _type: 'navLink', href: '/about/', label: NEW_COPY.nav.about },
    { _key: key('n'), _type: 'navLink', href: '/contact/', label: NEW_COPY.nav.contact },
  ];
  settings.ctaHref = '/contact/';
  settings.pageMeta = Object.fromEntries(PAGE_IDS.map((p) => [p, { title: ls('', ''), description: lt('', '') }]));

  // a compact «book a call» band that closes every page but Contact (texts from the one-page site's final section)
  const band = (page: string) => row(page, 'ctaBandSection', {
    title: clone(final.title) ?? [lsk('جاهز تغيّر', 'Ready to change'), lsk('طريقة شغلك؟', 'the way you work?')],
    lead: clone(final.promise) ?? lt('', ''),
    cta: clone(hero.cta) ?? ls('احجز مكالمة وضوح', 'Book a clarity call'),
    whatsapp: clone(final.whatsapp) ?? ls('أو مباشرة على واتساب', 'Or straight on WhatsApp'),
  });
  const head = (page: string, eyebrow: Raw, title: Raw, lead: Raw) => row(page, 'pageHeadSection', { eyebrow, title, summary: clone(NEW_COPY.summary[page]) ?? lt('', ''), lead });

  const sections: SectionRow[] = [];
  // ——— Home: short ———
  sections.push(...keep('home', 'heroSection'));
  sections.push(...keep('home', 'clientsSection'));
  sections.push(...keep('home', 'problemSection'));
  sections.push(...keep('home', 'systemSection', { compact: true, more: ls('النظام كاملاً والخدمات', 'The full system & services') }));
  sections.push(row('home', 'proofSection', {
    eyebrow: clone(results.eyebrow) ?? ls('النتائج', 'Results'),
    title: clone(results.title) ?? ls('الدليل قبل الادعاء.', 'Proof before promises.'),
    lead: clone(results.lead) ?? lt('', ''),
    read: clone(results.more) ?? ls('شاهد القصة كاملة', 'See the full story'),
    all: ls('كل الأعمال', 'All our work'),
    limit: 3,
  }));
  // client work as Instagram-style stories (sample clients until the real ones are added in the admin)
  sections.push(row('home', 'clientStoriesSection', sampleClientStories(), 'kstorieshome'));
  sections.push(row('home', 'servicesTeaserSection', {
    eyebrow: clone(services.eyebrow) ?? ls('الخدمات', 'Services'),
    title: clone(services.title) ?? ls('', ''),
    more: ls('كل الخدمات والنظام', 'All services & the system'),
  }));
  sections.push(band('home'));

  // ——— Services & System ———
  sections.push(head('services', ls('الخدمات والنظام', 'Services & System'), clone(hero.system) ?? ls('The Clear Up System™', 'The Clear Up System™'), clone(hero.lead) ?? lt('', '')));
  sections.push(...keep('services', 'systemSection').map((s) => ({ ...s, id: key('p') })));
  sections.push(...keep('services', 'servicesSection'));
  sections.push(...keep('services', 'ninetySection'));
  sections.push(...keep('services', 'auditSection'));
  sections.push(...keep('services', 'faqSection'));
  sections.push(band('services'));

  // ——— Work: the index of case studies ———
  sections.push(head('work', ls('أعمالنا', 'Our work'), clone(stories.title) ?? ls('', ''), clone(results.lead) ?? lt('', '')));
  // the same clients as the Home stories (mirror = no second copy to keep up to date)
  sections.push(row('work', 'clientStoriesSection', { ...sampleClientStories(), clients: [], mirror: true, hint: ls('', '') }, 'kstorieswork'));
  sections.push(row('work', 'workIndexSection', { read: clone(results.more) ?? ls('شاهد القصة كاملة', 'See the full story'), empty: ls('قصص العملاء قريباً.', 'Client stories coming soon.') }));
  sections.push(...keep('work', 'clientsSection').map((s) => ({ ...s, id: key('p') })));
  sections.push(band('work'));

  // ——— About ———
  const members: Raw[] = Array.isArray(founder.members) ? founder.members : [];
  sections.push(head('about', clone(founder.eyebrow) ?? ls('من نحن', 'About'), clone(hero.kicker) ?? ls('للرؤساء التنفيذيين الشجعان فقط', 'For Courageous CEOs Only'), clone(founder.body) ?? lt('', '')));
  // company facts under the About heading (Nov 9, 2026, ClearUp/Munim): commercial registration + founding year
  sections[sections.length - 1].data.facts = [{ ...ls('سجل تجاري رقم 60784', 'Commercial Registration No. 60784'), _key: 'kf0001' }, { ...ls('تأسست 2023', 'Founded 2023'), _key: 'kf0002' }];
  sections.push(...keep('about', 'founderSection', { members: [], team: ls('', ''), teamNote: ls('', '') }));
  sections.push(row('about', 'teamSection', {
    eyebrow: clone(founder.team) ?? ls('الفريق', 'Team'),
    title: ls('الفريق', 'The team'),
    note: clone(founder.teamNote) ?? ls('', ''),
    members: members.map((m) => {
      const [name, role] = String(m?.ar ?? m ?? '').split(/\s*·\s*/);
      const [nameEn, roleEn] = String(m?.en ?? '').split(/\s*·\s*/);
      return { _key: key('m'), _type: 'member', name: ls(name ?? '', nameEn ?? ''), role: ls(role ?? '', roleEn ?? ''), photo: null };
    }),
  }));
  sections.push(row('about', 'manifestoSection', {
    kicker: clone(hero.kicker) ?? ls('للرؤساء التنفيذيين الشجعان فقط', 'For Courageous CEOs Only'),
    lines: [
      ...(Array.isArray(hero.title) ? hero.title.map((t: Raw) => ({ ...clone(t), _key: key('l') })) : []),
      ...(settings.footerLine ? [{ ...clone(settings.footerLine), _key: key('l') }] : []),
    ],
  }));
  sections.push(band('about'));

  // ——— Contact: the form (the one-page site's final section) + direct lines ———
  const ft: Raw[] = Array.isArray(final.title) ? final.title : [];
  sections.push(head('contact', ls('تواصل', 'Contact'), ls(ft.map((t) => t?.ar ?? '').join(' '), ft.map((t) => t?.en ?? '').join(' ')), clone(hero.note) ?? lt('', '')));
  sections.push(...keep('contact', 'finalCtaSection'));
  sections.push(row('contact', 'contactInfoSection', {
    title: ls('أو تواصل مباشرة', 'Or reach us directly'),
    whatsapp: ls('واتساب', 'WhatsApp'), email: ls('البريد', 'Email'), city: ls('المكان', 'Location'), social: ls('تابعنا', 'Follow us'),
  }));

  // ——— Case studies: one per client video on the one-page site; facts only where the site already had them ———
  const resultCases: Raw[] = Array.isArray(results.cases) ? results.cases : [];
  const items: Raw[] = Array.isArray(stories.items) ? stories.items : [];
  const findCase = (client: Raw) => resultCases.find((c) => {
    const a = String(c?.client?.ar ?? ''), b = String(client?.ar ?? '');
    return a && b && (a.includes(b) || b.includes(a));
  });
  for (const it of items) {
    const roleAr = String(it?.role?.ar ?? ''), roleEn = String(it?.role?.en ?? '');
    // the client is the part after «·» in the role ("الرئيس التنفيذي · مساحات"), else the name (a company)
    const [rAr, cAr] = roleAr.includes('·') ? roleAr.split(/\s*·\s*/) : ['', ''];
    const [rEn, cEn] = roleEn.includes('·') ? roleEn.split(/\s*·\s*/) : ['', ''];
    const companyIsName = !cAr || /قصة نجاح|Success story/.test(roleAr + roleEn);
    const client = companyIsName ? clone(it.name) : ls(cAr, cEn);
    const rc = findCase(client);
    const person = companyIsName ? null : clone(it.name);
    const metrics = (Array.isArray(rc?.metrics) ? rc!.metrics : []).map((m: Raw) => ({ _key: key('x'), _type: 'metric', v: clone(m.v), l: clone(m.l) }));
    sections.push(row(CASES, CASE_TYPE, {
      slug: slugify(String(client?.en ?? '')),
      client,
      logo: null,
      industry: clone(rc?.sector) ?? ls('[المجال]', '[Industry]'),
      period: clone(rc?.period) ?? ls('[الفترة]', '[Period]'),
      summary: companyIsName && /·/.test(roleAr) ? ls(rAr ? roleAr.split(/\s*·\s*/)[1] : '', rEn ? roleEn.split(/\s*·\s*/)[1] : '') : (!cAr ? clone(it.role) : ls('', '')),
      cover: clone(it.poster) ?? null,
      problem: clone(rc?.problem) ?? lt('[المشكلة بجملة واحدة من العميل]', '[The problem, in one sentence from the client]'),
      did: Array.isArray(rc?.built) && rc!.built.length ? rc!.built.map((b: Raw) => ({ ...clone(b), _key: key('d') })) : [lsk('[ما ركّبناه]', '[What we built]')],
      result: lt('[النتيجة بجملة واحدة]', '[The result, in one sentence]'),
      metrics: metrics.length ? metrics : [{ _key: key('x'), _type: 'metric', v: ls('[؟]', '[?]'), l: ls('[المقياس]', '[Metric]') }],
      // the video file the one-page site already serves (/media/…mp4) rides with its Instagram link, so the story
      // viewer plays the file itself (sound, its own length) instead of Instagram's embed
      videos: it.videoUrl ? [{ _key: key('v'), _type: 'video', url: it.videoUrl, title: ls(String(it?.name?.ar ?? ''), String(it?.name?.en ?? '')), poster: clone(it.poster) ?? null, ...(it.video?.url ? { file: clone(it.video) } : {}) }] : [],
      testimonial: {
        quote: clone(stories.quote) ?? lt('[اقتباس حقيقي من الفيديو]', '[A real quote from the video]'),
        name: person ?? ls('', ''),
        role: person ? ls(rAr, rEn) : ls('', ''),
      },
      featured: true,
      seo: { title: ls('', ''), description: lt('', '') },
    }));
  }
  // the Nov 2026 polish (new hero wording, «آراء العملاء», the booking promise, Arabic in /ar, the new home order)
  return polishContent({ settings, sections: uniqueSlugs(sections) }).content;
}

/** True when the content already has the multi-page structure (any section with a page other than home,
 *  or a case study). */
export const isMultiPage = (c: ContentSnapshot | null | undefined) =>
  !!c?.sections?.some((s) => pageOf(s) !== 'home' || s.type === CASE_TYPE);
