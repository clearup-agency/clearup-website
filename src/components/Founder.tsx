import type { Dict } from '@/lib/dict';
import { Arrow } from './Mark';
/** `top`: on the About page the founder is the first thing under the title — painted at once, photo not lazy.
 *  No photo yet (Nov 8, 2026: their content file asks for a professional one) → the photo slot is not shown at
 *  all and the words take the full width. The message keeps its paragraphs (a blank line = a new paragraph). */
export default function Founder({ d, top = false }: { d: Dict; top?: boolean }) {
  const f = d.founder as Dict['founder'] & { bio?: string; sign?: string };
  const hasPhoto = !!f.photo?.src;
  const paras = String(f.body || '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  return (
    <section className={'founder section' + (hasPhoto ? '' : ' founder--nophoto')} id="founder">
      <div className="wrap founder__grid">
        {hasPhoto && (
          <figure className="founder__photo" data-reveal={top ? undefined : true}>
            <img src={f.photo!.src} alt={f.photo!.alt || f.name} width={640} height={640} loading={top ? 'eager' : 'lazy'} fetchPriority={top ? 'high' : undefined} decoding="async" />
            {f.photoCaption && <figcaption>{f.photoCaption}</figcaption>}
          </figure>
        )}
        <div className="founder__copy" data-reveal={top ? undefined : true}>
          <p className="shead__meta">{f.index && <span className="shead__idx">{f.index}</span>}<bdi>{f.eyebrow}</bdi></p>
          {f.quote && <blockquote className={'founder__quote' + (f.quote.includes('[') ? ' ph-block' : '')}>{f.quote}</blockquote>}
          <p className="founder__name"><b>{f.name}</b><span>{f.role}</span></p>
          {paras.map((p, i) => <p key={i} className="founder__body">{p}</p>)}
          {f.sign && <p className="founder__sign">{f.sign}</p>}
          {f.bio && <p className="founder__bio">{f.bio}</p>}
          {f.igHandle && <a className="link" href={'https://instagram.com/' + f.igHandle} target="_blank" rel="noopener">{f.ig} <bdi dir="ltr">@{f.igHandle}</bdi><Arrow /></a>}
          {f.members.length > 0 && <div className="team">
            <p className="team__h">{f.team}</p>
            <ul>{f.members.map((m, i) => <li key={i}>{m}</li>)}</ul>
            <p className="team__note">{f.teamNote}</p>
          </div>}
        </div>
      </div>
    </section>
  );
}
