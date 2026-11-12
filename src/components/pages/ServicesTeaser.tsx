import type { PageCtx, Raw } from '@/lib/view';
import { Arrow } from '../Mark';
import SectionHead from '../SectionHead';

/** Home: the four service groups (read from the Services page, so they are edited in one place). */
export default function ServicesTeaser({ s, ctx }: { s: Raw; ctx: PageCtx }) {
  const groups: Raw[] = (ctx.services?.groups ?? []).filter(Boolean);
  if (!groups.length) return null;
  const href = ctx.links.services + '#services';
  return (
    <section className="svctx section" id="services">
      <div className="wrap">
        <SectionHead eyebrow={s.eyebrow} title={s.title} />
        <ul className="svctx__grid">
          {groups.map((g, i) => (
            <li key={i}>
              <a className="svctx__tile" href={href}>
                <span className="svctx__i">0{i + 1}</span>
                <b className="svctx__k">{g.k}</b>
                <span className="svctx__items">{(g.items ?? []).slice(0, 3).join(' · ')}</span>
                <span className="svctx__go" aria-hidden="true"><Arrow /></span>
              </a>
            </li>
          ))}
        </ul>
        {s.more && <p className="proof__all" data-reveal><a className="link" href={ctx.links.services}>{s.more}<Arrow /></a></p>}
      </div>
    </section>
  );
}
