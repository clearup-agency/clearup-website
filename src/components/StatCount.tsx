'use client';
import { useEffect, useRef, useState } from 'react';
import { formatFigure, splitFigure } from '@/lib/figures';

/* A figure that counts up from 0 the first time it scrolls into view («+1,200», «164%», «$4.7M+»: the digits count,
   the signs around them stay). The finished figure is what the server sends, what a screen reader reads, and what
   a reduced-motion visitor sees; an invisible copy of it holds the width, so nothing moves while it counts. */
function Parts({ pre, mid, post }: { pre: string; mid: string; post: string }) {
  return <>{pre && <small>{pre}</small>}{mid}{post && <small>{post}</small>}</>;
}

export default function StatCount({ value, ms = 1400 }: { value: string; ms?: number }) {
  const f = splitFigure(value);
  const el = useRef<HTMLSpanElement>(null);
  const [now, setNow] = useState<number | null>(null); // null = the finished figure
  useEffect(() => {
    const node = el.current;
    if (!f || !node || f.num === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') return;
    let raf = 0;
    const run = () => {
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / ms);
        const e = 1 - Math.pow(1 - k, 3);
        if (k < 1) { setNow(f.num * e); raf = requestAnimationFrame(step); } else setNow(null);
      };
      raf = requestAnimationFrame(step);
    };
    // below the fold until it scrolls in: show 0 (one frame after mount; the finished figure is what loads)
    raf = requestAnimationFrame(() => setNow(0));
    const io = new IntersectionObserver((es) => {
      if (es.some((x) => x.isIntersecting)) { io.disconnect(); cancelAnimationFrame(raf); run(); }
    }, { threshold: 0.4 });
    io.observe(node);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  if (!f) return <span className="cnt" dir="ltr">{value}</span>;
  const shown = now === null ? formatFigure(f.num, f.dec, f.comma) : formatFigure(f.dec ? now : Math.round(now), f.dec, f.comma);
  return (
    <span ref={el} className="cnt" dir="ltr">
      <span className="cnt__w" aria-hidden="true"><Parts pre={f.pre} mid={formatFigure(f.num, f.dec, f.comma)} post={f.post} /></span>
      <span className="cnt__v" aria-hidden="true"><Parts pre={f.pre} mid={shown} post={f.post} /></span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
