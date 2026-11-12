/* The site chatbot's brain — pure code, no network, shared by the visitor widget (browser), the admin
   preview and the optional AI route. Answers come from the knowledge base the admin edits
   («إعدادات الموقع» → الشات بوت): each entry has a question, other phrasings / keywords (one per line),
   an answer and an optional button, in Arabic and English. Matching is fuzzy and dialect-aware. */

import { DEFAULT_CHATBOT } from '@/content/chatbot';

export type BotLang = 'ar' | 'en';
export type BotQA = { id: string; i: number; q: string; a: string; link?: { label: string; href: string }; phrases: string[] };
export type BotView = {
  enabled: boolean; lang: BotLang; name: string; avatar: string | null; greeting: string;
  side: 'left' | 'right'; chips: string[]; faq: BotQA[]; fallback: string;
  whatsapp: string; bookHref: string; ai: boolean;
};
export type Match = { qa: BotQA; score: number } | null;
export type Answer =
  | { kind: 'qa'; qa: BotQA; score: number }
  | { kind: 'smalltalk'; text: string }
  | { kind: 'none'; suggestions: BotQA[] };

/* ——— Arabic / English normalisation ——— */

const TASHKEEL = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const AR_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;

/** Lower-case, no diacritics/tatweel, one form of alef / taa marbuta / yaa / hamza carriers, western digits. */
export function normalize(input: string): string {
  return String(input ?? '')
    .toLowerCase()
    .replace(TASHKEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(AR_DIGITS, (d) => String((d.charCodeAt(0) & 0xf) % 10))
    .replace(/['’`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set((
  // Arabic (already normalised): question words, pronouns, particles, fillers (MSA + Levantine/Gulf/Egyptian)
  'في من على عن الى الي لـ هل ما ماذا شو ايش اش وش ليش لماذا كيف كيفاش متى امتى ايمتى انا انتو انتم انت انتي انتوا نحن احنا ' +
  'عندكم عندك عنكم لكم لك له هو هي هم هذا هاد هادا هذه هاي هيك يا و او ثم لو اذا ان انه انو كان بدي بدنا بدك ممكن لازم اريد اود ' +
  'عايز عاوز حابب حاب ابغى ابي نبي مع كل اي شي شيء يعني طيب تمام لو سمحت سمحت رجاء ارجو من فضلك فضلك بس كمان برضو ايضا ' +
  'اليوم يوم هلا هلق هلأ الحين بالزبط زبط بالضبط بالظبط قد لقد تم الذي التي اللي يلي هل عندي معكم معك انكم انك كم ' +
  // English
  'the a an is are am was were do does did you your yours i me my we our us to of in on at for and or what whats how when which ' +
  'can could would will should shall be it its this that there with about please pls hi hello hey tell want wanna know any have has ' +
  'get got just so some much many if from by as'
).split(' ').map((w) => normalize(w)));
// "much" and "كم" stay meaningful through the synonyms below (how much → price)
STOP.delete('much');

/** Words that mean the same thing (dialect / spelling / language) → one token. */
const SYN: Record<string, string[]> = {
  _price: ['سعر', 'اسعار', 'السعر', 'الاسعار', 'تكلفه', 'التكلفه', 'تكاليف', 'كلفه', 'الكلفه', 'فلوس', 'مبلغ', 'باقه', 'باقات', 'الباقه', 'الباقات', 'package', 'packages', 'بكم', 'بكام', 'كام', 'تكلف', 'بتكلف', 'يكلف', 'price', 'prices', 'pricing', 'cost', 'costs', 'fee', 'fees', 'rate', 'rates', 'much', 'expensive', 'cheap', 'غالي', 'رخيص'],
  _howmuch: ['قديش', 'اديش', 'بقديش', 'قدي', 'adesh', 'kadesh'],
  _abroad: ['برا', 'بره', 'خارج', 'abroad', 'international', 'overseas', 'outside', 'remote', 'remotely', 'اونلاين', 'online'],
  _start: ['بلش', 'نبلش', 'بنبلش', 'ابلش', 'بلشنا', 'نبدا', 'ابدا', 'بدء', 'البدء', 'بدايه', 'البدايه', 'نبتدي', 'ابتدي', 'start', 'begin', 'started', 'starting', 'onboard', 'onboarding'],
  _where: ['وين', 'فين', 'اين', 'مكان', 'مكانكم', 'موقعكم', 'عنوان', 'عنوانكم', 'مقر', 'مقركم', 'where', 'location', 'located', 'address', 'based'],
  _contact: ['تواصل', 'اتواصل', 'نتواصل', 'التواصل', 'كلمكم', 'اكلمكم', 'contact', 'reach'],
  _whatsapp: ['واتساب', 'واتس', 'وتساب', 'الواتساب', 'whatsapp', 'whats', 'wa'],
  _service: ['خدمات', 'خدماتكم', 'الخدمات', 'خدمه', 'service', 'services', 'offer', 'offers'],
  _ads: ['اعلانات', 'الاعلانات', 'اعلان', 'ممول', 'ممولة', 'ads', 'ad', 'advertising', 'paid'],
  _guarantee: ['ضمان', 'تضمنوا', 'بتضمنوا', 'تضمنون', 'مضمون', 'guarantee', 'guaranteed', 'guarantees'],
  _results: ['نتايج', 'نتائج', 'النتايج', 'النتائج', 'نتيجه', 'results', 'result'],
  _time: ['مده', 'المده', 'وقت', 'الوقت', 'يستغرق', 'بياخد', 'تاخد', 'long', 'duration', 'timeline'],
  _call: ['مكالمه', 'المكالمه', 'استشاره', 'الاستشاره', 'call', 'consultation'],
  _team: ['فريق', 'الفريق', 'فريقكم', 'team'],
  _founder: ['مؤسس', 'المؤسس', 'founder', 'owner'],
  _report: ['تقارير', 'تقرير', 'report', 'reports', 'reporting'],
};
const SYN_OF = new Map<string, string>();
for (const [k, list] of Object.entries(SYN)) for (const w of list) SYN_OF.set(normalize(w), k);

/** Everyday verbs ("do you work / make / offer…") — they count, but little, so they don't decide a match alone. */
const WEAK = new Set(['بتعملوا', 'تعملوا', 'تعملون', 'بتعملو', 'بتقدموا', 'تقدموا', 'تقدمون', 'بتقدمو', 'بتشتغلوا', 'تشتغلوا', 'تشتغلون', 'بتشتغلو', 'تسوون', 'بتسوو', 'work', 'run', 'make', 'build', 'help', 'see'].map((w) => normalize(w)));

const AR_PRE = ['وبال', 'وال', 'بال', 'فال', 'كال', 'لل', 'ال'];
const AR_SUF = ['كم', 'هم', 'ها', 'نا', 'ات', 'ون', 'ين'];

/** One word → its comparable form (synonym group, else a light stem). */
export function stem(w: string): string {
  const syn = SYN_OF.get(w);
  if (syn) return syn;
  let x = w;
  if (/[\u0600-\u06FF]/.test(x)) {
    for (const p of AR_PRE) if (x.startsWith(p) && x.length - p.length >= 2) { x = x.slice(p.length); break; }
    if (SYN_OF.has(x)) return SYN_OF.get(x)!;
    for (const s of AR_SUF) if (x.endsWith(s) && x.length - s.length >= 3) { x = x.slice(0, -s.length); break; }
    if (SYN_OF.has(x)) return SYN_OF.get(x)!;
  } else if (/^[a-z]+$/.test(x)) {
    if (x.length > 5 && x.endsWith('ing')) x = x.slice(0, -3);
    else if (x.length > 4 && x.endsWith('ies')) x = x.slice(0, -3) + 'y';
    else if (x.length > 4 && x.endsWith('es') && /(ch|sh|x|ss)es$/.test(x)) x = x.slice(0, -2);
    else if (x.length > 3 && x.endsWith('s') && !x.endsWith('ss')) x = x.slice(0, -1);
    if (SYN_OF.has(x)) return SYN_OF.get(x)!;
  }
  // a typo of a known word ("servcies", "الخدمت") still counts as that word
  if (w.length >= 5) for (const [k, v] of SYN_OF) if (k.length >= 5 && dist(w, k, w.length >= 8 ? 2 : 1) <= (w.length >= 8 ? 2 : 1)) return v;
  return x;
}

/** A text → its meaningful, comparable tokens (stop words out). */
export function tokens(text: string): string[] {
  const out: string[] = [];
  for (const w of normalize(text).split(' ')) {
    if (!w) continue;
    if (STOP.has(w) && !SYN_OF.has(w)) continue;
    // a leading "و" (and) on an Arabic word: drop it when the rest is a known word or long enough
    let x = w;
    if (/^و[\u0600-\u06FF]{3,}$/.test(x) && !SYN_OF.has(x)) {
      const rest = x.slice(1);
      if (SYN_OF.has(rest) || rest.length >= 4) x = rest;
      if (STOP.has(x)) continue;
    }
    const t = stem(x);
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

/** Damerau-free Levenshtein distance, stopping early above `max`. */
function dist(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** How well a query word matches a knowledge-base word: 1 exact, <1 fuzzy (typos, prefixes), 0 not. */
export function wordMatch(q: string, k: string): number {
  if (q === k) return 1;
  if (q.startsWith('_') || k.startsWith('_')) return 0;
  const n = Math.min(q.length, k.length);
  if (n >= 4 && (q.startsWith(k) || k.startsWith(q))) return 0.85;
  if (n >= 4) {
    const max = n >= 7 ? 2 : 1;
    const d = dist(q, k, max);
    if (d <= max) return d === 1 ? 0.8 : 0.65;
  }
  return 0;
}

type Indexed = { qa: BotQA; bag: string[]; phrases: string[][] };
export type Index = { items: Indexed[]; idf: Map<string, number>; maxIdf: number; exact: Map<string, BotQA> };

export function buildIndex(faq: BotQA[]): Index {
  const items = faq.map((qa) => {
    const phrases = [qa.q, ...qa.phrases].map(tokens).filter((p) => p.length);
    return { qa, phrases, bag: [...new Set(phrases.flat())] };
  });
  const df = new Map<string, number>();
  for (const it of items) for (const t of it.bag) df.set(t, (df.get(t) ?? 0) + 1);
  const N = Math.max(1, items.length);
  const idf = new Map<string, number>();
  for (const [t, d] of df) idf.set(t, Math.log(1 + N / d));
  // a question typed exactly as one of the phrasings (even one made only of small words: "what do you do")
  const exact = new Map<string, BotQA>();
  for (const qa of faq) for (const p of [qa.q, ...qa.phrases]) { const k = normalize(p); if (k && !exact.has(k)) exact.set(k, qa); }
  return { items, idf, maxIdf: Math.log(1 + N), exact };
}

const best = (q: string, words: string[]) => { let m = 0; for (const w of words) { const s = wordMatch(q, w); if (s > m) m = s; if (m === 1) break; } return m; };

/** Scores every entry for the query; best first. */
export function rank(index: Index, query: string): { qa: BotQA; score: number }[] {
  const q = tokens(query);
  if (!q.length) return [];
  const w = (t: string) => (index.idf.get(t) ?? index.maxIdf) * (WEAK.has(t) ? 0.35 : 1);
  const total = q.reduce((s, t) => s + w(t), 0);
  const out: { qa: BotQA; score: number }[] = [];
  for (const it of index.items) {
    let m = 0;
    for (const t of q) { const s = best(t, it.bag); if (s) m += s * w(t); }
    if (!m) continue;
    const qcov = m / total;
    // the closest single phrasing (so "how much" beats an entry that merely mentions "much" somewhere)
    let pf = 0;
    for (const p of it.phrases) {
      let hitQ = 0;
      for (const t of q) if (best(t, p)) hitQ++;
      let hitP = 0;
      for (const t of p) if (best(t, q)) hitP++;
      if (!hitQ) continue;
      const P = hitQ / q.length, R = hitP / p.length;
      pf = Math.max(pf, (2 * P * R) / (P + R));
    }
    out.push({ qa: it.qa, score: +(0.6 * qcov + 0.4 * pf).toFixed(3) });
  }
  return out.sort((a, b) => b.score - a.score);
}

export const THRESHOLD = 0.55;

const GREET = /^(مرحبا|مرحبتين|اهلا|اهلين|هلا|هلو|السلام عليكم|سلام|صباح الخير|مساء الخير|hi|hello|hey|hiya|good (morning|evening|afternoon)|salam)( .*)?$/;
const THANKS = /^(شكرا|شكرا جزيلا|يعطيك العافيه|مشكور|مشكورين|تسلم|ثانكس|thanks|thank you|thx|ty|great thanks|ok thanks)( .*)?$/;

/** The answer for a visitor's message: an entry, a greeting / thank-you, or nothing (with near misses). */
export function answer(index: Index, query: string, lang: BotLang): Answer {
  const n = normalize(query);
  const hit = index.exact.get(n);
  if (hit) return { kind: 'qa', qa: hit, score: 1 };
  const ranked = rank(index, query);
  const top = ranked[0];
  if (top && top.score >= THRESHOLD) return { kind: 'qa', qa: top.qa, score: top.score };
  if (n && n.split(' ').length <= 4 && GREET.test(n)) return { kind: 'smalltalk', text: lang === 'ar' ? 'أهلاً وسهلاً! كيف أقدر أساعدك؟ اختر سؤالاً من الأسئلة أو اكتب سؤالك.' : 'Hi there! How can I help? Pick a question or type your own.' };
  if (n && n.split(' ').length <= 5 && THANKS.test(n)) return { kind: 'smalltalk', text: lang === 'ar' ? 'العفو! إذا احتجت أي شيء ثاني أنا هنا 🙌' : 'You’re welcome! I’m here if you need anything else 🙌' };
  return { kind: 'none', suggestions: ranked.filter((r) => r.score >= 0.3).slice(0, 3).map((r) => r.qa) };
}

/* ——— settings → what the widget needs, in one language ——— */

type Raw = Record<string, any>;
const pick = (v: any, lang: BotLang): string => {
  if (!v || typeof v !== 'object') return typeof v === 'string' ? v : '';
  const s = String(v[lang] ?? '').trim();
  return s || String(v.ar ?? '').trim();
};
const lines = (v: any): string[] => {
  const o = v && typeof v === 'object' ? v : {};
  return [o.ar, o.en].flatMap((x) => String(x ?? '').split(/\n|،|,|;|؛/)).map((x) => x.trim()).filter(Boolean);
};

/** The chatbot settings (or the defaults when the admin never saved any). */
export const chatbotRaw = (settings: Raw | null | undefined): Raw =>
  settings && settings.chatbot && typeof settings.chatbot === 'object' ? settings.chatbot : DEFAULT_CHATBOT;

/** Settings → the widget's view in one language. `ai` here is the admin's switch; the page also needs a
 *  server key (GEMINI_API_KEY / GROQ_API_KEY) before anything is sent to an AI. */
export function chatView(settings: Raw | null | undefined, lang: BotLang, links: { whatsapp: string; bookHref?: string }): BotView {
  const c = chatbotRaw(settings);
  const faq: BotQA[] = (Array.isArray(c.faq) ? c.faq : []).map((x: Raw, i: number) => {
    const a = pick(x?.a, lang);
    const href = String(x?.link ?? '').trim();
    const label = pick(x?.linkLabel, lang);
    return {
      id: String(x?._key ?? i), i, q: pick(x?.q, lang), a,
      ...(href && label ? { link: { label, href } } : {}),
      // both languages count when matching (a visitor may type English on the Arabic page, and vice versa)
      phrases: [...lines(x?.keys), String(x?.q?.ar ?? ''), String(x?.q?.en ?? '')].map((s) => s.trim()).filter(Boolean),
    };
  }).filter((x: BotQA) => x.q && x.a);
  const pos = c.position === 'left' || c.position === 'right' ? c.position : lang === 'ar' ? 'left' : 'right';
  return {
    enabled: c.enabled !== false,
    lang,
    name: pick(c.name, lang) || (lang === 'ar' ? 'مساعد ClearUp' : 'ClearUp Assistant'),
    avatar: typeof c.avatar?.url === 'string' && c.avatar.url ? c.avatar.url : null,
    greeting: pick(c.greeting, lang),
    side: pos,
    chips: (Array.isArray(c.chips) ? c.chips : []).map((x: Raw) => pick(x, lang)).filter(Boolean).slice(0, 8),
    faq,
    fallback: pick(c.fallback, lang),
    whatsapp: links.whatsapp,
    bookHref: links.bookHref || '#book',
    ai: c.ai !== false,
  };
}

/** A knowledge-base link → where it goes ("#whatsapp" is the site's WhatsApp). */
export const resolveHref = (href: string, v: Pick<BotView, 'whatsapp'>) => (href === '#whatsapp' ? v.whatsapp || '#book' : href);

/** The knowledge base as plain text (for the AI mode's grounding). */
export const kbText = (v: BotView) => v.faq.map((x) => `Q: ${x.q}\nA: ${x.a}`).join('\n\n');
