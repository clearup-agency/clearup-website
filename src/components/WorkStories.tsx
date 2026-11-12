import type { Raw } from '@/lib/view';
import { cdnFrame, cdnImage } from '@/lib/cdn';
import { TestimonialStories } from './ClientStories';
import SectionHead from './SectionHead';

/* «من شغلنا / ورا الكواليس» (Mohamed + Munim, Nov 8, 2026: the stories show real work — lectures, ads we made,
   behind the scenes; client testimonials have their own section). The same round rings and the same full-screen
   story viewer as everywhere else (ClientStories.tsx); each ring = one group of clips/photos written in the admin.
   Only the small ring pictures load with the page; a video loads when its story is opened. */
type Group = { _key?: string; name?: string; cover?: { src: string } | null; items?: Raw[] };

export function workGroups(groups: Group[] | undefined) {
  return (groups ?? [])
    .map((g, gi) => {
      const items = (g.items ?? [])
        .map((it, i) => ({ _key: it._key ?? 'i' + i, video: typeof it.video === 'string' && it.video ? it.video : null, image: it.image?.src ? it.image : null, link: typeof it.link === 'string' && it.link ? it.link : null, ...(it.caption ? { caption: String(it.caption) } : {}) }))
        .filter((it) => it.video || it.image || it.link);
      const first = items.find((it) => it.video)?.video;
      const thumb = g.cover?.src ? cdnImage(g.cover.src, 160, true) : first ? cdnFrame(first, 160, true) : items[0]?.image?.src ? cdnImage(items[0].image.src, 160, true) : '';
      return { _key: g._key ?? 'g' + gi, name: g.name || '', thumb, items };
    })
    .filter((g) => g.name && g.items.length);
}

export default function WorkStories({ s, lang }: { s: Raw; lang: 'ar' | 'en' }) {
  const groups = workGroups(s.groups);
  if (!groups.length) return null;
  return (
    <section className="wstories section section--tight" id="our-work">
      <div className="wrap">
        <SectionHead index={s.index} eyebrow={s.eyebrow} title={s.title} lead={s.lead} />
        <TestimonialStories clients={groups} lang={lang} kind="work" />
      </div>
    </section>
  );
}
