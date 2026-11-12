import type { Dict } from '@/lib/dict';
import type { Raw } from '@/lib/view';
import { filled } from '@/lib/pages';
import { Arrow } from '../Mark';
import { waWithText } from '@/lib/rules';

/** The compact «book a call» that closes every page but Contact (the full form lives on Contact). */
export default function CtaBand({ s, d }: { s: Raw; d: Dict }) {
  const title: string[] = Array.isArray(s.title) ? s.title.filter(Boolean) : [s.title].filter(Boolean);
  return (
    <section className="band section" id="book">
      <div className="wrap">
        <div className="band__card" data-reveal>
          <h2 className="band__t">{title.map((t, i) => <span key={i}>{t}</span>)}</h2>
          {filled(s.lead) && <p className="band__lead">{s.lead}</p>}
          <div className="cta-row">
            <a className="btn btn--light btn--lg" href={d.links?.book ?? d.links?.contact ?? '#book'}>{s.cta}<span className="btn__ic"><Arrow /></span></a>
            {d.site.whatsapp && s.whatsapp && <a className="btn btn--line btn--lg" href={waWithText(d.site.whatsapp, d.lang)} target="_blank" rel="noopener">{s.whatsapp}</a>}
          </div>
        </div>
      </div>
    </section>
  );
}
