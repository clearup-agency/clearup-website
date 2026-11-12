import type { Dict } from '@/lib/dict';
import SectionHead from './SectionHead';
import { Arrow } from './Mark';

/* «المشكلة» — the pains, then the turn («المشكلة ليست في التصميم. المشكلة أنه لا يوجد نظام.»), and since Nov 8, 2026
   (Mohamed: the turn sat alone with nothing after it) what it means: the founder's line about the system, and a
   before / after — life without a system next to what stays with the client after the work. Every line is from
   ClearUp's content file (client cases, «لا تناسبك إذا», the FAQ «ماذا يبقى لدينا بعد انتهاء العمل؟»), edited in the admin. */
export default function Pain({ d }: { d: Dict }) {
  const p = d.pain as Dict['pain'] & { turnHidden?: boolean; quote?: string; quoteBy?: string; beforeTitle?: string; before?: string[]; afterTitle?: string; after?: string[] };
  // Nov 11, 2026 (Mohamed): «المشكلة ليست في التصميم…» and everything under it is switched off in the admin
  // («إخفاء الجملة الختامية وما تحتها») — hidden, not deleted, so it can come back
  const off = p.turnHidden === true;
  const before = off ? [] : (p.before ?? []).filter(Boolean);
  const after = off ? [] : (p.after ?? []).filter(Boolean);
  return (
    <section className="pain section" id="pain">
      <div className="wrap">
        <SectionHead index={p.index} eyebrow={p.eyebrow} title={p.title} />
        <ol className="pain__list">
          {p.items.map((it, i) => (
            <li key={i} className="pain__item" data-reveal style={{ ['--i' as any]: i }}>
              <span className="pain__x" aria-hidden="true">×</span>
              <h3>{it.k}</h3>
              <p>{it.t}</p>
            </li>
          ))}
        </ol>
        {!off && p.turn && <p className="pain__turn" data-reveal>{p.turn}</p>}
        {!off && p.quote && (
          <blockquote className="pain__quote" data-reveal>
            <p>{p.quote}</p>
            {p.quoteBy && <cite>{p.quoteBy}</cite>}
          </blockquote>
        )}
        {(before.length > 0 || after.length > 0) && (
          <div className="vs">
            {before.length > 0 && (
              <div className="vs__col vs__col--before" data-reveal>
                {p.beforeTitle && <h3 className="vs__t">{p.beforeTitle}</h3>}
                <ul>{before.map((x, i) => <li key={i} style={{ ['--i' as any]: i }}><span className="vs__ic" aria-hidden="true">×</span>{x}</li>)}</ul>
              </div>
            )}
            {before.length > 0 && after.length > 0 && <span className="vs__arrow" aria-hidden="true"><Arrow /></span>}
            {after.length > 0 && (
              <div className="vs__col vs__col--after" data-reveal>
                {p.afterTitle && <h3 className="vs__t">{p.afterTitle}</h3>}
                <ul>{after.map((x, i) => <li key={i} style={{ ['--i' as any]: i }}><span className="vs__ic" aria-hidden="true">✓</span>{x}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
