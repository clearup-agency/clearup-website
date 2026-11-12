import { storyEmbed } from './cdn';

/* The public site's "empty = hidden" rules, in one place (pure, shared by the pages, the admin preview and the
   tests). The admin preview shows everything (striped where it is hidden from visitors); visitors only see
   what is real and filled. */

type Raw = Record<string, any>;
const PH = /\[[^\]]*\]/;

/** Removes every placeholder: a text with [square brackets] becomes '' (so its element is left out), and a
 *  list of texts drops the empty ones. Objects keep their shape. Used on the public pages only. */
export function scrub<T>(v: T): T {
  if (typeof v === 'string') return (PH.test(v) ? '' : v) as unknown as T;
  if (Array.isArray(v)) {
    const out = v.map((x) => scrub(x));
    return (v.every((x) => typeof x === 'string') ? out.filter((x) => typeof x === 'string' && x.trim()) : out) as unknown as T;
  }
  if (!v || typeof v !== 'object') return v;
  const out: Raw = {};
  for (const [k, x] of Object.entries(v as Raw)) out[k] = k.startsWith('_') ? x : scrub(x);
  return out as T;
}

/* ——— client stories ——— */
/** The section's starting sample clients (clearly-labelled placeholders on Cloudinary, see stories-sample.ts). */
export const isSampleClient = (c: Raw | null | undefined): boolean => {
  if (!c) return false;
  const logo = String(c.logo?.src || c.logo?.url || '');
  if (logo.includes('/stories-sample/')) return true;
  const items: Raw[] = Array.isArray(c.items) ? c.items : [];
  return items.length > 0 && items.every((it) => String(it?.image?.src || it?.image?.url || it?.video?.url || it?.video || '').includes('/stories-sample/'));
};
const mediaOf = (it: Raw | null | undefined) => !!it && !!(it.video?.url || (typeof it.video === 'string' && it.video) || it.image?.src || it.image?.url || storyEmbed(it.link));
export const storyWorks = (c: Raw | null | undefined): number => (Array.isArray(c?.items) ? c!.items.filter(mediaOf).length : 0);

/** When the stories section shows: at least STORIES_MIN_CLIENTS real clients with at least STORIES_MIN_WORKS
 *  works each. Since Nov 8, 2026 (Mohamed: the stories should show) that is one real client with one work —
 *  the old «3 clients × 2 works» wait is gone. Sample clients never count and never show. */
export const STORIES_MIN_CLIENTS = 1;
export const STORIES_MIN_WORKS = 1;
export function storiesForVisitors(clients: Raw[] | null | undefined): { show: boolean; clients: Raw[]; ready: number } {
  const real = (clients ?? []).filter((c) => c && !isSampleClient(c) && storyWorks(c) > 0);
  const ready = real.filter((c) => storyWorks(c) >= STORIES_MIN_WORKS).length;
  const show = ready >= STORIES_MIN_CLIENTS;
  return { show, clients: show ? real : [], ready };
}

/* ——— FAQ ——— */
/** An answer with its [placeholder] parts taken out and the punctuation around them tidied:
 *  «[نطاق يحدده ClearUp]، والسعر النهائي بعد المكالمة.» → «والسعر النهائي بعد المكالمة.» Nothing is added. */
export function faqAnswer(a: unknown): string {
  if (typeof a !== 'string') return '';
  const lead = /^\s*\[[^\]]*\]/.test(a); // the answer opened with the placeholder
  let t = a.replace(/\[[^\]]*\]/g, ' ');
  t = t.replace(/\s+([،,.;:؛!?؟])/g, '$1') // no space before punctuation
    .replace(/([،,.;:؛])(?:\s*[،,.;:؛])+/g, '$1') // ". ." / "، ." left by a removed part → one mark
    .replace(/^[\s،,.;:؛\-—–]+/, '') // nothing left before the first word
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!/[\p{L}\p{N}]/u.test(t)) return '';
  // «[…]، والسعر …» → «السعر …»; "[…], and the price …" → "The price …"
  if (lead) t = t.replace(/^و(?=ال)/, '').replace(/^and\s+/i, '');
  // English: a sentence that now starts with a small letter starts with a capital
  return t.replace(/^[a-z]/, (c) => c.toUpperCase());
}
/** Every question that has a real question; its answer shown without the [placeholder] parts (Mohamed, Nov 8, 2026:
 *  all the old questions back, he edits the answers later). A question whose answer is nothing but a placeholder
 *  still hides; at most `limit`. */
export function faqItems(items: Raw[] | null | undefined, limit?: number): Raw[] {
  const ok = (items ?? [])
    .filter((it) => it && typeof it.q === 'string' && it.q.trim() && !PH.test(it.q))
    .map((it) => ({ ...it, a: faqAnswer(it.a) }))
    .filter((it) => it.a);
  return limit && limit > 0 ? ok.slice(0, limit) : ok;
}

/* ——— section numbers ——— */
/** The small «01 / 02 …» numbers before section titles, renumbered in page order over the sections that
 *  show one, so they always run 01, 02, 03 whatever the order or which sections are hidden. */
export function sectionNumbers(sections: { data: Raw }[]): (string | null)[] {
  let n = 0;
  return sections.map((s) => {
    if (typeof s.data?.index !== 'string' || !s.data.index.trim()) return null;
    n += 1;
    return String(n).padStart(2, '0');
  });
}

/* ——— testimonials & client pages ——— */
/** The figure a testimonial card leads with: the client's first filled result (number + what it measures). */
export function leadMetric(metrics: Raw[] | null | undefined): { v: string; l: string } | null {
  const m = (metrics ?? []).find((x) => x && typeof x.v === 'string' && x.v.trim() && typeof x.l === 'string' && x.l.trim() && !PH.test(x.v) && !PH.test(x.l));
  return m ? { v: m.v, l: m.l } : null;
}

/** Does the client page have more than the testimonial (the challenge, what we did, results, works)? Only
 *  then does a card offer «القصة كاملة». */
export function hasStory(d: Raw | null | undefined): boolean {
  if (!d) return false;
  const f = (v: unknown) => typeof v === 'string' && !!v.trim() && !PH.test(v);
  return f(d.problem) || f(d.solution) || f(d.result) || (Array.isArray(d.did) && d.did.some(f))
    || !!leadMetric(d.metrics) || (Array.isArray(d.works) && d.works.length > 0);
}

const mediaKey = (u: unknown): string => {
  const s = String(u || '').trim();
  if (!s) return '';
  const e = storyEmbed(s);
  if (e) return e.kind + ':' + e.id;
  return s.replace(/[?#].*$/, '').replace(/\.(webp|jpe?g|png|mp4|mov|webm)$/i, '').replace(/\/upload\/[^/]*\//, '/upload/');
};
/** True when a client page's cover is the testimonial video itself (or its poster): then the cover is dropped
 *  so the same video never shows twice on one page. */
export function sameMedia(cover: Raw | null | undefined, video: Raw | null | undefined): boolean {
  if (!cover || !video) return false;
  const c = mediaKey(cover.src || cover.url);
  if (!c) return false;
  const v = [video.image?.src, video.image?.url, video.link, video.video?.url, typeof video.video === 'string' ? video.video : ''].map(mediaKey).filter(Boolean);
  return v.includes(c);
}

/* ——— WhatsApp ——— */
export const WA_TEXT = {
  ar: 'مرحباً ClearUp، أريد حجز مكالمة مجانية لمعرفة كيف أحسّن تسويقي.',
  en: 'Hi ClearUp, I’d like to book a free call about my marketing.',
};
/** A wa.me link that opens WhatsApp with a ready message (in the page's language). */
export function waWithText(link: string | null | undefined, lang: 'ar' | 'en' | string): string {
  if (!link) return '';
  if (/[?&]text=/.test(link)) return link;
  const t = WA_TEXT[lang === 'en' ? 'en' : 'ar'];
  return link + (link.includes('?') ? '&' : '?') + 'text=' + encodeURIComponent(t);
}

/* ——— numbers ——— */
/** «8×» typed in Arabic shows mirrored («×8») inside right-to-left text: a figure with a times sign keeps its
 *  typed order (left-to-right, isolated); other figures follow the page as before. */
export const numDir = (v: unknown): 'ltr' | undefined => (typeof v === 'string' && /[×✕]/.test(v) ? 'ltr' : undefined);
