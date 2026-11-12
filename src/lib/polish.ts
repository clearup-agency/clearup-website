import type { ContentSnapshot, SectionRow } from '@/db/schema';

/* The site-polish copy pass (Nov 2026, from the site review), as one pure, idempotent transform of the
   content: the new hero wording, «آراء العملاء», the booking promise, Arabic for the English left inside /ar,
   and the new home order (hero → logos → problem → system → stories → testimonials → 3 questions → book).

   A text is replaced ONLY while it still holds the old wording below, so anything the admin has written
   himself is never touched, and running it twice changes nothing the second time. Used by:
   - fromLegacy (the code defaults, when the database is empty / the static build),
   - scripts/polish-content.mjs (prints the differences for a database; writes them only with --apply). */

type Raw = Record<string, any>;
type Change = { where: string; field: string; from: unknown; to: unknown };
const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const ls = (ar: string, en: string) => ({ _type: 'localeString', ar, en });

export const PROMISE = {
  ar: '30 دقيقة، تخرج منها بأكبر 3 تسريبات في تسويقك، سواء عملت معنا أو لا.',
  en: '30 minutes. You leave with the 3 biggest leaks in your marketing, whether you work with us or not.',
};
const OLD_PROMISE = { ar: ['نرد خلال 24 ساعة [وعد يؤكده ClearUp]'], en: ['We reply within 24 hours [promise to be confirmed by ClearUp]'] };

/** Real team names (from clearupagency.com/about) → fictional placeholder names: [ar, en, new ar, new en]. */
export const TEAM_PLACEHOLDERS: [string, string, string, string][] = [
  ['يحيى أبو ندى', 'Yahya Abunada', 'سامر خليل', 'Samer Khalil'],
  ['عهد عيد', 'Ahed Eid', 'ريم حسن', 'Reem Hassan'],
  ['حازم هنداوي', 'Hazem Hendawi', 'كريم يوسف', 'Kareem Yousef'],
  ['مجد أبو سكران', 'Majd Abu Sakran', 'مالك عمر', 'Malek Omar'],
  ['لينا الشرفا', 'Lina Alshurafa', 'سارة نبيل', 'Sara Nabil'],
  ['رواء أبو العور', 'Rewaa Abo Alawar', 'ليان فارس', 'Layan Fares'],
  ['دانا عيد', 'Dana Eid', 'هبة مراد', 'Heba Murad'],
  ['عبد الرحمن أبو وردة', 'Abedalrahman Abuwarda', 'عمر ناصر', 'Omar Nasser'],
];

/** [section type, page or '*', dotted field path, old ar values, new ar, old en values, new en] */
type Rule = { type: string; page: string; path: string; ar?: [string[], string]; en?: [string[], string]; prefix?: boolean };
export const COPY_RULES: Rule[] = [
  // hero: who we are and what you get, in plain words; the booking call is free
  { type: 'heroSection', page: 'home', path: 'kicker', ar: [['للرؤساء التنفيذيين الشجعان فقط'], 'وكالة تسويق ونمو'], en: [['For Courageous CEOs Only'], 'Marketing & growth agency'] },
  { type: 'heroSection', page: 'home', path: 'lead',
    ar: [['نحوّل ميزانية التسويق في الشركات الصغيرة والمتوسطة إلى نظام نمو واضح يمكن قياسه، من الاستراتيجية حتى لوحة الأرقام.'], 'نحوّل ميزانية تسويقك إلى نظام يجلب لك عملاء، وتعرف بالأرقام من أين جاء كل عميل.'],
    en: [['We turn an SME’s marketing budget into one clear, measurable growth system — from strategy all the way to the numbers dashboard.'], 'We turn your marketing budget into a system that brings you customers, and you know by the numbers where every customer came from.'] },
  { type: 'heroSection', page: 'home', path: 'system', ar: [['The Clear Up System™'], 'نظام ClearUp للنمو'] },
  { type: 'heroSection', page: 'home', path: 'note', ar: [['مكالمة 30 دقيقة · بدون التزام'], 'مكالمة مجانية 30 دقيقة · بدون التزام'], en: [['30-minute call · no commitment'], 'Free 30-minute call · no commitment'] },
  // «الدليل قبل الادعاء» → «آراء العملاء»: what clients said, with their names
  { type: 'proofSection', page: 'home', path: 'eyebrow', ar: [['النتائج'], 'آراء العملاء'], en: [['Results'], 'What clients say'] },
  { type: 'proofSection', page: 'home', path: 'title', ar: [['الدليل قبل الادعاء.'], 'نتائج بأسماء أصحابها.'], en: [['Proof before claims.'], 'Results, with the names behind them.'] },
  { type: 'proofSection', page: 'home', path: 'lead',
    ar: [['كل رقم هنا مربوط باسم عميل وفترة زمنية. ما لم يتوفر بعد، تركناه فارغاً بوضوح.'], 'كل رقم هنا مربوط باسم عميل وفترة زمنية.'],
    en: [['Every number here is tied to a client name and a time period. Where we don’t have it yet, we left it visibly blank.'], 'Every number here is tied to a client name and a time period.'] },
  // the booking promise next to every «book» button
  { type: 'ctaBandSection', page: '*', path: 'lead', ar: [OLD_PROMISE.ar, PROMISE.ar], en: [OLD_PROMISE.en, PROMISE.en] },
  { type: 'finalCtaSection', page: '*', path: 'promise', ar: [OLD_PROMISE.ar, PROMISE.ar], en: [OLD_PROMISE.en, PROMISE.en] },
  // Arabic inside /ar (the brand name ClearUp stays)
  { type: 'systemSection', page: '*', path: 'eyebrow', ar: [['The Clear Up System™'], 'نظام ClearUp'] },
  { type: 'pageHeadSection', page: 'services', path: 'title', ar: [['The Clear Up System™'], 'نظام ClearUp للنمو'] },
  { type: 'caseStudy', page: '*', path: 'did.*', ar: [['حسّنّا الإعلانات عبر Sprints'], 'حسّنّا الإعلانات عبر دورات تحسين قصيرة'] },
  { type: 'founderSection', page: '*', path: 'role', ar: [['المؤسس · Head of Growth'], 'المؤسس · مسؤول النمو'] },
  { type: 'founderSection', page: '*', path: 'body', ar: [['مدرّب Growth Marketing، ويعمل مع'], 'مدرّب في تسويق النمو، ويعمل مع'], prefix: true },
  // About's opening line had no name before «مدرّب …»: neutral wording, nobody invented
  { type: 'pageHeadSection', page: 'about', path: 'lead', ar: [['مدرّب Growth Marketing، ويعمل مع'], 'نعمل مع'], en: [['A growth-marketing coach who works with'], 'We work with'], prefix: true },
  { type: 'teamSection', page: '*', path: 'members.*.role', ar: [['CTO'], 'المدير التقني'] },
  { type: 'teamSection', page: '*', path: 'members.*.role#2', ar: [['CIO'], 'مدير المعلومات'] },
  // About: no real people's names on the team (Mohamed, Nov 8, 2026: «حط أي أسماء وهمية») — each real name from
  // their old site becomes a made-up placeholder name; the roles stay. A name the admin types himself is kept.
  ...TEAM_PLACEHOLDERS.map(([ar, en, toAr, toEn], i): Rule => ({ type: 'teamSection', page: '*', path: `members.*.name#${i + 1}`, ar: [[ar], toAr], en: [[en], toEn] })),
];
export const SETTINGS_RULES: Rule[] = [
  { type: 'settings', page: '', path: 'metaTitle', ar: [['ClearUp — للرؤساء التنفيذيين الشجعان فقط'], 'ClearUp — وكالة تسويق ونمو'], en: [['ClearUp — For Courageous CEOs Only'], 'ClearUp — Marketing & growth agency'] },
  { type: 'settings', page: '', path: 'chatbot.faq.*.q', ar: [['كيف تعملون؟ ما هو The Clear Up System؟'], 'كيف تعملون؟ ما هو نظام ClearUp؟'] },
  { type: 'settings', page: '', path: 'chatbot.faq.*.a', ar: [['المؤسس عبد المنعم (Head of Growth)، مدرّب Growth Marketing'], 'المؤسس عبد المنعم (مسؤول النمو)، مدرّب في تسويق النمو'], prefix: true },
];

/** All the {ar,en} texts at a dotted path (`*` = every item of a list). */
function targets(obj: Raw, path: string): { parent: Raw; key: string | number; label: string }[] {
  const parts = path.replace(/#\d+$/, '').split('.');
  let cur: { node: any; label: string }[] = [{ node: obj, label: '' }];
  const out: { parent: Raw; key: string | number; label: string }[] = [];
  parts.forEach((p, i) => {
    const last = i === parts.length - 1;
    const next: { node: any; label: string }[] = [];
    for (const c of cur) {
      if (!c.node || typeof c.node !== 'object') continue;
      const keys: (string | number)[] = p === '*' ? (Array.isArray(c.node) ? c.node.map((_: unknown, k: number) => k) : []) : [p];
      for (const k of keys) {
        const label = c.label ? `${c.label}.${k}` : String(k);
        if (last) out.push({ parent: c.node, key: k, label });
        else next.push({ node: c.node[k], label });
      }
    }
    cur = next;
  });
  return out;
}

function applyRule(obj: Raw, r: Rule, where: string, changes: Change[]) {
  for (const t of targets(obj, r.path)) {
    const v = t.parent[t.key as any];
    if (!v || typeof v !== 'object') continue;
    for (const lang of ['ar', 'en'] as const) {
      const rule = r[lang];
      const cur = v[lang];
      if (!rule || typeof cur !== 'string') continue;
      const [olds, to] = rule;
      for (const old of olds) {
        const hit = r.prefix ? cur.startsWith(old) : cur.trim() === old;
        if (!hit) continue;
        const next = r.prefix ? to + cur.slice(old.length) : to;
        if (next === cur) break;
        changes.push({ where, field: `${t.label}.${lang}`, from: cur, to: next });
        v[lang] = next;
        break;
      }
    }
  }
}

const OLD_STATS = ['100+', '28', '$4.7M+'];
/** The hero's three unconfirmed figures (100+ brands · 28 countries · $4.7M+, all marked «من موقعهم») become
 *  ONE result that is already on the site: Al Noon Digital's 8× ROI in 60 days (its client page). Only when the
 *  three are still exactly those and the case still states both numbers; otherwise nothing changes. */
function heroStat(sections: SectionRow[], changes: Change[]) {
  const hero = sections.find((s) => s.type === 'heroSection' && (s.page || 'home') === 'home');
  const stats = (hero?.data as Raw | undefined)?.stats;
  if (!hero || !Array.isArray(stats) || stats.length !== 3) return;
  if (!stats.every((x: Raw, i: number) => x?.v?.ar === OLD_STATS[i] && x?.src === 'site')) return;
  const noon = sections.find((s) => s.type === 'caseStudy' && (s.data as Raw)?.slug === 'al-noon-digital');
  const m: Raw[] = ((noon?.data as Raw)?.metrics ?? []) as Raw[];
  const roi = m.find((x) => x?.v?.ar === '8×');
  const days = m.find((x) => x?.v?.ar === '60');
  if (!roi || !days) return;
  const client = (noon!.data as Raw).client ?? ls('النون للحلول الرقمية', 'Al Noon Digital');
  const next = [{
    _key: 'kstatnoon', _type: 'stat', src: 'case', v: ls('8×', '8×'),
    l: ls(`نمو العائد على الاستثمار لـ«${client.ar}» خلال 60 يوماً`, `growth in ROI for ${client.en} in 60 days`),
  }];
  changes.push({ where: `home/heroSection ${hero.id}`, field: 'stats', from: stats.map((x: Raw) => `${x.v?.ar} ${x.l?.ar}`).join(' · '), to: `8× ${next[0].l.ar}` });
  (hero.data as Raw).stats = next;
}

export const HOME_FAQ_ID = 'kfaqhome';
/** The new home order: services teaser hidden (its four groups live on Services), stories just before the
 *  testimonials, then the site's one FAQ (the same questions as Services — Nov 8, 2026: one component, one
 *  source), then the closing «book» band. */
function homeOrder(sections: SectionRow[], changes: Change[]): SectionRow[] {
  const on = (s: SectionRow) => (s.page || 'home') === 'home';
  let out = sections.slice();
  const teaser = out.find((s) => on(s) && s.type === 'servicesTeaserSection');
  if (teaser && !teaser.hidden) { teaser.hidden = true; changes.push({ where: `home/servicesTeaserSection ${teaser.id}`, field: 'hidden', from: false, to: true }); }
  const idx = (pred: (s: SectionRow) => boolean) => out.findIndex(pred);
  const proofI = idx((s) => on(s) && s.type === 'proofSection');
  const storiesI = idx((s) => on(s) && s.type === 'clientStoriesSection');
  if (proofI >= 0 && storiesI > proofI) {
    const [st] = out.splice(storiesI, 1);
    out.splice(proofI, 0, st);
    changes.push({ where: `home/clientStoriesSection ${st.id}`, field: 'position', from: 'after the testimonials', to: 'just before the testimonials' });
  }
  if (!out.some((s) => on(s) && s.type === 'faqSection')) {
    const src = out.find((s) => s.page === 'services' && s.type === 'faqSection');
    const d = (src?.data ?? {}) as Raw;
    if (Array.isArray(d.items) && d.items.length) {
      const faq: SectionRow = { id: HOME_FAQ_ID, page: 'home', type: 'faqSection', hidden: false, data: { ...clone(d), anchor: 'faq' } };
      // after the testimonials (and the stories), before the closing band
      const proof = idx((s) => on(s) && s.type === 'proofSection');
      const band = idx((s) => on(s) && s.type === 'ctaBandSection');
      const at = proof >= 0 ? proof + 1 : band >= 0 ? band : out.filter(on).length;
      out = [...out.slice(0, at), faq, ...out.slice(at)];
      changes.push({ where: `home/faqSection ${HOME_FAQ_ID}`, field: '(new section)', from: null, to: `the Services FAQ on Home too (the same ${d.items.length} questions — one FAQ for the whole site, lib/view.ts sharedSource)` });
    }
  }
  return out;
}

/** The whole pass. Returns the polished copy (the input is not modified) and the list of what changed. */
export function polishContent(c: ContentSnapshot): { content: ContentSnapshot; changes: Change[] } {
  const changes: Change[] = [];
  const settings = clone((c.settings ?? {}) as Raw);
  const sections = clone(c.sections ?? []) as SectionRow[];
  for (const r of SETTINGS_RULES) applyRule(settings, r, 'settings', changes);
  for (const s of sections) {
    const page = s.page || 'home';
    for (const r of COPY_RULES) {
      if (r.type !== s.type || (r.page !== '*' && r.page !== page)) continue;
      applyRule(s.data as Raw, r, `${page}/${s.type} ${s.id}`, changes);
    }
  }
  heroStat(sections, changes);
  const ordered = homeOrder(sections, changes);
  return { content: { ...c, settings, sections: ordered }, changes };
}
