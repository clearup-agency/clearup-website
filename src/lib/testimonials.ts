import { filled } from './pages';
import type { PageCtx, Raw } from './view';

const txt = (v: unknown) => (filled(v) ? String(v).trim() : '');

/** How many testimonial videos «أعمالنا» lists at most, and Home's default count (Nov 9, 2026 — Mohamed: keep
 *  adding videos from the admin; Home shows a few, «أعمالنا» shows them all). */
export const TESTIMONIALS_MAX = 50;
export const HOME_TESTIMONIALS = 3;

export type TestimonialCard = ReturnType<typeof cardOf>;

function cardOf(c: PageCtx['cases'][number]) {
  const d = c.data as Raw;
  const did: string[] = Array.isArray(d.did) ? d.did.map(txt).filter(Boolean) : [];
  const solution = txt(d.solution) || did.join(' · ');
  const tt = (d.testimonial ?? {}) as Raw;
  const challenge = txt(d.problem);
  const quote = txt(tt.quote);
  // the card's one short line (Nov 8, 2026 — Mohamed: no long text under the video): the client's one-line
  // summary when written, else what the client said («رأي العميل»), else the challenge sentence; the rest opens
  // in «القصة كاملة»
  const short = txt(d.summary) || quote || challenge;
  // the id the admin's order and «يظهر بالرئيسية» switches use: the older case row's id when there is one (it
  // stays the same when that story moves into the «العملاء» list), else the client's own key
  const id = String(d.caseKey || c.key);
  const ids = [id, c.key, d.caseKey, d.storyKey].filter((x): x is string => typeof x === 'string' && !!x);
  return { key: c.key, id, ids, storyKey: typeof d.storyKey === 'string' ? d.storyKey : '', caseKey: typeof d.caseKey === 'string' ? d.caseKey : '', href: c.href, client: txt(d.client), person: txt(tt.name), role: txt(tt.role), video: d.tvideo as Raw, challenge, solution, short, quote, result: txt(d.result) };
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x) : []);

/** Every client's testimonial card: the client speaking on video, then the challenge and what ClearUp did — all
 *  read from the client record (the «العملاء» screen + the older case rows), written once. A client shows here
 *  when it has a video and a challenge, a solution or a quote; nothing is invented (an empty part is left out).
 *  `order` = the admin's drag order (ids); clients not in it keep the clients list's order, after it. */
export function testimonialCards(cases: PageCtx['cases'], order?: unknown) {
  const list = cases
    .filter((c) => !c.hidden && c.data.featured !== false && c.data.tvideo)
    .map(cardOf)
    .filter((c) => c.client && (c.challenge || c.solution || c.quote));
  return sortByOrder(list, order).slice(0, TESTIMONIALS_MAX);
}

/** Stable sort by the admin's order (a list of ids); anything not in it keeps its place after the ordered ones. */
export function sortByOrder<T extends { ids: string[] }>(list: T[], order?: unknown): T[] {
  const ord = strings(order);
  if (!ord.length) return list;
  const pos = (c: T) => { let best = Infinity; for (const id of c.ids) { const i = ord.indexOf(id); if (i >= 0 && i < best) best = i; } return best; };
  return list.map((c, i) => ({ c, i, p: pos(c) })).sort((a, b) => (a.p - b.p) || (a.i - b.i)).map((x) => x.c);
}

/** Home's count («عدد الفيديوهات بالرئيسية»): the section's number, else 3. */
export const homeCount = (limit: unknown) => (typeof limit === 'number' && limit >= 1 ? Math.min(Math.floor(limit), TESTIMONIALS_MAX) : HOME_TESTIMONIALS);

/** Is this card switched on for Home («يظهر بالرئيسية»)? With no switch touched yet: the first `count` in order. */
export function onHome(card: { ids: string[] }, index: number, s: { limit?: unknown; onHome?: unknown }): boolean {
  if (Array.isArray(s.onHome)) { const on = strings(s.onHome); return card.ids.some((id) => on.includes(id)); }
  return index < homeCount(s.limit);
}

/** What Home shows: the switched-on cards, in order, up to the count. */
export function homeCards<T extends { ids: string[] }>(all: T[], s: { limit?: unknown; onHome?: unknown }): T[] {
  return all.filter((c, i) => onHome(c, i, s)).slice(0, homeCount(s.limit));
}
