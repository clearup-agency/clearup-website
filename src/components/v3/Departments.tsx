'use client';
import { useState } from 'react';
import SectionHead from '../SectionHead';
import { Arrow } from '../Mark';
import { Ph, vhref } from './Blocks';

/* «نحوّل أقسام مؤسستك بالذكاء الاصطناعي، قسماً بقسم» — the five departments as tabs instead of a table: pick a
   department, see its «before» next to its «after» (the expected output), the programmes that get it there and
   «حوّل هذا القسم» (the booking form with that department pre-selected). Without JavaScript the first one shows. */

type Dept = { name: string; before: string; after: string; programs?: string[] };
type Data = { anchor?: string; eyebrow?: string; title?: string; lead?: string; items?: Dept[]; labels?: { before?: string; after?: string; programs?: string; cta?: string }; href?: string };

export default function Departments({ s, lang }: { s: Data; lang: 'ar' | 'en' }) {
  const items = (s.items ?? []).filter((x) => x && x.name);
  const [at, setAt] = useState(0);
  if (!items.length) return null;
  const d = items[at] ?? items[0];
  const lb = s.labels ?? {};
  const href = vhref(`${s.href || '/contact/'}?focus=${encodeURIComponent(d.name)}#book`, lang);
  return (
    <section className="vdept section" id={s.anchor || 'dept'}>
      <div className="wrap">
        <SectionHead eyebrow={s.eyebrow} title={s.title} lead={s.lead} />
        <div className="vdept__tabs" role="tablist" aria-label={s.eyebrow}>
          {items.map((x, i) => (
            <button key={x.name} type="button" role="tab" aria-selected={i === at} className={'vdept__tab' + (i === at ? ' is-on' : '')} onClick={() => setAt(i)}>
              <span className="vdept__i">{String(i + 1).padStart(2, '0')}</span>{x.name}
            </button>
          ))}
        </div>
        <div className="vdept__panel" role="tabpanel" key={d.name}>
          <div className="vdept__col vdept__col--before">
            <p className="vdept__lbl"><span aria-hidden="true">×</span>{lb.before}</p>
            <p className="vdept__txt"><Ph t={d.before} /></p>
          </div>
          <span className="vdept__arrow" aria-hidden="true">{lang === 'ar' ? '←' : '→'}</span>
          <div className="vdept__col vdept__col--after">
            <p className="vdept__lbl"><span aria-hidden="true">✓</span>{lb.after}</p>
            <p className="vdept__txt"><Ph t={d.after} /></p>
          </div>
          <div className="vdept__foot">
            {d.programs?.length ? (
              <p className="vdept__progs"><em>{lb.programs}</em>{d.programs.map((p) => <span key={p}>{p}</span>)}</p>
            ) : <span />}
            <a className="btn" href={href}>{lb.cta}<span className="btn__ic"><Arrow /></span></a>
          </div>
        </div>
      </div>
    </section>
  );
}
