import type { Dict } from '@/lib/dict';
import SrcTag from './SrcTag';
import StatCount from './StatCount';

/* «بالأرقام» (Nov 11, 2026; option A «dark & calm», picked by Mohamed): a dark strip straight on from the hero —
   plain big figures (each counts up the first time it comes into view) with thin dividers between them, 4 across on
   a laptop, 2 × 2 on a phone. No icons, no cards. The section's heading is kept for screen readers only. */
type Item = { v: string; l: string; src: string };
type Data = { index?: string; eyebrow?: string; title?: string; lead?: string; items?: Item[]; placeholder4?: boolean };

/** The 4th figure until the client confirms one (the older «+100 brands» stat; the admin turns it off or adds its
 *  own 4th figure, which replaces it). Marked «needs confirming» in the admin preview. */
const PENDING: Record<'ar' | 'en', Item> = {
  ar: { v: '+100', l: 'علامة تجارية عملنا معها', src: 'site' },
  en: { v: '100+', l: 'brands we have worked with', src: 'site' },
};
const HEAD: Record<'ar' | 'en', string> = { ar: 'نتائج تُقاس، لا وعود تُقال', en: 'Measured results, not promises' };

// «نمو إيرادات … (خلال 3 أشهر)»: the part in brackets is the small second line
function Caption({ text }: { text: string }) {
  const m = /^(.*?)\s*[(（]([^()（）]+)[)）]\s*$/.exec(text);
  return <dt className="xstat__l">{m ? <>{m[1]}<em>{m[2]}</em></> : text}</dt>;
}

export default function StatsStrip({ s, d }: { s: Data; d: Dict }) {
  const lang = d.lang === 'en' ? 'en' : 'ar';
  const items = (s.items ?? []).filter((it) => it && it.v && it.l);
  if (!items.length) return null;
  const all = items.length === 3 && s.placeholder4 !== false ? [...items, PENDING[lang]] : items;
  const title = s.title || s.eyebrow || HEAD[lang];
  return (
    <section className="xstats section">
      <div className="wrap">
        <h2 className="sr-only">{title}</h2>
        <dl className={'xstats__grid xstats__grid--' + Math.min(all.length, 4)}>
          {all.map((it, i) => (
            <div key={i} className="xstat">
              <Caption text={it.l} />
              <dd className="xstat__v"><span className="xstat__n"><StatCount value={it.v} /><SrcTag src={it.src} d={d} /></span></dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
