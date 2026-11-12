import type { Dict } from '@/lib/dict';
import { Arrow } from '../Mark';
import SectionHead from '../SectionHead';

/** Home's short version of the system and the services in one section: the six stages in one climbing row
 *  (climbing «للأعلى» — left → right in Arabic, right → left in English, as Mohamed set it on Nov 8), one line each, linking to the
 *  full system and the four service groups on the Services page. */
export default function SystemTeaser({ d, more, href }: { d: Dict; more?: string; href: string }) {
  const sys = d.system;
  const n = sys.stages.length;
  const line = (s: { out?: string[]; what?: string }) => (s.out ?? []).filter(Boolean).slice(0, 3).join(' · ');
  return (
    <section className="systx section" id="system">
      <div className="wrap">
        <SectionHead dark index={sys.index} eyebrow={sys.eyebrow} title={sys.title} lead={sys.lead} />
        <ol className="systx__steps" style={{ ['--n' as string]: n }}>
          {sys.stages.map((s, k) => (
            <li key={k} className="systx__step" style={{ ['--k' as string]: k }} data-reveal>
              <span className="systx__n">{s.n}</span>
              <b className="systx__name">{s.name}</b>
              {/* one line per stage: what it delivers (the four service groups live on the Services page) */}
              {line(s) && <span className="systx__line">{line(s)}</span>}
            </li>
          ))}
        </ol>
        {more && <p className="systx__more" data-reveal><a className="link link--light" href={href}>{more}<Arrow /></a></p>}
      </div>
    </section>
  );
}
