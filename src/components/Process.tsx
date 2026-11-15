'use client';
import { useEffect, useRef, useState } from 'react';
import SectionHead from './SectionHead';

/* «كيف نعمل · من الفرصة إلى النمو، خطوة بخطوة» — redesigned Nov 8, 2026 (Mohamed: it looked like the six-stage
   system right after it). A growth path: the steps sit on a rising line (desktop) / a timeline (phone), each with
   its stage from the method (الفرصة ← الاستراتيجية ← الاختبار ← نموذج العمل ← النمو) above it; as the visitor
   scrolls, the line draws itself and each step lights up when the line reaches it. One component and one source:
   the Services page's section (Home's reads it, lib/view.ts sharedSource), edited in the admin. Transform/stroke
   only, one passive scroll listener while the section is on screen; reduced motion = drawn and lit at once. */
type Step = { _key?: string; t?: string; d?: string };
type Data = { index?: string; eyebrow?: string; title?: string; lead?: string; path?: string[]; steps?: Step[] };

// a smooth line through the points (Catmull-Rom → cubic Bézier)
function smooth(p: { x: number; y: number }[]) {
  if (p.length < 2) return '';
  let d = `M${p[0].x},${p[0].y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i], b = p[i], c = p[i + 1], e = p[i + 2] ?? c;
    d += ` C${b.x + (c.x - a.x) / 6},${b.y + (c.y - a.y) / 6} ${c.x - (e.x - b.x) / 6},${c.y - (e.y - b.y) / 6} ${c.x},${c.y}`;
  }
  return d;
}

export default function Process({ s }: { s: Data }) {
  const path = (s.path ?? []).filter(Boolean);
  const steps = (s.steps ?? []).filter((x) => x && x.t);
  const n = Math.max(path.length, steps.length);
  const box = useRef<HTMLDivElement>(null);
  const line = useRef<SVGPathElement>(null);
  const [geo, setGeo] = useState<{ w: number; h: number; d: string; at: number[] } | null>(null);
  const [lit, setLit] = useState(-1);
  // Nov 15, 2026 (Ghadir: «أول خطوة بتشوفها عين المشاهد هي 5»): on a laptop the path climbs, so step 5 sat highest
  // and entered the screen first. Now the section holds still (sticky) while the visitor scrolls through it: the
  // line draws from 1 to 5 and each step appears only when the line reaches it. Only when the whole section fits
  // the screen; otherwise it scrolls normally and the steps still appear in order. Phones: the timeline already
  // runs top to bottom, 1 → 5.
  const sec = useRef<HTMLElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [pin, setPin] = useState(false);

  useEffect(() => {
    const fit = () => {
      const el = inner.current;
      if (!el) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const wide = window.matchMedia('(min-width: 901px)').matches;
      setPin(!reduce && wide && n >= 2 && el.scrollHeight <= window.innerHeight - 96);
    };
    fit();
    window.addEventListener('resize', fit);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => window.removeEventListener('resize', fit);
  }, [n]);

  // measure the nodes → the line through them (again on resize / font load)
  useEffect(() => {
    const el = box.current;
    if (!el || n < 2) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const pts = Array.from(el.querySelectorAll<HTMLElement>('.gp__node')).map((nd) => {
        const q = nd.getBoundingClientRect();
        return { x: q.left - r.left + q.width / 2, y: q.top - r.top + q.height / 2 };
      });
      if (pts.length < 2) return;
      // how far along the line each node sits (0…1), by the line's own length between nodes
      const segs = pts.slice(1).map((q, i) => Math.hypot(q.x - pts[i].x, q.y - pts[i].y));
      const total = segs.reduce((a, b) => a + b, 0) || 1;
      let acc = 0;
      const at = [0, ...segs.map((x) => (acc += x) / total)];
      setGeo({ w: r.width, h: r.height, d: smooth(pts), at });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [n]);

  // scroll → how much of the line is drawn, which steps are lit
  useEffect(() => {
    const el = box.current, ln = line.current;
    if (!el || !ln || !geo) return;
    const len = ln.getTotalLength();
    ln.style.strokeDasharray = `${len}`;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ln.style.strokeDashoffset = '0';
      const id = requestAnimationFrame(() => setLit(n - 1));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const paint = () => {
      raf = 0;
      const vh = window.innerHeight;
      let p: number;
      const st = sec.current;
      if (pin && st) {
        // held on screen: the scroll through the section is the progress (step 1 is on from the start)
        const r = st.getBoundingClientRect();
        p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
      } else {
        const r = el.getBoundingClientRect();
        if (r.height < vh * 0.6) {
          // laptop, not held (a short screen): starts once step 1 (the lowest) is on screen, done when the path's
          // top reaches 15 % of the screen
          p = Math.min(1, Math.max(0, (vh * 0.95 - r.bottom) / Math.max(1, vh * 0.8 - r.height)));
        } else {
          // phone timeline (1 at the top): starts when its top passes 80 % of the screen, done at 55 %
          p = Math.min(1, Math.max(0, (vh * 0.8 - r.top) / Math.max(1, r.height + vh * 0.25)));
        }
      }
      ln.style.strokeDashoffset = `${len * (1 - p)}`;
      let k = -1;
      geo.at.forEach((a, i) => { if (p >= a - 0.001) k = i; });
      setLit(k);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(paint); };
    let listening = false;
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !listening) { listening = true; window.addEventListener('scroll', on, { passive: true }); on(); }
      else if (!en.isIntersecting && listening) { listening = false; window.removeEventListener('scroll', on); on(); }
    }, { rootMargin: '20% 0px 20% 0px' });
    io.observe(sec.current ?? el);
    paint();
    return () => { io.disconnect(); window.removeEventListener('scroll', on); if (raf) cancelAnimationFrame(raf); };
  }, [geo, n, pin]);

  if (!n) return null;
  return (
    <section ref={sec} className={'proc section' + (pin ? ' proc--pin' : '')} id="how">
      <div className="proc__pin"><div className="wrap" ref={inner}>
        <SectionHead index={s.index} eyebrow={s.eyebrow} title={s.title} lead={s.lead} />
        <div ref={box} className={'gp' + (geo ? ' is-drawn' : '')} style={{ ['--n' as string]: n }}>
          {geo && (
            <svg className="gp__svg" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden="true">
              <path className="gp__rail" d={geo.d} />
              <path ref={line} className="gp__line" d={geo.d} />
            </svg>
          )}
          <ol className="gp__list" aria-label={s.eyebrow || undefined}>
            {Array.from({ length: n }, (_, i) => {
              const st = steps[i];
              return (
                <li key={st?._key ?? i} className={'gp__item' + (i <= lit ? ' is-lit' : '') + (i === n - 1 ? ' gp__item--top' : '')} style={{ ['--k' as string]: i }}>
                  {path[i] && <span className="gp__stage">{path[i]}</span>}
                  <span className="gp__node" aria-hidden="true"><b>{i + 1}</b></span>
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
      </div></div>
    </section>
  );
}
