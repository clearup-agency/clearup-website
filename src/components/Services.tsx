import type { Dict } from '@/lib/dict';
import { Arrow } from './Mark';
import SectionHead from './SectionHead';
export default function Services({ d }: { d: Dict }) {
  const s = d.services;
  return (
    <section className="services section" id="services">
      <div className="wrap">
        <SectionHead index={s.index} eyebrow={s.eyebrow} title={s.title} />
        <ul className="svc">
          {s.groups.map((g, i) => (
            <li key={i} className="svc__row">
              <h3 className="svc__k">{g.k}</h3>
              <p className="svc__items">{(g.items ?? []).join('  ·  ')}</p>
              {g.proof && <a className={'svc__proof' + ((g.proof || '').includes('[') ? ' is-ph' : '')} href={d.links?.work ?? '#results'}>{g.proof}<Arrow /></a>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
