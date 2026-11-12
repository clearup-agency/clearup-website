'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** «عملاؤنا يحكون» as one row (Nov 11, 2026 — Mohamed: the same card size whether there are 2 videos or 10; 4 in a
 *  row on a laptop, 3 on a tablet; more than that scroll sideways): a scroll-snap row of fixed-size cards. Arrows on
 *  a laptop when the row is longer than the screen; a phone swipes (about 1.4 cards on screen). RTL-aware. */
export default function TestimonialRail({ children, prev, next, className = '' }: { children: ReactNode; prev: string; next: string; className?: string }) {
  const track = useRef<HTMLUListElement | null>(null);
  const [st, setSt] = useState({ over: false, atStart: true, atEnd: false });
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const upd = () => {
      const max = el.scrollWidth - el.clientWidth;
      const x = Math.abs(el.scrollLeft);
      setSt((o) => {
        const n = { over: max > 2, atStart: x < 4, atEnd: x > max - 4 };
        return o.over === n.over && o.atStart === n.atStart && o.atEnd === n.atEnd ? o : n;
      });
    };
    upd();
    el.addEventListener('scroll', upd, { passive: true });
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    // a card added or removed (the admin preview re-renders the row) changes the scroll width, not the box
    const mo = new MutationObserver(upd);
    mo.observe(el, { childList: true });
    return () => { el.removeEventListener('scroll', upd); ro.disconnect(); mo.disconnect(); };
  }, []);
  // one screenful of cards per click; "next" runs toward the reading end (left in Arabic)
  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector('li');
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const w = card ? card.getBoundingClientRect().width + gap : el.clientWidth;
    const step = w * Math.max(1, Math.floor((el.clientWidth + gap) / w));
    const rtl = getComputedStyle(el).direction === 'rtl';
    el.scrollBy({ left: dir * step * (rtl ? -1 : 1), behavior: 'smooth' });
  };
  const chev = <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>;
  return (
    <div className={'tvrail' + (st.over ? ' is-over' : '') + (className ? ' ' + className : '')}>
      <ul ref={track} className="tvcards tvrail__track">{children}</ul>
      {st.over && (
        <>
          <button type="button" className="tvrail__btn tvrail__btn--prev" onClick={() => go(-1)} disabled={st.atStart} aria-label={prev} title={prev}>{chev}</button>
          <button type="button" className="tvrail__btn tvrail__btn--next" onClick={() => go(1)} disabled={st.atEnd} aria-label={next} title={next}>{chev}</button>
        </>
      )}
    </div>
  );
}
