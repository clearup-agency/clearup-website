'use client';
import { useEffect, useRef, useState } from 'react';
import type { Dict } from '@/lib/dict';
import { Arrow } from './Mark';
import SectionHead from './SectionHead';

/** Clarity Audit — 5 taps, one diagnosis. In production the answers ride into the booking form. */
export default function Audit({ d }: { d: Dict }) {
  const a = d.audit;
  const [step, setStep] = useState(0);
  const [ans, setAns] = useState<number[]>([]);
  const done = step >= a.qs.length;
  // the clicked option unmounts with its question: move focus to the next question / the result,
  // otherwise keyboard and screen-reader users are dropped back to the top of the page
  const acted = useRef(false);
  const focusRef = useRef<HTMLElement | null>(null);
  const setFocus = (el: HTMLElement | null) => { focusRef.current = el; };
  useEffect(() => { if (acted.current) focusRef.current?.focus(); }, [step]);
  const pick = (i: number) => { acted.current = true; setAns([...ans.slice(0, step), i]); setStep(step + 1); };
  let leak: keyof typeof a.leaks = 'channel';
  if (done) {
    if (ans[3] === 2 || ans[2] === 3) leak = 'data';
    else if (ans[4] >= 1) leak = 'follow';
  }
  return (
    <section className="audit section" id="audit">
      <div className="wrap audit__grid">
        <SectionHead index={a.index} eyebrow={a.eyebrow} title={a.title} lead={a.lead} />
        <div className="quiz" data-reveal>
          <ol className="quiz__steps" aria-hidden="true">
            {a.qs.map((_, i) => <li key={i} className={i < step ? 'is-done' : i === step ? 'is-on' : ''} />)}
          </ol>
          {!done ? (
            <div className="quiz__q" key={step}>
              <p className="quiz__n">{step + 1} / {a.qs.length}</p>
              <h3 ref={setFocus} tabIndex={-1}>{a.qs[step].q}</h3>
              <div className="quiz__opts">
                {a.qs[step].a.map((o, i) => (<button key={o} className="opt" onClick={() => pick(i)}>{o}</button>))}
              </div>
            </div>
          ) : (
            <div className="quiz__res">
              <p className="quiz__n" ref={setFocus} tabIndex={-1}>{a.result}</p>
              <p className="quiz__leak">{a.leaks[leak]}</p>
              <div className="cta-row">
                <a className="btn btn--lg" href={d.links?.book ?? '#book'}>{a.book}<span className="btn__ic"><Arrow /></span></a>
                <button className="btn btn--ghost btn--lg" onClick={() => { acted.current = true; setStep(0); setAns([]); }}>{a.restart}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
