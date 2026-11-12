import seed from '../../seed/content.json';
import { dicts, type Lang } from '@/content';
import type { Dict } from '@/lib/dict';
import type { ContentSnapshot } from '@/db/schema';
import { asFontChoice, DEFAULT_AR, DEFAULT_EN, type FontChoice } from './fonts';
import { asMotion, type Motion } from './theme';
import { chatView, type BotView } from './chatbot';
import { clientRecords } from './clients';
import { CASE_TYPE, NEW_COPY, filled, hrefPage, isPageId, pagePath, resolveHref, type PageId } from './pages';
import { faqAnswer, scrub, sectionNumbers, storiesForVisitors } from './rules';

/* Pure content → view code, shared by the public pages (server) and the admin's live preview (browser).
   No database or Next.js server imports here, so the editor can render a draft instantly in the browser. */

export type Raw = Record<string, any>;
export type Img = { src: string; alt: string; caption?: string; width?: number; height?: number };
export type SectionView = { type: string; key: string; anchor?: string; d: Dict; data: Raw; hidden?: boolean };
/** A case study as the pages show it (localized; `ph` = placeholders are shown, striped — the admin preview only). */
export type CaseView = { key: string; slug: string; href: string; data: Raw; hidden?: boolean };
/** f: the field that holds the label (the menu's link label), for the admin's click-to-edit */
export type Crumb = { label: string; href?: string; f?: string; rec?: string };
/** What pages share beyond their own sections: the case studies, the services groups and system stages
 *  (Home's teasers read them from the Services page), links, and whether placeholders show (admin preview). */
export type PageCtx = {
  lang: Lang; page: PageId; cases: CaseView[]; links: Record<string, string>;
  services: Raw | null; system: Raw | null; preview: boolean;
  /** the first «أعمال العملاء (ستوري)» section with its own clients (a «mirror» section shows these) */
  stories?: Raw | null;
  /** story client key → that client's page */
  clientHref?: Record<string, string>;
  /** the Work page's «book a call» band, which also closes each case study page */
  band?: SectionView | null;
  /** Home's «عملاؤنا يحكون» section (its text source, with Home's order): the testimonial cards' labels and order
   *  under «قصص أخرى» on each client page (Nov 9, 2026); `_key` = Home's section, the admin's click target */
  proof?: Raw | null;
};
export type SiteView = {
  lang: Lang; settings: Raw; base: Dict; sections: SectionView[];
  colors: Record<string, string>; fontAr: FontChoice; fontEn: FontChoice; motion: Motion; source: 'db' | 'fallback';
  /** the chat widget, in this language (raw settings, so the Arabic answer can stand in for a missing English one) */
  chatbot: BotView;
  /** the multi-page site: which page this is, breadcrumbs, per-page SEO, the case study shown (/work/<slug>/) */
  page: PageId; crumbs: Crumb[]; pageTitle: string; seo: { title?: string; description?: string; image?: Img | null };
  ctx: PageCtx; caseView: CaseView | null;
};

export const seedContent = seed as unknown as ContentSnapshot;

/** A stored snapshot in the shape buildView reads (sections carry _type/_key/hidden). */
export function snapshotToRaw(c: ContentSnapshot, source: 'db' | 'fallback' = 'db') {
  return {
    settings: c.settings as Raw,
    page: { sections: c.sections.map((s) => ({ ...s.data, _type: s.type, _key: s.id, _page: s.page || 'home', hidden: s.hidden })) } as Raw,
    source,
  };
}

/** Turns stored content into what components read: {ar,en} → the string for `lang`, images → {src,…},
 *  files → URL, colours → hex. Keeps _key/_type. */
export function localize(v: any, lang: Lang): any {
  if (Array.isArray(v)) return v.map((x) => localize(x, lang));
  if (!v || typeof v !== 'object') return v;
  switch (v._type) {
    case 'localeString':
    case 'localeText': {
      const s = (v[lang] ?? '').toString();
      return s.trim() ? s : (v.ar ?? '');
    }
    case 'localeBlock':
      return Array.isArray(v[lang]) && v[lang].length ? v[lang] : (v.ar ?? []);
    case 'color':
      return v.hex ?? '';
    case 'image': {
      const src: string = v.url || v.localSrc || '';
      if (!src) return null;
      const img: Img = { src, alt: localize(v.alt, lang) || '', caption: localize(v.caption, lang) || '' };
      if (v.width && v.height) { img.width = v.width; img.height = v.height; }
      return img;
    }
    case 'file':
      return v.url || v.localSrc || null;
  }
  const out: Raw = {};
  for (const [k, x] of Object.entries(v)) {
    if (k.startsWith('_') && k !== '_key' && k !== '_type') continue;
    out[k] = localize(x, lang);
  }
  return out;
}

// section type → the key its component reads from the dictionary
export const SECTION_KEY: Record<string, keyof Dict> = {
  heroSection: 'hero', clientsSection: 'clients', problemSection: 'pain', systemSection: 'system',
  resultsSection: 'results', servicesSection: 'services', auditSection: 'audit', ninetySection: 'ninety',
  founderSection: 'founder', testimonialsSection: 'stories', faqSection: 'faq', finalCtaSection: 'final',
};

export const waLink = (num?: string) => 'https://wa.me/' + String(num || '').replace(/\D/g, '');

/** FAQ on the public site: each answer without its [placeholder] parts (so the question shows instead of being
 *  scrubbed away), and a question asked twice shows once. The admin preview keeps the stored text. */
function faqLocalized(data: Raw, pub: boolean): Raw {
  if (!pub || !Array.isArray(data?.items)) return data;
  const seen = new Set<string>();
  const items = data.items
    .map((it: Raw) => (it && typeof it === 'object' ? { ...it, a: faqAnswer(it.a) } : it))
    .filter((it: Raw) => {
      const q = typeof it?.q === 'string' ? it.q.trim().replace(/\s+/g, ' ') : '';
      if (!q) return true;
      if (seen.has(q)) return false;
      seen.add(q);
      return true;
    });
  return { ...data, items };
}

/* One section, one source (Mohamed, Nov 8, 2026: «ليش مش مستخدم component واحد»): the site has ONE FAQ and ONE
   six-stage system. Every «قبل أن تحجز» section on any page shows the same questions, and Home's short six-stage
   row shows the same stages as the Services page — read from the Services page's section (the first visible one
   when Services has none). A section keeps only its own place: key, page, anchor, design, hidden, and for the
   system its compact/«more» switches. */
// Nov 8, 2026 (Mohamed, second round): the testimonials («عملاؤنا يحكون») and the works stories («من شغلنا») are
// one component with one source too — Home's section; «أعمالنا» shows the same.
const SHARED = new Set(['faqSection', 'systemSection', 'offeringsSection', 'toolsSection', 'processSection', 'proofSection', 'workStoriesSection']);
// per-page switches a shared section keeps for itself (Home shows 3 testimonials + «كل الأعمال»; Work shows all)
const OWN: Record<string, string[]> = { proofSection: ['limit', 'all', 'allTestimonials'] };
const PLACEMENT = ['_key', '_type', '_page', 'anchor', 'hidden', 'design', 'compact', 'more'];
export const SHARED_TYPES = SHARED;
/** The keys a reader of a shared section keeps for itself (where it sits, how it looks, its own switches). */
export const ownKeys = (type: string) => [...PLACEMENT, ...(OWN[type] ?? [])];
type Kind = { type: string; page: string; hidden: boolean; compact: boolean };
/** Which section holds the text of a shared section (one source per kind): the full version on the Services page,
 *  else the first visible one, else the first. The same choice for the site (raw sections) and the editor (rows). */
export function pickSource<T>(item: T, all: T[], kind: (x: T) => Kind): T | null {
  const k = kind(item);
  if (!SHARED.has(k.type)) return null;
  const same = all.filter((y) => y && kind(y).type === k.type && !kind(y).compact);
  return same.find((y) => kind(y).page === 'services' && !kind(y).hidden) ?? same.find((y) => !kind(y).hidden) ?? same[0] ?? null;
}
const rawKind = (x: Raw): Kind => ({ type: x._type, page: typeof x._page === 'string' && x._page ? x._page : 'home', hidden: !!x.hidden, compact: !!x.compact });

export function sharedSource(sec: Raw, all: Raw[]): Raw {
  if (!SHARED.has(sec._type)) return sec;
  const pageOf = (x: Raw) => (typeof x._page === 'string' && x._page ? x._page : 'home');
  // the full version is the source (Home's compact system row is only ever a reader)
  const src = pickSource(sec, all, rawKind);
  const out: Raw = { ...(src ?? sec) };
  if (src && src !== sec) for (const k of [...PLACEMENT, ...(OWN[sec._type] ?? [])]) { if (k in sec) out[k] = sec[k]; else delete out[k]; }
  if (sec._type === 'faqSection') delete out.limit; // the whole FAQ everywhere (no «first 3» copy on Home)
  // the testimonials' order and «يظهر بالرئيسية» switches (Nov 9, 2026) live on Home's section, whichever
  // section is the text source, so Home and «أعمالنا» always show the same order
  if (sec._type === 'proofSection') {
    const home = all.find((y) => y && y._type === 'proofSection' && pageOf(y) === 'home' && !y.hidden) ?? all.find((y) => y && y._type === 'proofSection' && pageOf(y) === 'home');
    for (const k of ['order', 'onHome']) { if (home && k in home) out[k] = home[k]; else delete out[k]; }
  }
  return out;
}

/** Lines and videos the admin hid with 👁 / «إخفاء هذا الفيديو عن الزوار» (Nov 9, 2026 — ClearUp never worked for
 *  Tob & Tarha: hidden, not deleted, so it can come back): left out of the page data before anything renders, so
 *  visitors and the admin's preview (the same page) never get them. The stored content keeps them. */
export function withoutHiddenItems(sec: Raw): Raw {
  if (sec._type === 'clientsSection' && Array.isArray(sec.names)) {
    return { ...sec, names: sec.names.filter((n: Raw) => !(n && typeof n === 'object' && n.hidden === true)) };
  }
  if (sec._type === 'offeringsSection' && Array.isArray(sec.items)) {
    return { ...sec, items: sec.items.map((it: Raw) => (it && Array.isArray(it.videos) ? { ...it, videos: it.videos.filter((v: Raw) => !(v && v.hide === true)) } : it)) };
  }
  return sec;
}

/** Builds everything a page needs for one language. */
export function buildView(raw: { settings: Raw | null; page: Raw | null; source: 'db' | 'fallback' }, lang: Lang, slug = 'home', opts: { showHidden?: string | null; caseSlug?: string | null; preview?: boolean; editor?: boolean } = {}): SiteView {
  const fb = seedContent.settings as Raw;
  // visitors never see a placeholder ([…] text = left out, empty = hidden). `editor` = the admin's live editor:
  // it renders exactly the visitors' page (one site, one look), and only the section selected in the panel
  // (opts.showHidden) also shows while visitors don't see it, dimmed, so it can be edited. `preview` (the old
  // striped preview with every placeholder) is no longer used by the editor.
  const pub = !opts.preview;
  const picked = (key: unknown) => !!opts.editor && !!opts.showHidden && key === opts.showHidden;
  const clean = <T,>(v: T): T => (pub ? scrub(v) : v);
  const s = clean(localize({ ...fb, ...(raw.settings ?? {}) }, lang));
  const other: Lang = lang === 'ar' ? 'en' : 'ar';
  const page: PageId = isPageId(slug) ? slug : 'home';
  const all = ((raw.page?.sections ?? []) as Raw[]).filter(Boolean);
  const pageOfRaw = (x: Raw) => (typeof x._page === 'string' && x._page ? x._page : 'home');
  // every client with a page: the «العملاء» list (works, testimonial, project story) merged with the older case
  // study rows (see lib/clients.ts); a hidden case row only while the admin edits it
  const records = clientRecords(all, { showHidden: opts.showHidden });
  const cases: CaseView[] = records
    .filter((r) => r.hasPage)
    .map((r) => ({ key: r._key, slug: r.slug, href: pagePath(lang, 'work', r.slug), data: clean(localize(r, lang)), ...(r.hidden ? { hidden: true } : {}) }))
    .filter((c) => c.slug && (opts.preview || filled(c.data.client) || picked(c.key)));
  // a story client's page (the avatar in the story viewer links there)
  const clientHref: Record<string, string> = {};
  for (const c of cases) if (c.data.storyKey) clientHref[c.data.storyKey] = c.href;
  const caseView = opts.caseSlug ? cases.find((c) => c.slug === opts.caseSlug) ?? null : null;
  const path = caseView ? `work/${caseView.slug}/` : page === 'home' ? '' : pagePath(lang, page).split('/').slice(2).join('/');
  const anchorsHere = all.filter((x) => pageOfRaw(x) === page).map((x) => String(x.anchor || '')).filter(Boolean);
  const href = (h: unknown) => resolveHref(h, lang, page, anchorsHere);
  const static_ = dicts[lang];
  const socials: { label: string; url: string }[] = (s.socials ?? []).filter((x: Raw) => x?.url);
  const base = {
    lang, dir: lang === 'ar' ? 'rtl' : 'ltr',
    meta: { title: s.metaTitle, description: s.metaDescription },
    nav: {
      links: (s.navLinks ?? []).map((l: Raw) => ({ href: href(l.href), label: l.label, page: hrefPage(l.href) })),
      cta: s.cta, ctaShort: s.ctaShort, ctaHref: s.ctaHref ? href(s.ctaHref) : '#book',
      switchLabel: s.langSwitch || static_.nav.switchLabel, switchHref: `/${other}/${path}`,
      home: pagePath(lang, 'home'), current: page,
    },
    concept: pub ? '' : s.concept, // the chip's wording never ships in the public page's data
    // the «Concept» chip and the footer's «design concept» line: admin preview only, never on the public site
    showConcept: !pub && s.showConcept !== false,
    preview: !pub,
    footer: { line: s.footerLine, tagline: s.tagline, city: s.city, email: s.email, rights: s.rights, concept: pub || s.showConcept === false ? '' : s.footerNote, book: s.footerBook, wa: s.footerWa, waShort: s.footerWaShort },
    results: { srcSite: s.srcSite, srcIg: s.srcIg, ph: s.ph },
    stats: [],
    site: {
      brandName: s.brandName || 'CLEAR UP',
      logo: s.logo as Img | null,
      heroLogo: (s.heroLogo ?? null) as { front?: string; back?: string; arrow?: string; image?: Img | null } | null,
      whatsapp: s.whatsapp ? waLink(s.whatsapp) : '',
      instagram: s.instagram || socials.find((x) => /instagram/i.test(x.url))?.url || '',
      socials,
      email: s.email,
    },
  } as unknown as Dict;

  const links: Record<string, string> = {
    home: pagePath(lang, 'home'), services: pagePath(lang, 'services'), work: pagePath(lang, 'work'),
    about: pagePath(lang, 'about'), contact: pagePath(lang, 'contact'), book: (base as any).nav.ctaHref,
  };
  // «احجز مكالمة وضوح» opens the booking form (Mohamed, Nov 9, 2026): a booking link that points at the Contact
  // page lands on its form (#book), wherever the button is — header, hero, bands, footer, phone bar, chat
  if (links.book === links.contact) (base as any).nav.ctaHref = links.book = links.contact + '#book';
  // Nov 11, 2026 (Mohamed): «احجز مكالمة وضوح» opens the Google Calendar booking page once its link is set in the
  // admin («رابط حجز مكالمة وضوح»); every booking button reads links.book / nav.ctaHref, so one field moves them all
  const bookingUrl = typeof s.bookingUrl === 'string' ? s.bookingUrl.trim() : '';
  if (/^https:\/\/\S+$/i.test(bookingUrl)) (base as any).nav.ctaHref = links.book = bookingUrl;
  (base as any).links = links;
  const firstData = (type: string) => {
    const x = all.find((y) => y._type === type && !y.hidden) ?? all.find((y) => y._type === type);
    return x ? clean(localize(x, lang)) : null;
  };
  const storiesSrc = all.find((y) => y._type === 'clientStoriesSection' && !y.hidden && !y.mirror) ?? all.find((y) => y._type === 'clientStoriesSection' && !y.mirror);
  const ctx: PageCtx = { lang, page, cases, links, services: firstData('servicesSection'), system: firstData('systemSection'), preview: !!opts.preview, band: null, stories: storiesSrc ? clean(localize(storiesSrc, lang)) : null, clientHref };
  // the stories section shows only once there are enough real clients with works (rules.ts); the admin's
  // preview always shows it, with a note while visitors don't see it yet
  const storyRule = storiesForVisitors(ctx.stories?.clients);
  if (ctx.stories) ctx.stories = pub ? { ...ctx.stories, clients: storyRule.clients } : { ...ctx.stories, _rule: storyRule };
  // «قصص أخرى» on a client page shows the other clients' testimonial cards (Mohamed, Nov 9, 2026): same labels and
  // the admin's order as Home's «عملاؤنا يحكون»
  const homeProof = all.find((y) => y._type === 'proofSection' && pageOfRaw(y) === 'home' && !y.hidden)
    ?? all.find((y) => y._type === 'proofSection' && pageOfRaw(y) === 'home') ?? all.find((y) => y._type === 'proofSection');
  ctx.proof = homeProof ? { ...clean(localize(sharedSource(homeProof, all), lang)), _key: homeProof._key } : null;

  const sections: SectionView[] = [];
  for (const sec of all) {
    if (caseView || pageOfRaw(sec) !== page || sec._type === CASE_TYPE) continue;
    if (sec.hidden && sec._key !== opts.showHidden) continue;
    const src = withoutHiddenItems(sharedSource(sec, all));
    let data = sec._type === 'faqSection' ? clean(faqLocalized(localize(src, lang), pub)) : clean(localize(src, lang));
    if (sec._type === 'clientStoriesSection') {
      const own = data.mirror ? ctx.stories?.clients ?? [] : data.clients ?? [];
      const rule = storiesForVisitors(own);
      // the Work page's own list is already stories (WorkIndex, with each client's works): not twice
      const twice = page === 'work' && all.some((y) => y._type === 'workIndexSection' && pageOfRaw(y) === 'work' && !y.hidden);
      if (pub && (!rule.show || twice)) {
        if (!picked(sec._key)) continue;
        // selected in the editor while visitors don't see it: shown dimmed, with the note saying why
        sections.push({ type: sec._type, key: sec._key, anchor: sec.anchor, d: base, data: { ...data, _rule: rule }, hidden: true });
        continue;
      }
      data = pub ? { ...data, clients: rule.clients, mirror: false } : { ...data, _rule: rule };
    }
    const k = SECTION_KEY[sec._type];
    let d = base;
    if (k === 'hero') d = { ...base, hero: data, stats: data.stats ?? [] } as Dict;
    else if (k === 'results') d = { ...base, results: { ...(base as any).results, ...data } } as Dict;
    else if (k) d = { ...base, [k]: data } as Dict;
    sections.push({ type: sec._type, key: sec._key, anchor: sec.anchor, d, data, ...(sec.hidden ? { hidden: true } : {}) });
  }
  // section numbers (01, 02 …): off since Nov 8, 2026 (Mohamed: remove the 03 / 05 badges); «إعدادات الموقع» →
  // «أرقام الأقسام» turns them back on, and then they run 01, 02, 03 … in page order (rules.ts)
  const nums = s.showNumbers === true ? sectionNumbers(sections) : sections.map(() => '');
  nums.forEach((n, i) => {
    const sv = sections[i];
    if (n === null) return;
    const k = SECTION_KEY[sv.type];
    sv.data = { ...sv.data, index: n };
    if (k && (sv.d as any)[k]) sv.d = { ...sv.d, [k]: { ...(sv.d as any)[k], index: n } } as Dict;
  });
  const colors: Record<string, string> = {};
  for (const [k, v] of Object.entries(s.colors ?? {})) if (typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v)) colors[k] = v;
  const st = raw.settings ?? {};
  if (caseView) {
    const b = all.find((x) => x._type === 'ctaBandSection' && pageOfRaw(x) === 'work' && !x.hidden) ?? all.find((x) => x._type === 'ctaBandSection' && !x.hidden);
    if (b) ctx.band = { type: b._type, key: b._key, anchor: b.anchor, d: base, data: localize(b, lang) };
  }
  // page label (the menu's wording for it), breadcrumbs, per-page SEO
  const navLabel = (p: string) => ((base as any).nav.links as { page: string | null; label: string }[]).find((l) => l.page === p)?.label
    || (NEW_COPY.nav as Raw)[p]?.[lang] || '';
  const pageTitle = caseView ? String(caseView.data.client || '') : navLabel(page);
  const navF = (p: string) => { const i = ((base as any).nav.links as { page: string | null }[]).findIndex((l) => l.page === p); return i >= 0 ? `s:navLinks.${i}.label` : undefined; };
  const crumbs: Crumb[] = page === 'home' && !caseView ? [] : [
    { label: navLabel('home') || s.homeLabel || NEW_COPY.crumbsHome[lang], href: links.home, f: navF('home') ?? 's:homeLabel' },
    ...(caseView ? [{ label: navLabel('work'), href: links.work, f: navF('work') }, { label: pageTitle, rec: caseView.key }] : [{ label: pageTitle, f: navF(page) }]),
  ];
  const pm = (s.pageMeta ?? {})[page] ?? {};
  const cs = caseView?.data?.seo ?? {};
  const seo = caseView
    ? { title: filled(cs.title) ? cs.title : pageTitle, description: filled(cs.description) ? cs.description : (filled(caseView.data.problem) ? caseView.data.problem : undefined), image: caseView.data.cover ?? null }
    : { title: filled(pm.title) ? pm.title : (page === 'home' ? undefined : pageTitle), description: filled(pm.description) ? pm.description : undefined, image: pm.image ?? null };
  return {
    page, crumbs, pageTitle, seo, ctx, caseView,
    lang, settings: s, base, sections, colors,
    fontAr: asFontChoice(st.fontAr ?? st.font, DEFAULT_AR),
    fontEn: asFontChoice(st.fontEn, DEFAULT_EN),
    motion: asMotion(st.motion),
    chatbot: chatView(st, lang, { whatsapp: (base as any).site.whatsapp, bookHref: (base as any).nav.ctaHref }),
    source: raw.source,
  };
}

