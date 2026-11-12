import type { Img } from '@/lib/view';
import SectionHead from './SectionHead';

type Data = { index?: string; eyebrow?: string; title?: string; images?: Img[]; columns?: number };

export default function Gallery({ s }: { s: Data }) {
  const imgs = (s.images ?? []).filter(Boolean);
  if (!imgs.length && !s.title) return null;
  return (
    <section className="xgal section">
      <div className="wrap">
        {(s.title || s.eyebrow) && <SectionHead index={s.index} eyebrow={s.eyebrow} title={s.title} />}
        <ul className="xgal__grid" style={{ ['--cols' as string]: s.columns || 3 }}>
          {imgs.map((im, i) => (
            <li key={i} data-reveal>
              <figure>
                <img src={im.src} alt={im.alt} width={im.width} height={im.height} loading="lazy" decoding="async" />
                {im.caption && <figcaption>{im.caption}</figcaption>}
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
