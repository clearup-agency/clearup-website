import type { Dict } from '@/lib/dict';
import SrcTag from './SrcTag';
import { Arrow } from './Mark';
import SectionHead from './SectionHead';

// An illustrative curve (NOT real data — labelled as such on the page)
function Curve({ label, from, to, mult }: { label: string; from: string; to: string; mult: string }) {
  return (
    <figure className="curve">
      <svg viewBox="0 0 520 220" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--lav)" strokeWidth="1" strokeOpacity=".35" />
          </pattern>
        </defs>
        {[0, 1, 2, 3].map((i) => <line key={i} x1="0" x2="520" y1={20 + i * 60} y2={20 + i * 60} className="curve__grid" />)}
        <path className="curve__area" d="M0 200 C80 198 140 192 200 176 C270 156 320 120 380 84 C430 54 470 34 520 18 L520 220 L0 220 Z" fill="url(#hatch)" />
        <path className="curve__line" pathLength={1} d="M0 200 C80 198 140 192 200 176 C270 156 320 120 380 84 C430 54 470 34 520 18" />
        <circle className="curve__dot" cx="520" cy="18" r="6" />
      </svg>
      <div className="curve__axis"><span>{from}</span><span>{to}</span></div>
      <span className="curve__mult">{mult}</span>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

type Case = Dict['results']['cases'][number];

export default function Results({ d }: { d: Dict }) {
  const r = d.results;
  const ar = d.lang === 'ar';
  const dash = r.dash ?? {};
  const cases = r.cases ?? [];

  // Case shown as a live results dashboard (full width)
  const Dashboard = ({ a }: { a: Case }) => (
    <article className="case case--feature" data-reveal>
      <div className="case__story">
        <p className="case__meta"><b>{a.client}</b><span>{a.sector}</span><span>{a.period}</span></p>
        <p className="case__problem">{a.problem}</p>
        <ol className="case__built">{(a.built ?? []).map((x, i) => <li key={i}>{x}</li>)}</ol>
        <a className="link" href="#stories">{r.more}<Arrow /></a>
      </div>
      <div className="dash">
        <div className="dash__top"><span className="dash__dot" /> {dash.title || (ar ? 'لوحة النتائج' : 'Results dashboard')} <span className="dash__sp" /> {a.client}</div>
        <Curve label={dash.curve || ''} from={dash.from || ''} to={dash.to || ''} mult={a.metrics?.[0]?.v ?? ''} />
        <dl className="dash__kpis">
          {(a.metrics ?? []).map((m, i) => (
            <div key={i} className={m.src === 'ph' ? 'is-ph' : ''}><dt>{m.l}</dt><dd><span className="num">{m.v}</span><SrcTag src={m.src} d={d} /></dd></div>
          ))}
        </dl>
      </div>
    </article>
  );
  // Case shown as a wall of big numbers
  const Wall = ({ b }: { b: Case }) => (
    <article className="case case--wall" data-reveal>
      <p className="case__meta"><b className={b.client.includes('[') ? 'ph-inline' : ''}>{b.client}</b><span>{b.sector}</span><span>{b.period}</span></p>
      <p className="case__problem">{b.problem}</p>
      <dl className="wall">
        {(b.metrics ?? []).map((m, i) => (<div key={i}><dd><span className="num">{m.v}</span><SrcTag src={m.src} d={d} /></dd><dt>{m.l}</dt></div>))}
      </dl>
      {b.note && <p className="case__warn">{b.note}</p>}
    </article>
  );
  // Case led by a client video, numbers next to it
  const Video = ({ c }: { c: Case }) => (
    <article className="case case--video" data-reveal>
      {c.image && (
        <a className="case__poster" href="#stories" aria-label={c.client}>
          <img src={c.image.src} alt={c.image.alt || c.client} width={432} height={768} loading="lazy" decoding="async" />
          <span className="clip__play" aria-hidden="true" />
        </a>
      )}
      <div>
        <p className="case__meta"><b>{c.client}</b><span>{c.sector}</span><span className={c.period.includes('[') ? 'ph-inline' : ''}>{c.period}</span></p>
        <p className={'case__problem' + (c.problem.includes('[') ? ' ph-block' : '')}>{c.problem}</p>
        <dl className="dash__kpis dash__kpis--light">
          {(c.metrics ?? []).map((m, i) => (<div key={i} className={m.src === 'ph' ? 'is-ph' : ''}><dt>{m.l}</dt><dd><span className="num">{m.v}</span><SrcTag src={m.src} d={d} /></dd></div>))}
        </dl>
        {c.note && <p className="case__warn">{c.note}</p>}
      </div>
    </article>
  );

  // dashboards take the full width; numbers/video cases pair up side by side, in the admin's order
  const blocks: { full?: Case; pair?: Case[] }[] = [];
  for (const c of cases) {
    if ((c.style ?? 'numbers') === 'dashboard') blocks.push({ full: c });
    else {
      const last = blocks[blocks.length - 1];
      if (last?.pair && last.pair.length < 2) last.pair.push(c); else blocks.push({ pair: [c] });
    }
  }

  return (
    <section className="results section" id="results">
      <div className="wrap">
        <SectionHead index={r.index} eyebrow={r.eyebrow} title={r.title} lead={r.lead} />
        {blocks.map((bl, i) => bl.full ? <Dashboard key={i} a={bl.full} /> : (
          <div key={i} className="case-pair">
            {bl.pair!.map((c, j) => (c.style === 'video' ? <Video key={j} c={c} /> : <Wall key={j} b={c} />))}
          </div>
        ))}
        {r.want && <p className="results__want" data-reveal><a className="btn btn--lg" href={d.links?.book ?? '#book'}>{r.want}<span className="btn__ic"><Arrow /></span></a></p>}
      </div>
    </section>
  );
}
