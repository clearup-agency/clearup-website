'use client';
import type { Dict } from '@/lib/dict';
import { VIDEO_MODE } from '@/content';
import { Arrow } from './Mark';
import SectionHead from './SectionHead';
import VideoPlayer from './VideoPlayer';

type Item = Dict['stories']['items'][number];

/** Testimonials (the older «testimonialsSection»): one large featured video + the rest smaller. Every video is the
 *  site's one video component (VideoPlayer): a click plays it right there. Nothing loads until tapped. */
export default function Stories({ d }: { d: Dict }) {
  const s = d.stories;
  const [feat, ...rest] = s.items ?? [];
  if (!feat) return null;
  const lang = (d as { lang?: string }).lang === 'en' ? 'en' : 'ar';
  // the light preview build plays the Instagram link instead of the file
  const media = (it: Item) => ({ video: VIDEO_MODE === 'instagram' && it.videoUrl ? null : it.video || null, link: it.videoUrl || null, image: it.poster?.src ? it.poster : null });
  return (
    <section className="stories section" id="stories">
      <div className="wrap">
        <SectionHead index={s.index} eyebrow={s.eyebrow} title={s.title} />
        <article className="card story-feat" data-reveal>
          <VideoPlayer item={media(feat)} name={feat.name} label={s.watch} close={s.close} lang={lang} className="story__media story__media--big" posterFirst />
          <div className="story-feat__txt">
            <p className="story-feat__tag">{s.featured}</p>
            <h3 className="story-feat__name">{feat.name}</h3>
            <p className="story-feat__role">{feat.role}</p>
            {s.quote && <p className={'story-feat__q' + (s.quote.includes('[') ? ' ph-inline' : '')}>{s.quote}</p>}
            <button className="btn btn--lg" onClick={(e) => e.currentTarget.closest('.story-feat')?.querySelector<HTMLElement>('button.tvid, a.tvid')?.click()}>{s.watch}<span className="btn__ic"><Arrow /></span></button>
          </div>
        </article>
        <ul className="story-row">
          {rest.map((it) => (
            <li key={it._key ?? it.name} className="card story" data-reveal>
              <VideoPlayer item={media(it)} name={it.name} label={s.watch} close={s.close} lang={lang} className="story__media" posterFirst />
              <div className="story__who"><h3>{it.name}</h3><span>{it.role}</span></div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
