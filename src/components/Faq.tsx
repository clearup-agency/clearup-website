import type { Dict } from '@/lib/dict';
import SectionHead from './SectionHead';
import { faqItems } from '@/lib/rules';

/** «قبل أن تحجز» — the site's ONE FAQ. Every page that has a FAQ section (Home, Services, any page the admin adds
 *  one to) renders this same component with the same questions: the Services page's list (lib/view.ts
 *  sharedSource). Visitors see only questions with a real answer; the admin's preview shows everything. */
export default function Faq({ d }: { d: Dict }) {
  const f = d.faq;
  const items = d.preview ? f.items : faqItems(f.items);
  if (!items.length) return null;
  const fmt = (t: string) => t.split(/(\[[^\]]+\])/).map((p, i) => p.startsWith('[') ? <span key={i} className="ph-inline">{p}</span> : p);
  return (
    <section className="faq section" id="faq">
      <div className="wrap faq__grid">
        <SectionHead index={f.index} eyebrow={f.eyebrow} title={f.title} />
        <div className="faq__list">
          {items.map((it, i) => (
            <details key={i} className="qa" data-reveal open={i === 0}>
              <summary><span>{it.q}</span><i aria-hidden="true" /></summary>
              <p>{fmt(it.a)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
