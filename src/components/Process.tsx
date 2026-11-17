'use client';
import { useEffect, useRef, useState } from 'react';
import SectionHead from './SectionHead';

/* «كيف نعمل · من الاحتياج إلى الأثر» — Nov 17, 2026 (Mohamed chose proposal 2 of six): a level timeline. Every step
   sits on one straight line (no step stands higher than another, so the first thing the eye meets is step 1, not the
   last), and above each step a growth bar that rises from the first step to the last carries the idea of growth.
   Laptop: when the row comes into view the steps light up one after another, 1 → n, and the line fills with them.
   Phone: the steps run top to bottom; each lights up as it is scrolled to, never before the one above it.
   One component and one source: the Services page's section (Home's reads it, lib/view.ts sharedSource), edited in
   the admin. Reduced motion or no JavaScript: everything is shown at once. */
type Step = { _key?: string; t?: string; d?: string };
type Data = { index?: string; eyebrow?: string; title?: string; lead?: string; path?: string[]; steps?: Step[] };

const STAGGER = 380; // ms between two steps lighting up

export default function Process({ s }: { s: Data }) {
  const path = (s.path ?? []).filter(Boolean);
  const steps = (s.steps ?? []).filter((x) => x && x.t);
  const n = Math.max(path.length, steps.length);
  const list = useRef<HTMLOListElement>(null);
  const [armed, setArmed] = useState(false); // JS is on: steps wait for their turn
  const [lit, setLit] = useState(-1);         // the last lit step
  const seen = useRef(-1);                    // the furthest step that has been on screen

  useEffect(() => {
    const el = list.current;
    if (!el || !n) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      const id = requestAnimationFrame(() => setLit(n - 1));
      return () => cancelAnimationFrame(id);
    }
    const arm = requestAnimationFrame(() => setArmed(true));
    let timer = 0;
    let shown = -1;
    // light the steps in order, one per STAGGER, up to the furthest one seen
    const step = () => {
      timer = 0;
      if (shown >= seen.current) return;
      shown += 1;
      setLit(shown);
      if (shown < seen.current) timer = window.setTimeout(step, STAGGER);
    };
    const items = Array.from(el.querySelectorAll<HTMLElement>('.gp__item'));
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const k = items.indexOf(en.target as HTMLElement);
        if (k > seen.current) seen.current = k;
        io.unobserve(en.target);
      }
      if (!timer) timer = window.setTimeout(step, shown < 0 ? 150 : STAGGER);
    }, { threshold: 0.6 });
    items.forEach((it) => io.observe(it));
    return () => { cancelAnimationFrame(arm); io.disconnect(); if (timer) clearTimeout(timer); };
  }, [n]);

  if (!n) return null;
  const fill = n > 1 ? Math.max(0, lit) / (n - 1) : 1;
  return (
    <section className="proc section" id="how">
      <div className="wrap">
        <SectionHead index={s.index} eyebrow={s.eyebrow} title={s.title} lead={s.lead} />
        <div className={'gp gp--level' + (armed ? ' is-armed' : '')} style={{ ['--n' as string]: n, ['--fill' as string]: fill, ['--dur' as string]: `${STAGGER}ms` }}>
          <span className="gp__rail" aria-hidden="true"><i /></span>
          <ol ref={list} className="gp__list" aria-label={s.eyebrow || undefined}>
            {Array.from({ length: n }, (_, i) => {
              const st = steps[i];
              return (
                <li key={st?._key ?? i} className={'gp__item' + (i <= lit ? ' is-lit' : '') + (i === n - 1 ? ' gp__item--top' : '')} style={{ ['--k' as string]: i }}>
                  <span className="gp__bar" aria-hidden="true"><b /></span>
                  <span className="gp__node" aria-hidden="true"><b>{i + 1}</b></span>
                  {path[i] && <span className="gp__stage">{path[i]}</span>}
                  {st && (
                    <div className="gp__card">
                      <h3>{st.t}</h3>
                      {st.d && <p>{st.d}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
