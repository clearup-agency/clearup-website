'use client';
import { useEffect, useRef, useState } from 'react';
import SectionHead from '../SectionHead';
import { Arrow } from '../Mark';
import { Ph, vhref } from './Blocks';

/* «تبدأ صغيراً، وتكبر بقرارك» — the programmes as a journey of three stages (Mohamed chose option A of three,
   Nov 23, 2026, after the sticky scroll showed too much text at once):
     1 ابدأ          — the AI Accelerator, the funded first step (the item with id "start")
     2 اختر برنامجك  — the nine programmes as short cards (number, name, promise, department), filtered by
                       department; a card opens a side panel (a bottom sheet on phones) with what it includes,
                       the role of AI, the expected impact and «احجز» (the booking form, its department pre-selected)
     3 انمُ معنا      — «شريك النمو» (the item with id "partner") as a wide band with its cycle
   Everything the programmes say is kept; only the details wait until asked for. */

type Item = { id?: string; d?: string; tag?: string; t: string; promise?: string; includes?: string[]; ai?: string; impact?: string[]; choices?: string; rows?: { k: string; v: string }[]; cycle?: string[] | string; text?: string; proof?: string; cta?: { label?: string; href?: string } };
type Data = {
  anchor?: string; eyebrow?: string; title?: string; lead?: string; items?: Item[];
  stages?: { n: string; t: string }[];
  labels?: { includes?: string; ai?: string; impact?: string; choices?: string; all?: string; more?: string; book?: string; close?: string; count?: string };
};

const two = (k: number) => String(k).padStart(2, '0');
const LEAVE = 280; // ms the leaving cards take

export default function ProgramsJourney({ s, lang }: { s: Data; lang: 'ar' | 'en' }) {
  const all = (s.items ?? []).filter((x) => x && x.t);
  const start = all.find((x) => x.id === 'start');
  const partner = all.find((x) => x.id === 'partner');
  const progs = all.filter((x) => x !== start && x !== partner);
  const depts = Array.from(new Set(progs.map((p) => p.d).filter(Boolean))) as string[];
  const lb = s.labels ?? {};
  const st = s.stages ?? [];
  // the filter (Nov 24, 2026, Mohamed: the other programmes leave, then the chosen ones come in — not dimmed):
  // `dept` is the pressed button, `shown` the filter the grid is laid out with; for LEAVE ms in between the cards
  // that do not belong play their way out, then the grid re-lays and the cards play in (staggered)
  const [dept, setDept] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [round, setRound] = useState(0);
  const timer = useRef(0);
  const choose = (d: string | null) => {
    if (d === dept) return;
    setDept(d);
    setLeaving(true);
    window.clearTimeout(timer.current);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    timer.current = window.setTimeout(() => { setShown(d); setLeaving(false); setRound((r) => r + 1); }, reduce ? 0 : LEAVE);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const [open, setOpen] = useState<number | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const lastCard = useRef<HTMLElement | null>(null);

  // the panel: Escape closes it, the page behind does not scroll, focus goes in and comes back to the card
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('keydown', onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    closeBtn.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = prev;
      lastCard.current?.focus();
    };
  }, [open]);

  const p = open === null ? null : progs[open];
  const cycle = partner ? (Array.isArray(partner.cycle) ? partner.cycle : String(partner.cycle ?? '').split('←').map((x) => x.trim()).filter(Boolean)) : [];
  const stage = (i: number) => st[i] ? <div className="pj__stage"><span>{st[i].n}</span><h3>{st[i].t}</h3></div> : null;

  return (
    <section className="pj section" id={s.anchor || 'programs'}>
      <div className="wrap">
        <SectionHead eyebrow={s.eyebrow} title={s.title} lead={s.lead} />
        {st.length > 0 && (
          <ol className="pj__steps" aria-hidden="true">
            {st.map((x) => <li key={x.n}><b>{x.n}</b>{x.t.split(':')[0]}</li>)}
          </ol>
        )}

        {start && (
          <div className="pj__block" id="start">
            {stage(0)}
            <div className="pj__start" data-reveal>
              <div>
                {start.tag && <span className="pj__tag">{start.tag}</span>}
                <h4>{start.t}</h4>
                {start.promise && <p><Ph t={start.promise} /></p>}
                {(start.rows ?? []).map((r, i) => <p key={i} className="pj__row"><b>{r.k}: </b><Ph t={r.v} /></p>)}
                {start.cta?.label && <a className="btn btn--light btn--lg" href={vhref(start.cta.href, lang)}>{start.cta.label}<span className="btn__ic"><Arrow /></span></a>}
              </div>
              {(start.includes ?? []).length > 0 && <ul>{start.includes!.map((x, i) => <li key={i}>{x}</li>)}</ul>}
            </div>
          </div>
        )}

        <div className="pj__block">
          {stage(1)}
          {depts.length > 1 && (
            <div className="pj__filter" role="group" aria-label={st[1]?.t}>
              <button type="button" aria-pressed={dept === null} className={dept === null ? 'is-on' : ''} onClick={() => choose(null)}>{lb.all}</button>
              {depts.map((d) => <button key={d} type="button" aria-pressed={dept === d} className={dept === d ? 'is-on' : ''} onClick={() => choose(dept === d ? null : d)}>{d}</button>)}
            </div>
          )}
          <ol className="pj__grid" aria-live="polite">
            {progs.map((x, i) => {
              if (shown !== null && x.d !== shown) return null;
              const out = leaving && dept !== null && x.d !== dept;
              const k = progs.slice(0, i).filter((y) => shown === null || y.d === shown).length; // its place, for the stagger
              return (
                <li key={x.t + '-' + round} id={x.id} className={'pj__cell' + (out ? ' is-out' : round > 0 ? ' is-in' : '')} style={{ ['--k' as string]: k }}>
                  <button type="button" className="pj__card" aria-haspopup="dialog" tabIndex={out ? -1 : 0}
                    onClick={(e) => { lastCard.current = e.currentTarget; setOpen(i); }}>
                    {x.d && <span className="pj__dept">{x.d}</span>}
                    <span className="pj__n num">{two(i + 1)}</span>
                    <span className="pj__t">{x.t}</span>
                    {x.promise && <span className="pj__p">{x.promise}</span>}
                    <span className="pj__more">{lb.more} ←</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {partner && (
          <div className="pj__block" id="partner">
            {stage(2)}
            <div className="pj__partner" data-reveal>
              <div>
                <h4>{partner.t}</h4>
                {partner.text && <p><Ph t={partner.text} /></p>}
              </div>
              {cycle.length > 0 && <ol className="pj__cycle">{cycle.map((c) => <li key={c}>{c}</li>)}</ol>}
              {partner.cta?.label && <a className="btn btn--light btn--lg" href={vhref(partner.cta.href, lang)}>{partner.cta.label}<span className="btn__ic"><Arrow /></span></a>}
            </div>
          </div>
        )}
      </div>

      <div className={'pj__scrim' + (p ? ' is-open' : '')} onClick={() => setOpen(null)} aria-hidden="true" />
      <aside className={'pj__drawer' + (p ? ' is-open' : '')} role="dialog" aria-modal="true" aria-hidden={!p} aria-labelledby="pj-title">
        {p && open !== null && (
          <>
            <button ref={closeBtn} type="button" className="pj__x" onClick={() => setOpen(null)} aria-label={lb.close}>×</button>
            <p className="pj__n num">{two(open + 1)}</p>
            {p.d && <p className="pj__dept pj__dept--in">{p.d}</p>}
            <h4 id="pj-title">{p.t}</h4>
            {p.promise && <p className="pj__promise"><Ph t={p.promise} /></p>}
            {(p.includes ?? []).length > 0 && <div className="pj__blk"><h5>{lb.includes}</h5><ul>{p.includes!.map((x, k) => <li key={k}>{x}</li>)}</ul></div>}
            {p.choices && <div className="pj__blk"><h5>{lb.choices}</h5><p><Ph t={p.choices} /></p></div>}
            {p.ai && <div className="pj__blk pj__blk--ai"><h5>{lb.ai}</h5><p><Ph t={p.ai} /></p></div>}
            {(p.impact ?? []).length > 0 && <div className="pj__blk pj__blk--impact"><h5>{lb.impact}</h5><ul>{p.impact!.map((x, k) => <li key={k}>{x}</li>)}</ul></div>}
            {p.proof && <p className="pj__proof"><Ph t={p.proof} /></p>}
            <a className="btn btn--lg pj__book" href={vhref(`/contact/?focus=${encodeURIComponent(p.d || '')}#book`, lang)}>{lb.book}<span className="btn__ic"><Arrow /></span></a>
          </>
        )}
      </aside>
    </section>
  );
}
