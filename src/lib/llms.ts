import { LANGS, type Lang } from '@/content';
import { buildView, type Raw, type SiteView } from './view';
import { abs } from './seo';
import { filled, PAGE_IDS, pagePath } from './pages';
import { ENTITY, entityLine, founderOf, pageFaq, pageSummary, serviceGroups } from './geo';

/* /llms.txt and /llms-full.txt (llmstxt.org): a plain-text map of the site for AI assistants, generated from
   the published content in Arabic and English — so it changes the moment the admin presses «نشر».
   Only published text: placeholders ("[…]"), hidden sections and unfilled case studies are left out. */

type RawSite = { settings: Raw | null; page: Raw | null; source: 'db' | 'fallback' };

const one = (v: unknown): string => (Array.isArray(v) ? v.map(one).filter(Boolean).join(' ') : filled(v) ? v.replace(/\s+/g, ' ').trim() : '');
const L = {
  ar: { lang: 'العربية', pages: 'الصفحات', cases: 'قصص العملاء', services: 'الخدمات', faq: 'أسئلة وأجوبة', contact: 'التواصل', founder: 'المؤسس', whatsapp: 'واتساب', email: 'البريد', city: 'المكان', social: 'الحسابات' },
  en: { lang: 'English', pages: 'Pages', cases: 'Client stories', services: 'Services', faq: 'Questions & answers', contact: 'Contact', founder: 'Founder', whatsapp: 'WhatsApp', email: 'Email', city: 'Location', social: 'Profiles' },
} as const;

function views(raw: RawSite, lang: Lang): SiteView[] {
  const home = buildView(raw, lang, 'home');
  const pages = PAGE_IDS.map((p) => buildView(raw, lang, p)).filter((v) => v.page === 'home' || v.sections.length);
  const cases = home.ctx.cases.map((c) => buildView(raw, lang, 'work', { caseSlug: c.slug })).filter((v) => v.caseView);
  return [...pages, ...cases];
}

function contactLines(v: SiteView): string[] {
  const s = v.settings, t = L[v.lang];
  const wa = typeof s.whatsapp === 'string' && /^[0-9]{8,15}$/.test(s.whatsapp) ? s.whatsapp : '';
  const socials: string[] = (s.socials ?? []).map((x: Raw) => x?.url).filter((u: unknown) => typeof u === 'string' && /^https?:\/\//.test(u as string));
  return [
    wa && `- ${t.whatsapp}: https://wa.me/${wa}`,
    one(s.email) && `- ${t.email}: ${one(s.email)}`,
    one(s.city) && `- ${t.city}: ${one(s.city)}`,
    socials.length && `- ${t.social}: ${socials.join(' · ')}`,
    `- ${abs(pagePath(v.lang, 'contact'))}`,
  ].filter(Boolean) as string[];
}

function langBlock(raw: RawSite, lang: Lang): string[] {
  const vs = views(raw, lang);
  const t = L[lang];
  const home = vs[0];
  const out: string[] = [`## ${t.lang}`, '', entityLine(lang, home.settings), ''];
  out.push(`### ${t.pages}`, '');
  for (const v of vs.filter((x) => !x.caseView)) {
    const title = v.page === 'home' ? (one(home.settings.metaTitle) || ENTITY) : v.pageTitle;
    out.push(`- [${title}](${abs(pagePath(lang, v.page))}): ${pageSummary(v)}`);
  }
  const cases = vs.filter((x) => x.caseView);
  if (cases.length) {
    out.push('', `### ${t.cases}`, '');
    for (const v of cases) out.push(`- [${one(v.caseView!.data.client)}](${abs(pagePath(lang, 'work', v.caseView!.slug))}): ${pageSummary(v)}`);
  }
  const svc = vs.find((x) => x.page === 'services' && !x.caseView);
  const groups = svc ? serviceGroups(svc) : [];
  if (groups.length) {
    out.push('', `### ${t.services}`, '');
    for (const g of groups) out.push(`- ${g.name}${g.items.length ? ': ' + g.items.join(lang === 'ar' ? '، ' : ', ') : ''}`);
  }
  const faq = vs.flatMap((v) => (v.caseView ? [] : pageFaq(v)));
  if (faq.length) {
    out.push('', `### ${t.faq}`, '');
    for (const x of faq) out.push(`- ${x.q}`, `  ${x.a}`);
  }
  out.push('', `### ${t.contact}`, '', ...contactLines(home), '');
  return out;
}

/** /llms.txt — who ClearUp is, every page with its one-line summary, services, FAQ, contact; AR then EN. */
export function llmsTxt(raw: RawSite): string {
  const home = buildView(raw, 'en', 'home');
  const out = [`# ${ENTITY}`, '', `> ${entityLine('en', home.settings)} / ${entityLine('ar', buildView(raw, 'ar', 'home').settings)}`, ''];
  out.push(`- ${abs('/llms-full.txt')}`, `- ${abs('/sitemap.xml')}`, '');
  for (const lang of LANGS) out.push(...langBlock(raw, lang));
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// ——— the full text ———
const SKIP = new Set(['anchor', 'index', 'src', 'url', 'videoUrl', 'video', 'href', 'slug', 'igHandle', 'width', 'height', 'compact', 'limit',
  'hidden', 'featured', 'poster', 'photo', 'cover', 'logo', 'image', 'alt', 'caption', 'seo', 'ph', 'srcSite', 'srcIg', 'src', 'more', 'read', 'all', 'play', 'empty', 'restart', 'book', 'next', 'fields', 'submit', 'notYetMsg', 'ig']);

function texts(v: unknown, out: string[]) {
  if (Array.isArray(v)) { v.forEach((x) => texts(x, out)); return; }
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v as Raw)) if (!k.startsWith('_') && !SKIP.has(k)) texts(x, out);
    return;
  }
  const s = one(v);
  if (s && !/^(https?:|\/|#|mailto:|tel:)/.test(s) && !/^[0-9.]+$/.test(s) && out[out.length - 1] !== s) out.push(s);
}

function pageText(v: SiteView): string[] {
  const lines: string[] = [];
  if (v.caseView) {
    const c = v.caseView.data;
    const labelled: [string, unknown][] = v.lang === 'ar'
      ? [['القطاع', c.industry], ['الفترة', c.period], ['المشكلة', c.problem], ['ماذا فعلنا', c.did], ['النتيجة', c.result]]
      : [['Industry', c.industry], ['Period', c.period], ['The problem', c.problem], ['What we did', c.did], ['The result', c.result]];
    for (const [k, x] of labelled) { const s = Array.isArray(x) ? x.map(one).filter(Boolean).join(' · ') : one(x); if (s) lines.push(`${k}: ${s}`); }
    const m = (Array.isArray(c.metrics) ? c.metrics : []).map((x: Raw) => (one(x?.v) && one(x?.l) ? `${one(x.l)}: ${one(x.v)}` : '')).filter(Boolean);
    if (m.length) lines.push(m.join(' · '));
    const t = c.testimonial ?? {};
    if (one(t.quote)) lines.push(`«${one(t.quote)}» — ${[one(t.name), one(t.role)].filter(Boolean).join(', ')}`);
    for (const vid of Array.isArray(c.videos) ? c.videos : []) if (typeof vid?.url === 'string' && /^https?:/.test(vid.url)) lines.push(`${v.lang === 'ar' ? 'فيديو' : 'Video'}: ${vid.url}`);
    return lines;
  }
  for (const s of v.sections) {
    if (['ctaBandSection', 'workIndexSection', 'proofSection', 'servicesTeaserSection', 'finalCtaSection', 'contactInfoSection'].includes(s.type)) continue;
    const body: string[] = [];
    if (s.type === 'faqSection') { for (const x of pageFaq({ ...v, sections: [s] })) body.push(`Q: ${x.q}`, `A: ${x.a}`); }
    else texts(s.data, body);
    if (body.length) lines.push(...body, '');
  }
  if (v.page === 'about') {
    const f = founderOf(v);
    if (f?.sameAs?.length) lines.push(`${L[v.lang].founder}: ${f.name} — ${f.sameAs.join(' ')}`);
  }
  if (v.page === 'work') for (const c of v.ctx.cases) lines.push(`- ${one(c.data.client)}: ${abs(c.href)}`);
  return lines;
}

/** /llms-full.txt — the published text of every page and client story, AR then EN. */
export function llmsFullTxt(raw: RawSite): string {
  const out = [`# ${ENTITY} — full text`, '', `> ${entityLine('en', buildView(raw, 'en', 'home').settings)}`, ''];
  for (const lang of LANGS) {
    out.push(`## ${L[lang].lang}`, '');
    for (const v of views(raw, lang)) {
      const title = v.caseView ? one(v.caseView.data.client) : v.page === 'home' ? (one(v.settings.metaTitle) || ENTITY) : v.pageTitle;
      out.push(`### ${title}`, `${abs(pagePath(lang, v.page, v.caseView?.slug))}`, '', pageSummary(v), '', ...pageText(v), '');
    }
    out.push(`### ${L[lang].contact}`, '', ...contactLines(views(raw, lang)[0]), '');
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
