import type { Dict } from '@/lib/dict';
import SectionHead from './SectionHead';
export default function Ninety({ d }: { d: Dict }) {
  const n = d.ninety;
  return (
    <section className="ninety section" id="ninety">
      <div className="wrap">
        <SectionHead index={n.index} eyebrow={n.eyebrow} title={n.title} />
        <ol className="climb">
          {n.steps.map((s, i) => (
            <li key={i} className="climb__step" style={{ ['--i' as any]: i }} data-reveal>
              <span className="climb__w">{s.w}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </li>
          ))}
        </ol>
        {n.note && <p className={(n.note.includes('[') ? 'ph-inline ' : '') + 'ninety__note'}>{n.note}</p>}
      </div>
    </section>
  );
}
