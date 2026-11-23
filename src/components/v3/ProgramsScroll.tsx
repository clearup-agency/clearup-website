'use client';
import { StageScroll } from '../System';
import { Ph, vhref } from './Blocks';

/* «نقطة بداية، وتسعة برامج، وباقة شاملة» in the site's sticky scroll (Mohamed, Nov 23, 2026: «نفس ما كان في الموقع
   القديم»): the same StageScroll the Services page used for the five services — the screen stays, scrolling moves
   from one programme to the next, the names list beside it jumps to any of them. Each programme: its promise, what
   it includes, the role of AI and the expected impact; the starting point and «شريك النمو» carry their own rows. */

type Item = { id?: string; n?: string; tag?: string; t: string; promise?: string; includes?: string[]; ai?: string; impact?: string[]; choices?: string; rows?: { k: string; v: string }[]; cycle?: string; text?: string; proof?: string; cta?: { label?: string; href?: string } };
type Data = { eyebrow?: string; title?: string; lead?: string; items?: Item[]; labels?: { includes?: string; ai?: string; impact?: string; choices?: string } };

export default function ProgramsScroll({ s, lang }: { s: Data; lang: 'ar' | 'en' }) {
  const items = (s.items ?? []).filter((x) => x && x.t);
  const lb = s.labels ?? {};
  if (!items.length) return null;
  const total = items.length;
  const two = (k: number) => String(k).padStart(2, '0');
  return (
    <StageScroll id="programs" titleId="programs-title" className="system--svc system--prog" fit
      head={{ eyebrow: s.eyebrow, title: s.title, lead: s.lead }}
      names={items.map((it) => it.t)}
      ids={items.map((it) => it.id)}
      body={(a) => {
        const it = items[a];
        return (
          <>
            <p className="stage__n">{two(a + 1)} <span>/ {two(total)}</span>{it.tag && <em className="prog__tag">{it.tag}</em>}</p>
            <h3 className="stage__name">{it.t}</h3>
            {it.promise && <p className="prog__promise"><Ph t={it.promise} /></p>}
            {it.cycle && <p className="prog__cycle">{it.cycle}</p>}
            {it.text && <p className="stage__fits stage__pl"><Ph t={it.text} /></p>}
            <div className="stage__grid">
              {(it.includes ?? []).length > 0 && <div className="stage__blk"><p className="stage__lbl">{lb.includes}</p><ul className="stage__out">{it.includes!.map((x, k) => <li key={k}>{x}</li>)}</ul></div>}
              {it.ai && <div className="stage__blk"><p className="stage__lbl">{lb.ai}</p><p className="stage__fits stage__pl"><Ph t={it.ai} /></p></div>}
              {it.choices && <div className="stage__blk"><p className="stage__lbl">{lb.choices}</p><p className="stage__fits stage__pl"><Ph t={it.choices} /></p></div>}
              {(it.impact ?? []).length > 0 && <div className="stage__blk"><p className="stage__lbl">{lb.impact}</p><ul className="stage__out prog__impact">{it.impact!.map((x, k) => <li key={k}>{x}</li>)}</ul></div>}
              {(it.rows ?? []).map((r, k) => <div key={k} className="stage__blk"><p className="stage__lbl">{r.k}</p><p className="stage__fits stage__pl"><Ph t={r.v} /></p></div>)}
            </div>
            {it.proof && <p className="prog__proof"><Ph t={it.proof} /></p>}
            {it.cta?.label && <a className="btn btn--light prog__cta" href={vhref(it.cta.href, lang)}>{it.cta.label}</a>}
          </>
        );
      }}
      viz={(a) => {
        const it = items[a];
        return (
          <div className="svcviz prog__viz" key={a}>
            <span className="svcviz__n" aria-hidden="true">{two(a + 1)}</span>
            {it.promise && <p className="prog__vizp">{it.promise}</p>}
          </div>
        );
      }}
    />
  );
}
