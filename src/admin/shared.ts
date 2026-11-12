import type { SectionRow } from '@/db/schema';
import { ownKeys, pickSource } from '@/lib/view';

/* One section, one source (lib/view.ts sharedSource): Home's services cards, growth path, six stages, tools,
   works stories, testimonials and FAQ show the text of ONE section (the Services page's, or the first one).
   Nov 9, 2026 (Mohamed: «اخر sections ضفناها ما بقدر اعدل اي اشي عليها»): a reader is now edited in place — the
   panel shows the shared text and a change goes to the source section, so it changes everywhere it shows, while
   where the reader sits and how it looks («تصميم القسم», anchor, its own switches) stay the reader's own. */

const rowKind = (x: SectionRow) => ({ type: x.type, page: x.page || 'home', hidden: !!x.hidden, compact: !!(x.data as Record<string, unknown>)?.compact });

/** The section that holds this one's text, when it is not this one (else null). */
export function sourceRow(s: SectionRow, all: SectionRow[]): SectionRow | null {
  const src = pickSource(s, all, rowKind);
  return src && src.id !== s.id ? src : null;
}

type Data = Record<string, unknown>;
const split = (type: string, d: Data) => {
  const keys = ownKeys(type);
  const own: Data = {}, text: Data = {};
  for (const [k, v] of Object.entries(d ?? {})) (keys.includes(k) ? own : text)[k] = v;
  return { own, text };
};

/** What a reader shows: the source's text + its own placement (the same merge as the site). */
export function readerData(s: SectionRow, src: SectionRow): Data {
  return { ...split(s.type, src.data as Data).text, ...split(s.type, s.data as Data).own };
}

/** A change made on a reader → the reader's new data (its own keys) and the source's (the text). */
export function splitChange(s: SectionRow, src: SectionRow, next: Data): { reader: Data; source: Data } {
  const n = split(s.type, next);
  const r = split(s.type, s.data as Data);
  const so = split(s.type, src.data as Data);
  return { reader: { ...r.text, ...n.own }, source: { ...so.own, ...n.text } };
}
