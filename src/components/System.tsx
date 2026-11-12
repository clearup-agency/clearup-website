'use client';
import { useEffect, useRef, useState } from 'react';
import type { Dict } from '@/lib/dict';
import SrcTag from './SrcTag';
import VideoPlayer from './VideoPlayer';

/**
 * The Clear Up System™ — pinned while you scroll through it. Six stages climb a
 * staircase (Arabic: bottom-left → top-right; English: bottom-right → top-left); the active stage lights up
 * and its deliverables + proof appear. Each stage is also a button.
 */
const X0 = 40, DX = 100, Y0 = 452, DY = 78, S = 58;
// Direction as Mohamed set it (Nov 8, 2026): Arabic climbs left → right (01 bottom-left → 06 top-right);
// English is mirrored, right → left (01 bottom-right → 06 top-left). Always «للأعلى».
const VW = 620;
const stairsMirrored = (lang: string) => lang !== 'ar';
const nodePosOf = (mirror: boolean) => (k: number) => ({ x: mirror ? VW - S - (X0 + k * DX) : X0 + k * DX, y: Y0 - k * DY });
const leaf = (x: number, y: number, s: number) => {
  const r = s * 0.34;
  return `M${x + r} ${y} H${x + s} V${y + s - r} Q${x + s} ${y + s} ${x + s - r} ${y + s} H${x} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
};

type Head = { index?: string; eyebrow?: string; title?: string; lead?: string };

/** THE sticky scroll of the site (Nov 11, 2026 — Mohamed: the five services use the same scroll as the six stages;
 *  one component, no copy). The section is pinned while you scroll through it; each step takes its share of the
 *  scroll, the active one shows in `body`, `viz` draws the other column, the bar under it is the steps' names
 *  (each a button). The six-stage system and «خدماتنا» (Offerings, scroll on) both render through it. */
export function StageScroll({ id, head, names, body, viz, hint, className = '', titleId, ids }: {
  id: string; head: Head; names: string[]; titleId: string; className?: string; hint?: string;
  /** the steps' own anchors (#marketing…): a link to one scrolls to its step */
  ids?: (string | undefined)[];
  body: (active: number) => React.ReactNode;
  viz: (active: number, p: number, go: (k: number) => void) => React.ReactNode;
}) {
  const n = names.length;
  const sec = useRef<HTMLElement>(null);
  const [p, setP] = useState(0); // 0..1 progress through the pinned section

  useEffect(() => {
    const el = sec.current; if (!el) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      setP(Math.min(1, Math.max(0, -r.top / Math.max(1, total))));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);

  const active = Math.min(n - 1, Math.floor(p * n * 0.999));
  const go = (k: number) => {
    const el = document.getElementById(id); if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + total * ((k + 0.5) / n), behavior: 'smooth' });
  };
  // a link to one step (Home's service cards → /services/#marketing) lands on that step
  useEffect(() => {
    if (!ids?.length) return;
    const jump = () => {
      const k = ids.indexOf(decodeURIComponent(location.hash.slice(1)));
      if (k < 0) return;
      const el = sec.current; if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + total * ((k + 0.5) / n) });
    };
    const t = setTimeout(jump, 60);
    window.addEventListener('hashchange', jump);
    return () => { clearTimeout(t); window.removeEventListener('hashchange', jump); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!n) return null;

  return (
    <section ref={sec} className={'system ' + className} id={id} style={{ ['--steps' as any]: n }} aria-labelledby={titleId}>
      <div className="system__pin">
        <div className="wrap system__grid">
          <div className="system__copy">
            <p className="shead__meta">{head.index && <span className="shead__idx">{head.index}</span>}<bdi>{head.eyebrow}</bdi></p>
            <h2 className="h2 h2--sys" id={titleId}>{head.title}</h2>
            {head.lead && <p className="system__lead">{head.lead}</p>}
            <div className="stage" key={active} aria-live="polite">{body(active)}</div>
          </div>
          <div className="system__viz">
            {viz(active, p, go)}
            {hint && <p className="system__hint">{hint}</p>}
          </div>
        </div>
        <div className="wrap system__bar" aria-hidden="true">
          {names.map((name, k) => (
            <button key={k} tabIndex={-1} className={'seg' + (k <= active ? ' is-on' : '')} onClick={() => go(k)}><span>{name}</span></button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function System({ d }: { d: Dict }) {
  const sys = d.system;
  const n = sys.stages.length;
  const mirror = stairsMirrored(d.lang);
  const nodePos = nodePosOf(mirror);
  if (!n) return null;

  // staircase path between nodes; drawn up to the current progress
  let path = '';
  for (let k = 0; k < n; k++) {
    const { x, y } = nodePos(k);
    const cx = x + S / 2, cy = y + S / 2;
    if (k === 0) path = `M${cx} ${cy}`;
    else { const px = nodePos(k - 1).x + S / 2; path += ` H${(px + cx) / 2} V${cy} H${cx}`; }
  }

  return (
    <StageScroll id="system" titleId="system-title" head={sys} names={sys.stages.map((s) => s.name)} hint={sys.hint}
      body={(active) => {
        const st = sys.stages[active];
        return (
          <>
            <p className="stage__n">{st.n} <span>/ 0{n}</span></p>
            <h3 className="stage__name">{st.name}</h3>
            <p className="stage__what">{st.what}</p>
            <p className="stage__lbl">{sys.deliverLabel}</p>
            <ul className="stage__out">{(st.out ?? []).map((o, i) => <li key={i}>{o}</li>)}</ul>
            {st.proof && (
              <p className={'stage__proof' + (st.proofSrc === 'ph' ? ' is-ph' : '')}>
                <span className="stage__lbl">{sys.resultLabel}</span><span data-f={`stages.${active}.proof`}>{st.proof}</span><SrcTag src={st.proofSrc} d={d} />
              </p>
            )}
          </>
        );
      }}
      viz={(active, p, go) => {
        const drawn = Math.min(1, p * 1.08);
        return (
          <svg viewBox="0 0 620 540" className="stairs" role="group" aria-label={sys.eyebrow}>
            <path d={path} className="stairs__track" />
            <path d={path} className="stairs__line" pathLength={1} style={{ strokeDashoffset: 1 - drawn }} />
            {sys.stages.map((s, k) => {
              const { x, y } = nodePos(k);
              const state = k < active ? 'done' : k === active ? 'on' : 'off';
              return (
                <g key={k} className={'node node--' + state} onClick={() => go(k)} role="button" tabIndex={0}
                   onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(k); } }} aria-label={s.name}>
                  <path d={leaf(x, y, S)} className="node__sq" />
                  <text x={x + S / 2} y={y + S / 2 + 6} className="node__n" textAnchor="middle">{s.n}</text>
                  <text x={x + S / 2} y={y - 14} className="node__label" textAnchor="middle">{s.name}</text>
                </g>
              );
            })}
            <g className="stairs__arrow" style={{ opacity: p > 0.9 ? 1 : 0 }}>
              <path d={mirror ? 'M34 70 L14 50 M28 50 H14 V64' : 'M586 70 L606 50 M592 50 H606 V64'} />
            </g>
          </svg>
        );
      }}
    />
  );
}

type SvcVid = { _key?: string; video?: string | null; link?: string | null; poster?: { src: string } | null; label?: string; name?: string };
export type SvcItem = { _key?: string; id?: string; title?: string; en?: string; desc?: string; includes?: string[]; fits?: string; videos?: SvcVid[]; more?: string; moreHref?: string };

/** «خدماتنا» in the sticky scroll (Nov 11, 2026 — Mohamed: the Services page shows the five services the way it
 *  showed the six stages, in order, each with its full explanation and its video). The same StageScroll; the text
 *  and the videos are the services section's own (admin: «الخدمات»), nothing is copied. A video opens full screen. */
export function ServicesScroll({ head, items, lang, labels }: { head: Head; items: SvcItem[]; lang: 'ar' | 'en'; labels: { incl: string; fit: string; proof: string } }) {
  const n = items.length;
  const vidOf = (it: SvcItem) => (it.videos ?? []).find((v) => v && (v.video || v.link));
  const player = (it: SvcItem, cls: string) => {
    const v = vidOf(it);
    return v ? <VideoPlayer key={(it._key ?? '') + cls} item={{ video: v.video ?? null, link: v.link ?? null, image: v.poster?.src ? v.poster : null }} name={v.name || it.title}
      lang={lang} label={v.label || it.title || ''} className={cls} fullscreen /> : null;
  };
  return (
    <StageScroll id="our-services" titleId="services-scroll-title" className="system--svc" head={head} names={items.map((it) => it.title || '')}
      ids={items.map((it, i) => (it.id && /^[a-z0-9-]+$/.test(it.id) ? it.id : 'service-' + (i + 1)))}
      body={(active) => {
        const it = items[active];
        const incl = (it.includes ?? []).filter(Boolean);
        return (
          <>
            <p className="stage__n">0{active + 1} <span>/ 0{n}</span></p>
            <div className="stage__row">
              <h3 className="stage__name">{it.title}{it.en && <bdi className="stage__en" dir="ltr">{it.en}</bdi>}</h3>
              {player(it, 'stage__vid-m')}
            </div>
            {it.desc && <p className="stage__what">{it.desc}</p>}
            {incl.length > 0 && <><p className="stage__lbl">{labels.incl}</p><ul className="stage__out">{incl.map((x, k) => <li key={k}>{x}</li>)}</ul></>}
            {it.fits && <><p className="stage__lbl">{labels.fit}</p><p className="stage__fits">{it.fits}</p></>}
            {/* «…ست مراحل» pointed at the six-stage section this scroll replaces (#system, hidden): left out here */}
            {it.more && it.moreHref && it.moreHref !== '#system' && <a className="link stage__more" href={it.moreHref}>{it.more}</a>}
          </>
        );
      }}
      viz={(active) => {
        const it = items[active];
        const v = vidOf(it);
        return (
          <div className="svcviz" key={active}>
            {v ? (<><p className="svcviz__h">{labels.proof}</p>{player(it, 'svcviz__vid')}</>) : <span className="svcviz__n" aria-hidden="true">0{active + 1}</span>}
          </div>
        );
      }}
    />
  );
}
