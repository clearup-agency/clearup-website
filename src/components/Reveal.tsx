'use client';
import { useEffect } from 'react';
/** Phones: the bottom bar («احجز مكالمة» + WhatsApp, MobileBar) waits while the hero's own two buttons are on screen and
 *  slides in once they have scrolled away (Mohamed, Nov 12, 2026: five buttons on one first screen read as clutter).
 *  The bar starts hidden by CSS on a page that has the hero buttons (globals.css «mbar»), so nothing flashes; this only
 *  flips html[data-mbar-on]. Pages without a hero keep the bar from the start.
 *  v2 (same day, «بدي يختفي بطريقة أسلس»): a small hysteresis band — on once the buttons are ON_PX above the top edge,
 *  off only when they are OFF_PX back in view — so a finger resting near the edge can't make it blink; the CSS glides
 *  and fades it. One passive scroll listener, read once per frame; it writes only when the state really changes. */
const ON_PX = 24;
const OFF_PX = 40;
function useBarAfterHero() {
  useEffect(() => {
    const cta = document.querySelector<HTMLElement>('.hl__cta');
    const root = document.documentElement;
    if (!cta) { root.setAttribute('data-mbar-on', ''); return () => root.removeAttribute('data-mbar-on'); }
    let on = false;
    let raf = 0;
    const check = () => {
      raf = 0;
      const bottom = cta.getBoundingClientRect().bottom;
      const next = on ? bottom < OFF_PX : bottom < -ON_PX;
      if (next !== on) { on = next; root.toggleAttribute('data-mbar-on', on); }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
      root.removeAttribute('data-mbar-on');
    };
  }, []);
}

/** One shared IntersectionObserver: [data-reveal] elements rise up-right into place once. */
export default function Reveal() {
  useBarAfterHero();
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return null;
}
