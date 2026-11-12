import type { Raw } from '@/lib/view';

const real = (v: unknown): v is string => typeof v === 'string' && !!v.trim() && !/\[[^\]]*\]/.test(v);

/** The top of an inner page: eyebrow, the page's one <h1>, the page's plain summary (what ClearUp / this page
 *  is, in one or two sentences — the line Google and AI answers quote), then the lead line. */
export default function PageHead({ s }: { s: Raw }) {
  // company facts shown as small chips under the lead (Nov 9, 2026, Munim: «سجل تجاري رقم 60784 · تأسست 2023»)
  const facts: string[] = Array.isArray(s.facts) ? s.facts.filter(real) : [];
  const sum = real(s.summary) && s.summary.trim() !== String(s.lead ?? '').trim() ? s.summary : '';
  return (
    <section className="phead">
      <div className="wrap phead__in">
        {s.eyebrow && <p className="kicker"><span className="sq" aria-hidden="true" />{s.eyebrow}</p>}
        <h1 className="phead__t">{s.title}</h1>
        {sum && <p className="phead__sum">{sum}</p>}
        {real(s.lead) && <p className="phead__lead">{s.lead}</p>}
        {facts.length > 0 && (
          <ul className="phead__facts">
            {facts.map((f, i) => <li key={i}><span className="sq" aria-hidden="true" />{f}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
