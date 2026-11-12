import type { Img } from '@/lib/view';
import { Arrow } from './Mark';
import RichText, { type Block } from './RichText';

type Data = { index?: string; eyebrow?: string; title?: string; body?: Block[]; image?: Img | null; imageSide?: 'start' | 'end'; theme?: 'light' | 'card' | 'dark' | 'purple'; cta?: { label?: string; href?: string }; anchor?: string };

/** Free-form section the admin can add anywhere: title + rich text + optional image + optional button. */
export default function TextImage({ s }: { s: Data }) {
  const theme = s.theme || 'light';
  return (
    <section className={'xsec xsec--' + theme + ' section'}>
      <div className={'wrap xsec__grid' + (s.image ? ' has-img' : '') + (s.imageSide === 'start' ? ' img-start' : '')}>
        <div className="xsec__copy" data-reveal>
          {(s.index || s.eyebrow) && <p className="shead__meta"><span className="shead__idx">{s.index}</span><bdi>{s.eyebrow}</bdi></p>}
          {s.title && <h2 className="h2">{s.title}</h2>}
          {s.body?.length ? <div className="xsec__body"><RichText blocks={s.body} /></div> : null}
          {s.cta?.label && s.cta.href && (
            <p className="xsec__cta"><a className={'btn btn--lg' + (theme === 'purple' ? ' btn--light' : '')} href={s.cta.href}>{s.cta.label}<span className="btn__ic"><Arrow /></span></a></p>
          )}
        </div>
        {s.image && (
          <figure className="xsec__media" data-reveal>
            <img src={s.image.src} alt={s.image.alt} width={s.image.width} height={s.image.height} loading="lazy" decoding="async" />
          </figure>
        )}
      </div>
    </section>
  );
}
