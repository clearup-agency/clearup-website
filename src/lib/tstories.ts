import { fileUrl, storyEmbed, storyThumb } from './cdn';
export { storyPoster, storyThumb } from './cdn';
import { storyPoster } from './cdn';
import { filled } from './pages';
import { isSampleClient, leadMetric } from './rules';

/* «آراء العملاء» as Instagram stories (Nov 8, 2026): each client with a testimonial becomes one round avatar;
   tapping it opens the same full-screen story viewer as the client works (components/ClientStories.tsx).
   Pure: no React, no server imports — the logic the tests read. Nothing is invented: a field that is empty or a
   [placeholder] is left out, a client without a video or a quote is not a story, and every client that has a
   page links to it («القصة كاملة» + the avatar/name in the viewer) — Mohamed, Nov 8: «لكل واحد صفحة». */

type Raw = Record<string, any>;
type Img = { src: string; alt?: string; width?: number; height?: number };
export type TStoryItem = { _key?: string; video?: string | null; link?: string | null; image?: Img | null; caption?: string; quote?: string };
export type TStory = {
  _key: string; name: string; person?: string; role?: string; logo?: Img | null;
  metric?: { v: string; l: string } | null; href?: string; thumb: string; items: TStoryItem[];
};

const str = (v: unknown): string => (filled(v) ? String(v).trim() : '');

const playable = (it: Raw | null | undefined): it is TStoryItem =>
  !!it && !!((typeof it.video === 'string' && it.video) || it.image?.src || storyEmbed(it.link));

/** The client page a story links to: every client record with a page (view.ts keeps only those in ctx.cases)
 *  links there — not only the ones with a written case — except a hidden client and the code's sample clients. */
export function pageHref(c: { href?: string; hidden?: boolean; data?: Raw }): string | undefined {
  const d = c.data ?? {};
  if (!c.href || c.hidden) return undefined;
  if (isSampleClient({ logo: d.logo, items: Array.isArray(d.works) ? d.works : [] })) return undefined;
  return c.href;
}

/** The clients shown as stories on the Work page and under «قصص أخرى» on each client page: one list, one rule. */
export function workClients<T extends { key: string; data: Raw }>(cases: T[], exceptKey?: string): T[] {
  return cases.filter((c) => c.key !== exceptKey && (c.data?.isCase || (Array.isArray(c.data?.works) && c.data.works.length > 0)));
}

/** «أعمالنا» as stories (Nov 8, 2026): every client of the Work page — a case study, a testimonial, or a client
 *  with works — becomes one round avatar; its story plays what the site has for it, in this order: the
 *  testimonial video, the case's other videos, then its works; a client with none of those shows its cover.
 *  Every story links its client page (pageHref). */
export function workStories(cases: { key: string; href: string; data: Raw; hidden?: boolean }[], max = 40): TStory[] {
  const out: TStory[] = [];
  for (const c of cases) {
    if (c.hidden) continue;
    const d = c.data ?? {};
    const works: Raw[] = Array.isArray(d.works) ? d.works : [];
    if (!d.isCase && !works.length) continue;
    // the stories section's starting sample clients (placeholder pictures) never show to visitors
    if (isSampleClient({ logo: d.logo, items: works })) continue;
    const name = str(d.client);
    if (!name) continue;
    const seen = new Set<string>();
    const items: TStoryItem[] = [];
    const add = (it: Raw | null | undefined, k: string) => {
      if (!playable(it)) return;
      const id = String(it.video || it.link || it.image?.src || '');
      if (seen.has(id)) return;
      seen.add(id);
      items.push({ _key: it._key ?? k, video: it.video ?? null, link: it.link ?? null, image: it.image ?? null, ...(str(it.caption) ? { caption: str(it.caption) } : {}) });
    };
    add(d.tvideo, 'tv');
    // the case's other videos are stored as { url (Instagram/YouTube link), file (the video itself), poster }
    (Array.isArray(d.videos) ? d.videos : []).forEach((v: Raw, i: number) => {
      const file = fileUrl(v?.file);
      add({ _key: 'v' + i, link: v?.url ?? null, video: file || null, image: v?.poster?.src ? v.poster : null }, 'v' + i);
    });
    works.forEach((w, i) => add(w, 'w' + i));
    if (!items.length && d.cover?.src) add({ image: d.cover }, 'cover');
    if (!items.length) continue;
    const tt = (d.testimonial ?? {}) as Raw;
    const person = str(tt.name);
    const role = str(tt.role);
    out.push({
      _key: c.key,
      name,
      ...(person ? { person } : {}),
      ...(role ? { role } : {}),
      logo: d.logo?.src ? d.logo : null,
      metric: leadMetric(d.metrics),
      ...(pageHref(c) ? { href: pageHref(c) } : {}),
      thumb: storyThumb(items.find((x) => x.video || x.link) ?? null, d.logo) || (items[0].image?.src ?? ''),
      items,
    });
    if (out.length >= max) break;
  }
  return out;
}

/** The testimonial clients (already localized client records, in the «العملاء» order) as stories. */
export function testimonialStories(cases: { key: string; href: string; data: Raw; hidden?: boolean }[], max = 12): TStory[] {
  const out: TStory[] = [];
  for (const c of cases) {
    const d = c.data ?? {};
    if (!d.hasTestimonial || d.featured === false) continue;
    const tt = (d.testimonial ?? {}) as Raw;
    const quote = str(tt.quote);
    const vid = playable(d.tvideo) ? (d.tvideo as TStoryItem) : null;
    // a story needs something to show: the client's video, else (no video) its written quote as a text slide
    if (!vid && !quote) continue;
    const name = str(d.client);
    if (!name) continue;
    const item: TStoryItem = vid
      ? { _key: vid._key ?? 'tv', video: vid.video ?? null, link: vid.link ?? null, image: vid.image ?? null, ...(quote ? { quote } : {}) }
      : { _key: 'tq', quote };
    const person = str(tt.name);
    const role = str(tt.role);
    out.push({
      _key: c.key,
      name,
      ...(person ? { person } : {}),
      ...(role ? { role } : {}),
      logo: d.logo?.src ? d.logo : null,
      metric: leadMetric(d.metrics),
      ...(pageHref(c) ? { href: pageHref(c) } : {}),
      thumb: storyThumb(vid, d.logo),
      items: [item],
    });
    if (out.length >= max) break;
  }
  return out;
}

/** A client card under «قصص أخرى» for a client with no testimonial video (Nov 9, 2026): its picture, name, one
 *  short line and its page. */
export type OtherClientCard = {
  key: string; storyKey: string; caseKey: string; name: string; sub: string; short: string; href?: string;
  poster: string; logo: Img | null;
};

/** «قصص أخرى» on a client page (Mohamed, Nov 9, 2026: «قصص أخرى» is cards, not story rings — the rings are only
 *  Home's «شغلنا من جوّا»): every OTHER client, those with a testimonial card first (`testimonialKeys`, already in the
 *  admin's testimonials order) and then the rest in the «العملاء» order as client cards. The same rules as the
 *  stories: a hidden client and the code's sample clients never show; nothing is invented (an empty or [placeholder]
 *  part is left out); a client with no picture (cover, video or work) is left out, as the stories did. */
export function otherClientCards(cases: { key: string; href: string; data: Raw; hidden?: boolean }[], exceptKey: string, testimonialKeys: string[], max = 40): OtherClientCard[] {
  const out: OtherClientCard[] = [];
  for (const c of cases) {
    if (c.key === exceptKey || c.hidden || testimonialKeys.includes(c.key)) continue;
    const d = c.data ?? {};
    const works: Raw[] = Array.isArray(d.works) ? d.works : [];
    // the Work page's client list (workClients): a client with a project story or works
    if (!d.isCase && !works.length) continue;
    if (isSampleClient({ logo: d.logo, items: works })) continue;
    const name = str(d.client);
    if (!name) continue;
    // the picture: the client's cover, else the first frame of its video, its other videos, then its works
    const vids: Raw[] = (Array.isArray(d.videos) ? d.videos : []).map((v: Raw) => ({
      video: fileUrl(v?.file) || null,
      link: v?.url ?? null, image: v?.poster?.src ? v.poster : null,
    }));
    const media = [d.cover?.src ? { image: d.cover } : null, d.tvideo, ...vids, ...works].find((it) => playable(it as Raw)) as Raw | undefined;
    const poster = media ? storyPoster(media as never, 720) : '';
    // a card is a picture: a text-only client (no cover, video or work — e.g. a programme) is left out, as in the
    // stories before (workStories)
    if (!poster) continue;
    const href = pageHref(c);
    const tt = (d.testimonial ?? {}) as Raw;
    const m = leadMetric(d.metrics);
    out.push({
      key: c.key,
      storyKey: typeof d.storyKey === 'string' ? d.storyKey : '',
      caseKey: typeof d.caseKey === 'string' ? d.caseKey : '',
      name,
      sub: [str(tt.name), str(tt.role)].filter(Boolean).join(' · ') || str(d.industry),
      short: str(d.summary) || (m ? `${m.v} ${m.l}`.trim() : ''),
      ...(href ? { href } : {}),
      poster,
      logo: d.logo?.src ? d.logo : null,
    });
    if (out.length >= max) break;
  }
  return out;
}
