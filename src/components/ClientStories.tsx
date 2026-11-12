'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { cdnImage, cdnVideo, storyEmbed, storyPoster } from '@/lib/cdn';
import { numDir } from '@/lib/rules';
import { youtubeIsShort } from '@/lib/links';
import SectionHead from './SectionHead';

/* «أعمال عملائنا» as Instagram stories: a row of client logos in gradient rings; tapping one opens a
   full-screen viewer that flips through that client's works (images 5 s each, videos their own length).
   Page weight: only the small logo thumbnails load with the page (lazy); a story's image/video is fetched
   when it is opened, plus the next item's image/poster as a preload. Nothing else. */

type Img = { src: string; alt?: string; width?: number; height?: number };
type Item = { _key?: string; image?: Img | null; video?: string | null; link?: string | null; caption?: string; duration?: number; quote?: string };
/** person / role / metric / thumb / more: a testimonial story (TestimonialStories below) — shown over the video */
type Client = { _key?: string; name?: string; logo?: Img | null; items?: Item[]; href?: string; person?: string; role?: string; metric?: { v: string; l: string } | null; thumb?: string; more?: string };
type Data = { index?: string; eyebrow?: string; title?: string; lead?: string; hint?: string; clients?: Client[]; _rule?: { show: boolean; ready: number } };
type Lang = 'ar' | 'en';

const T = {
  ar: {
    list: 'أعمال العملاء كقصص', open: (n: string) => `شاهد أعمال ${n}`, viewer: (n: string) => `أعمال ${n}`,
    close: 'إغلاق', next: 'العمل التالي', prev: 'العمل السابق', nextClient: 'العميل التالي', prevClient: 'العميل السابق',
    pause: 'إيقاف مؤقت', play: 'متابعة', mute: 'كتم الصوت', unmute: 'تشغيل الصوت',
    pos: (i: number, n: number) => `العمل ${i} من ${n}`, work: (n: string, i: number) => `${n} — عمل ${i}`,
    loading: 'جارٍ التحميل…', failed: 'تعذّر تحميل هذا العمل', seen: 'شوهدت', page: (n: string) => `صفحة ${n}: القصة كاملة`,
    tlist: 'آراء العملاء كقصص', wlist: 'أعمالنا كقصص', topen: (n: string) => `شاهد رأي ${n}`, more: 'القصة كاملة',
  },
  en: {
    list: 'Client work as stories', open: (n: string) => `View ${n}'s work`, viewer: (n: string) => `${n}'s work`,
    close: 'Close', next: 'Next work', prev: 'Previous work', nextClient: 'Next client', prevClient: 'Previous client',
    pause: 'Pause', play: 'Resume', mute: 'Mute', unmute: 'Unmute',
    pos: (i: number, n: number) => `Work ${i} of ${n}`, work: (n: string, i: number) => `${n} — work ${i}`,
    loading: 'Loading…', failed: 'This work could not be loaded', seen: 'viewed', page: (n: string) => `${n}: the full story`,
    tlist: 'Client testimonials as stories', wlist: 'Our work as stories', topen: (n: string) => `Watch ${n}`, more: 'The full story',
  },
};

const noop = () => {};
const IMAGE_MS = 5000;
const EMBED_MS = 15000; // an Instagram post has no clock we can read: 15 s unless the admin set its seconds
const SEEN_KEY = 'cu-stories-seen';
const keyOf = (c: Client, i: number) => c._key || c.name || String(i);
const hasMedia = (it: Item | undefined) => !!it && !!(it.video || it.image?.src || storyEmbed(it.link) || it.quote?.trim());
// what an item plays: its own video, else a YouTube/Instagram link, else its image
const kindOf = (it: Item): 'video' | 'youtube' | 'instagram' | 'image' => (it.video ? 'video' : storyEmbed(it.link)?.kind ?? 'image');

// which clients this visitor already watched (grey ring), kept in this browser only
const seenRaw = () => { try { return localStorage.getItem(SEEN_KEY) || '[]'; } catch { return '[]'; } };
const seenSub = (cb: () => void) => { window.addEventListener('cu-seen', cb); window.addEventListener('storage', cb); return () => { window.removeEventListener('cu-seen', cb); window.removeEventListener('storage', cb); }; };
function addSeen(k: string) {
  try {
    const list: string[] = JSON.parse(seenRaw());
    if (list.includes(k)) return;
    localStorage.setItem(SEEN_KEY, JSON.stringify([...list, k].slice(-200)));
    window.dispatchEvent(new Event('cu-seen'));
  } catch { /* private mode: rings just stay coloured */ }
}

function preload(it: Item | undefined) {
  if (!it) return;
  const e = !it.video ? storyEmbed(it.link) : null;
  const src = it.video ? storyPoster(it) : e?.kind === 'youtube' ? `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg` : it.image?.src ? cdnImage(it.image.src, 1080) : '';
  if (src) { const im = new Image(); im.decoding = 'async'; im.src = src; }
}

export default function ClientStories({ s, lang, hrefs }: { s: Data; lang?: string; hrefs?: Record<string, string> }) {
  const L: Lang = lang === 'en' ? 'en' : 'ar';
  const t = T[L];
  // works only (a client's testimonial and project story live on its own page and in «آراء العملاء»)
  const clients = (s.clients ?? []).filter((c) => c && (c.items ?? []).some(hasMedia))
    .map((c) => ({ _key: c._key, name: c.name, logo: c.logo, items: (c.items ?? []).filter(hasMedia), href: (c._key && hrefs?.[c._key]) || undefined }));
  const [open, setOpen] = useState<{ c: number; i: number } | null>(null);
  const raw = useSyncExternalStore(seenSub, seenRaw, () => '[]');
  const seen = useMemo<string[]>(() => { try { return JSON.parse(raw); } catch { return []; } }, [raw]);
  const opener = useRef<HTMLButtonElement | null>(null);
  const rings = useRef<(HTMLButtonElement | null)[]>([]);
  const ringOf = useCallback((ci: number) => rings.current[ci] ?? null, []);
  const markSeen = useCallback((k: string) => addSeen(k), []);

  if (!clients.length && !s._rule) return null;
  return (
    <section className="cstories section section--tight" id="client-works">
      <div className="wrap">
        {(s.title || s.eyebrow) && <SectionHead dark index={s.index} eyebrow={s.eyebrow} title={s.title} lead={s.lead} />}
        <ul className="cstories__tray" aria-label={t.list}>
          {clients.map((c, ci) => {
            const k = keyOf(c, ci);
            const isSeen = seen.includes(k);
            return (
              <li key={k}>
                <button type="button" className={'sring' + (isSeen ? ' is-seen' : '')} ref={(el) => { rings.current[ci] = el; }}
                  aria-label={t.open(c.name || '') + (isSeen ? ' · ' + t.seen : '')}
                  onClick={(e) => { opener.current = e.currentTarget; setOpen({ c: ci, i: 0 }); }}>
                  <span className="sring__ring" aria-hidden="true">
                    <span className="sring__in">
                      {c.logo?.src
                        ? <img src={cdnImage(c.logo.src, 160, true)} alt="" width={80} height={80} loading="lazy" decoding="async" />
                        : <b>{(c.name || '?').trim().charAt(0)}</b>}
                    </span>
                  </span>
                  <span className="sring__name">{c.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {s.hint && <p className="cstories__hint">{s.hint}</p>}
        {/* admin preview only: why visitors don't see this section yet (lib/rules.ts) */}
        {s._rule && !s._rule.show && (
          <p className="ph-admin cstories__rule">{L === 'ar'
            ? `مخفي عن الزوار حتى تضيف أول عميل حقيقي له عمل واحد على الأقل. العملاء التجريبيون لا يظهرون للزوار.`
            : `Hidden from visitors until the first real client has at least one work. Sample clients never show.`}</p>
        )}
      </div>
      {open && createPortal(
        <Viewer clients={clients} start={open} lang={L} onSeen={(ci) => markSeen(keyOf(clients[ci], ci))} originOf={ringOf}
          onClose={() => { setOpen(null); requestAnimationFrame(() => opener.current?.focus()); }} />,
        document.body,
      )}
    </section>
  );
}

type VProps = {
  clients: (Client & { items: Item[] })[]; start: { c: number; i: number }; lang: Lang; onClose: () => void; onSeen: (c: number) => void;
  /** the ring/tile a client's story opened from: the viewer grows out of it and shrinks back into it */
  originOf?: (c: number) => HTMLElement | null;
};

// the visitor's own sound choice, kept across stories and across openings during this visit
const soundPref = { off: false };
// what a story shows before it plays: the same URL the viewer itself uses, so a preload is a cache hit
const posterOf = (it: Item | undefined): string => {
  if (!it) return '';
  if (it.video) return storyPoster(it);
  const e = storyEmbed(it.link);
  if (e?.kind === 'youtube') return `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`;
  return it.image?.src ? cdnImage(it.image.src, 1080) : '';
};
const TURN_MS = 340; // one cube turn between clients
const EASE = 'cubic-bezier(.22,.8,.24,1)';
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function Viewer({ clients, start, lang, onClose, onSeen, originOf }: VProps) {
  const t = T[lang];
  const rtl = lang === 'ar';
  const [pos, setPos] = useState(start);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const [sliding, setSliding] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(soundPref.off);
  // a YouTube player that never reports (blocked, offline, «sign in» wall) falls back to a plain timer
  const [noClock, setNoClock] = useState(false);
  const client = clients[pos.c];
  const items = client.items;
  const many = clients.reduce((n, c) => n + (c.items?.length ?? 0), 0) > 1;
  const item = items[pos.i];
  const root = useRef<HTMLDivElement>(null);
  const cube = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const elapsed = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  const yt = useRef<HTMLIFrameElement>(null);
  const ytInfo = useRef<{ t: number; d: number; state: number }>({ t: 0, d: 0, state: -1 });
  // the cube: p = how far it has turned toward the next client (+1) or the previous one (−1); dy = dragged down
  const turn = useRef({ p: 0, dy: 0, busy: false, settle: false, closing: false });
  const stopped = paused || held || sliding;
  const kind = kindOf(item);
  // a testimonial written down with no video: its quote is the slide (runs like an image)
  const textOnly = kind === 'image' && !item.image?.src && !!item.quote;
  const embed = kind === 'youtube' || kind === 'instagram' ? storyEmbed(item.link) : null;
  const calm = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // ——— the cube (transform only: no layout, no React render while a finger moves) ———
  const paint = useCallback((p: number, dy: number, ms = 0, keep = false) => {
    const el = cube.current;
    if (!el) return;
    turn.current.p = p; turn.current.dy = dy;
    const w = el.offsetWidth, h = el.offsetHeight || 1;
    el.style.setProperty('--half', `${w / 2}px`);
    el.style.transition = ms ? `transform ${ms}ms ${EASE}` : 'none';
    const turning = p !== 0 || keep;
    el.classList.toggle('is-turning', turning);
    const down = dy > 0 ? `translate3d(0, ${dy}px, 0) scale(${1 - (Math.min(dy, h) / h) * 0.28}) ` : '';
    el.style.transform = turning ? `${down}translateZ(${-w / 2}px) rotateY(${p * (rtl ? 90 : -90)}deg)` : down;
    root.current?.style.setProperty('--fade', String(dy > 0 ? clamp(1 - dy / h, 0.15, 1) : 1));
  }, [rtl]);
  const animate = useCallback((p: number, dy: number, ms: number, keep = true) => new Promise<void>((res) => {
    const el = cube.current;
    if (!el || ms <= 0) { paint(p, dy, 0, keep); res(); return; }
    let done = false;
    const fin = (e?: TransitionEvent) => {
      if (done || (e && e.target !== el)) return;
      done = true; el.removeEventListener('transitionend', fin); res();
    };
    el.addEventListener('transitionend', fin);
    window.setTimeout(() => fin(), ms + 80);
    requestAnimationFrame(() => paint(p, dy, ms, keep));
  }), [paint]);

  // ——— navigation ———
  const go = useCallback((c: number, i: number) => { elapsed.current = 0; setReady(false); setFailed(false); setNoClock(false); setPos({ c, i }); }, []);
  // close: shrink back into the client's ring (or drop away), then unmount
  const close = useCallback(() => {
    const tr = turn.current;
    if (tr.closing) return;
    tr.closing = true;
    const el = cube.current, rootEl = root.current;
    if (calm || !el || !rootEl || typeof el.animate !== 'function') { onClose(); return; }
    video.current?.pause();
    const o = originOf?.(pos.c)?.getBoundingClientRect();
    const w = el.offsetWidth || 1;
    const onScreen = o && o.width > 0 && o.bottom > 0 && o.top < window.innerHeight;
    const to = onScreen
      ? `translate(${o.left + o.width / 2 - window.innerWidth / 2}px, ${o.top + o.height / 2 - window.innerHeight / 2}px) scale(${o.width / w})`
      : `translate3d(0, ${Math.round(window.innerHeight * 0.35)}px, 0) scale(.6)`;
    rootEl.classList.add('is-closing');
    const from = el.style.transform && !el.classList.contains('is-turning') ? el.style.transform : 'none';
    el.style.transition = 'none';
    el.animate([{ transform: from, opacity: 1 }, { transform: to, opacity: onScreen ? 0.2 : 0 }], { duration: 260, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    rootEl.animate([{ backgroundColor: getComputedStyle(rootEl).backgroundColor }, { backgroundColor: 'rgba(0,0,0,0)' }], { duration: 260, easing: 'ease-out', fill: 'forwards' })
      .finished.then(onClose, onClose);
  }, [calm, onClose, originOf, pos.c]);
  // to a neighbour client: the cube turns (like Instagram), then the story behind that face starts
  const turnTo = useCallback(async (dir: 1 | -1, i = 0) => {
    const tr = turn.current;
    const c = pos.c + dir;
    if (tr.busy || tr.closing) return;
    if (c < 0 || c >= clients.length) { if (dir > 0) close(); return; }
    if (calm) { go(c, i); return; }
    tr.busy = true;
    if (tr.p === 0) paint(0, 0, 0, true);
    await animate(dir, 0, Math.max(150, Math.round(TURN_MS * (1 - Math.abs(tr.p)))));
    tr.settle = true; // the layout effect below puts the cube back flat before the new client paints
    go(c, i);
  }, [pos.c, clients.length, calm, go, paint, animate, close]);
  useLayoutEffect(() => {
    const tr = turn.current;
    if (!tr.settle) return;
    tr.settle = false; tr.busy = false;
    paint(0, 0);
    setSliding(false);
  }, [pos.c, paint]);

  const nextClient = useCallback(() => { if (pos.c < clients.length - 1) turnTo(1); else close(); }, [pos, clients.length, turnTo, close]);
  const prevClient = useCallback(() => { if (pos.c > 0) turnTo(-1); else go(pos.c, 0); }, [pos, turnTo, go]);
  const next = useCallback(() => {
    if (turn.current.busy) return;
    if (pos.i < items.length - 1) go(pos.c, pos.i + 1); else nextClient();
  }, [pos, items.length, go, nextClient]);
  const prev = useCallback(() => {
    if (turn.current.busy) return;
    if (pos.i > 0) go(pos.c, pos.i - 1);
    else if (pos.c > 0) turnTo(-1, clients[pos.c - 1].items.length - 1);
    else { elapsed.current = 0; if (video.current) video.current.currentTime = 0; }
  }, [pos, go, turnTo, clients]);

  useEffect(() => { onSeen(pos.c); }, [pos.c, onSeen]);
  // preload only the next item (its image or video poster); its video is buffered by the hidden <video> below
  useEffect(() => {
    preload(items[pos.i + 1] ?? clients[pos.c + 1]?.items[0]);
  }, [pos, items, clients]);
  const upNext = items[pos.i + 1] ?? clients[pos.c + 1]?.items[0];

  // ——— open: grow out of the ring that was tapped ———
  useLayoutEffect(() => {
    const el = cube.current;
    if (calm || !el || typeof el.animate !== 'function') return;
    const o = originOf?.(start.c)?.getBoundingClientRect();
    if (!o || !o.width) return;
    const w = el.offsetWidth || 1;
    el.animate([
      { transform: `translate(${o.left + o.width / 2 - window.innerWidth / 2}px, ${o.top + o.height / 2 - window.innerHeight / 2}px) scale(${o.width / w})`, opacity: 0.3 },
      { transform: 'none', opacity: 1 },
    ], { duration: 300, easing: EASE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ——— the clock: images run IMAGE_MS (or their own seconds); videos follow their own time ———
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const dur = item.duration && item.duration > 0 ? item.duration * 1000 : kind === 'instagram' || kind === 'youtube' ? EMBED_MS : IMAGE_MS;
    const tick = (now: number) => {
      const dt = now - last; last = now;
      let p = 0;
      if (kind === 'video' && !failed) {
        const v = video.current;
        p = v && v.duration ? v.currentTime / v.duration : 0;
      } else if (kind === 'youtube' && !failed && !noClock) {
        const y = ytInfo.current;
        p = y.d ? y.t / y.d : 0;
      } else {
        if (!stopped && (ready || textOnly) && !document.hidden) elapsed.current += dt;
        p = elapsed.current / dur;
        if (p >= 1) { next(); return; }
      }
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, p)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [item, kind, ready, textOnly, stopped, failed, noClock, next]);

  // one <video> for every story: changing its src keeps the sound the first tap allowed (iPhone included);
  // a play refused with sound retries muted
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (stopped || !ready) { v.pause(); return; }
    v.muted = muted;
    v.play().catch(() => { if (!v.muted) { v.muted = true; setMuted(true); v.play().catch(() => {}); } });
  }, [stopped, ready, muted, pos]);

  // YouTube: its iframe reports time/duration/state by postMessage once we say we're listening
  const ytCmd = useCallback((func: string) => {
    yt.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
  }, []);
  useEffect(() => {
    if (kind !== 'youtube') return;
    ytInfo.current = { t: 0, d: 0, state: -1 };
    const onMsg = (e: MessageEvent) => {
      if (!/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin) || e.source !== yt.current?.contentWindow) return;
      let m: { event?: string; info?: { currentTime?: number; duration?: number; playerState?: number } } | null = null;
      try { m = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
      const info = m?.info;
      if (!info || typeof info !== 'object') return;
      if (typeof info.currentTime === 'number') ytInfo.current.t = info.currentTime;
      if (typeof info.duration === 'number' && info.duration > 0) ytInfo.current.d = info.duration;
      if (typeof info.playerState === 'number') {
        ytInfo.current.state = info.playerState;
        if (info.playerState === 1) setReady(true);
        if (info.playerState === 0) next();
      }
    };
    window.addEventListener('message', onMsg);
    // keep saying "listening" until the player answers (it ignores messages sent before it loads)
    const hello = window.setInterval(() => {
      yt.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'cu-story', channel: 'widget' }), '*');
      if (ytInfo.current.d) window.clearInterval(hello);
    }, 400);
    const giveUp = window.setTimeout(() => { if (!ytInfo.current.d) { setNoClock(true); setReady(true); } }, 8000);
    return () => { window.removeEventListener('message', onMsg); window.clearInterval(hello); window.clearTimeout(giveUp); };
  }, [kind, pos, next]);
  useEffect(() => {
    if (kind !== 'youtube') return;
    ytCmd(stopped ? 'pauseVideo' : 'playVideo');
  }, [kind, stopped, ytCmd]);
  useEffect(() => {
    if (kind !== 'youtube' || !ready) return;
    ytCmd(muted ? 'mute' : 'unMute'); // starts muted (so it may autoplay); sound on after it plays, unless muted
  }, [kind, ready, muted, ytCmd]);

  // ——— keyboard, focus, scroll lock (iPhone too: the page under the viewer never moves) ———
  useEffect(() => {
    closeBtn.current?.focus({ preventScroll: true });
    const html = document.documentElement, body = document.body, el = root.current;
    const was = [html.style.overflow, body.style.overflow, html.style.overscrollBehavior];
    html.style.overflow = 'hidden'; body.style.overflow = 'hidden'; html.style.overscrollBehavior = 'none';
    const still = (e: TouchEvent) => { if (e.cancelable) e.preventDefault(); };
    el?.addEventListener('touchmove', still, { passive: false });
    return () => {
      [html.style.overflow, body.style.overflow, html.style.overscrollBehavior] = was;
      el?.removeEventListener('touchmove', still);
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      const fwd = rtl ? 'ArrowLeft' : 'ArrowRight';
      const back = rtl ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === fwd) { e.preventDefault(); next(); }
      else if (e.key === back) { e.preventDefault(); prev(); }
      else if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); nextClient(); }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); prevClient(); }
      else if ((e.key === ' ' || e.key === 'k') && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); setPaused((p) => !p); }
      else if (e.key === 'Tab' && root.current) {
        // keep focus inside the viewer
        const f = Array.from(root.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
        if (!f.length) return;
        const first = f[0], lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rtl, next, prev, nextClient, prevClient, close]);

  // ——— gestures, like Instagram ———
  // tap: the reading-start third goes back, the rest forward (mouse: halves). In Arabic the start is the RIGHT
  // edge, mirrored like Instagram's own Arabic layout, where the bars also fill from the right.
  // hold = pause (the overlay hides), release = play on; a short press still counts as a tap.
  // sideways drag = the cube follows the finger to the next/previous client; drag down = the story shrinks
  // away and closes.
  const g = useRef<{ x: number; y: number; t: number; hold: number; held: boolean; axis: '' | 'x' | 'y' | 'up'; lx: number; ly: number; lt: number; vx: number; vy: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || turn.current.busy || turn.current.closing) return;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* not supported */ }
    const hold = window.setTimeout(() => { if (g.current && !g.current.axis) { g.current.held = true; setHeld(true); } }, 200);
    const now = performance.now();
    g.current = { x: e.clientX, y: e.clientY, t: now, hold, held: false, axis: '', lx: e.clientX, ly: e.clientY, lt: now, vx: 0, vy: 0 };
  };
  const onMove = (e: React.PointerEvent) => {
    const s0 = g.current;
    if (!s0) return;
    const now = performance.now();
    const dtm = Math.max(1, now - s0.lt);
    s0.vx = 0.7 * ((e.clientX - s0.lx) / dtm) + 0.3 * s0.vx; s0.vy = 0.7 * ((e.clientY - s0.ly) / dtm) + 0.3 * s0.vy;
    s0.lx = e.clientX; s0.ly = e.clientY; s0.lt = now;
    const dx = e.clientX - s0.x, dy = e.clientY - s0.y;
    if (!s0.axis) {
      if (Math.abs(dx) < 9 && Math.abs(dy) < 9) return;
      // a finger that starts moving is a swipe, not a hold
      clearTimeout(s0.hold);
      if (s0.held) { s0.held = false; setHeld(false); }
      s0.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : dy > 0 ? 'y' : 'up';
      if (s0.axis !== 'up') setSliding(true);
    }
    if (s0.axis === 'x') {
      const w = cube.current?.offsetWidth || window.innerWidth;
      let p = (rtl ? dx : -dx) / w; // + = toward the next client
      if ((p > 0 && pos.c >= clients.length - 1) || (p < 0 && pos.c <= 0)) p *= 0.22; // nothing there: a rubber band
      paint(clamp(p, -1, 1), 0);
    } else if (s0.axis === 'y') paint(0, Math.max(0, dy));
  };
  const onUp = (e: React.PointerEvent) => {
    const s0 = g.current; g.current = null;
    if (!s0) return;
    clearTimeout(s0.hold);
    const tr = turn.current;
    if (s0.axis === 'x') {
      const p = tr.p, v = rtl ? s0.vx : -s0.vx; // px/ms toward the next client
      const fwd = p > 0.22 || (v > 0.35 && p > 0.02), back = p < -0.22 || (v < -0.35 && p < -0.02);
      if (fwd && pos.c < clients.length - 1) { turnTo(1); return; }
      if (back && pos.c > 0) { turnTo(-1); return; }
      if (fwd) { close(); return; } // past the last client, like Instagram
      animate(0, 0, 220).then(() => { paint(0, 0); setSliding(false); });
      return;
    }
    if (s0.axis === 'y') {
      if (tr.dy > 110 || (s0.vy > 0.5 && tr.dy > 30)) { close(); return; }
      animate(0, 0, 220, false).then(() => { paint(0, 0); setSliding(false); });
      return;
    }
    if (s0.axis === 'up') return;
    const pressed = performance.now() - s0.t;
    if (s0.held) { setHeld(false); if (pressed > 320) return; }
    const r = (stage.current ?? (e.currentTarget as HTMLElement)).getBoundingClientRect();
    const fromStart = rtl ? (r.right - e.clientX) / r.width : (e.clientX - r.left) / r.width;
    // a finger: the start third goes back (as before); a mouse click: the start half goes back, the end half forward
    if (fromStart < (e.pointerType === 'mouse' ? 0.5 : 0.3)) prev(); else next();
  };
  const onCancel = () => {
    const s0 = g.current;
    if (s0) { clearTimeout(s0.hold); g.current = null; }
    setHeld(false);
    if (!turn.current.busy && !turn.current.closing && (turn.current.p || turn.current.dy)) animate(0, 0, 220).then(() => { paint(0, 0); setSliding(false); });
    else setSliding(false);
  };
  const tap = { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onCancel, onContextMenu: (e: React.MouseEvent) => e.preventDefault() };

  // pause while the tab is hidden (videos too)
  useEffect(() => {
    const vis = () => { if (document.hidden) video.current?.pause(); else if (!stopped && ready) video.current?.play().catch(() => {}); };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [stopped, ready]);

  const label = t.work(client.name || '', pos.i + 1);
  const imgSrc = item.image?.src ? cdnImage(item.image.src, 1080) : '';
  const poster = kind === 'video' ? posterOf(item) : '';
  const nextVideo = upNext?.video ? cdnVideo(upNext.video) : '';
  return (
    <div ref={root} className="sview" role="dialog" aria-modal="true" aria-label={t.viewer(client.name || '')} dir={rtl ? 'rtl' : 'ltr'}>
      {/* desktop, like Instagram: the neighbour clients as small rings (client jump) outside the arrows; the arrows step works */}
      <Peek c={clients[pos.c - 1]} side="prev" label={t.prevClient} onClick={prevClient} />
      {/* the side arrows only when there is something to step to (one testimonial video = no arrows; Mohamed, Nov 8) */}
      {many && <button type="button" className="sview__side sview__side--prev" onClick={prev} disabled={pos.c === 0 && pos.i === 0} aria-label={t.prev}><Chev back rtl={rtl} /></button>}
      <div ref={cube} className="sview__cube">
        {/* the neighbours' faces of the cube: their first story's picture + name (seen only while it turns) */}
        <Ghost c={clients[pos.c - 1]} side="prev" />
        <Ghost c={clients[pos.c + 1]} side="next" />
      <div ref={stage} className={'sview__stage' + (stopped ? ' is-paused' : '') + (held ? ' is-held' : '')}>
        <div className="sview__bars" aria-hidden="true" key={pos.c}>
          {items.map((it, i) => (
            <span key={it._key ?? i} className={'sview__bar' + (i < pos.i ? ' is-done' : '')}>
              <i ref={i === pos.i ? (el) => { bar.current = el; } : undefined} style={i === pos.i ? { transform: 'scaleX(0)' } : undefined} />
            </span>
          ))}
        </div>
        <div className="sview__head">
          {client.href ? (
            /* the client's avatar + name open its page (the full story), like a profile in Instagram stories */
            <a className="sview__who sview__who--link" href={client.href} aria-label={t.page(client.name || '')} title={t.page(client.name || '')}>
              <span className="sview__logo"><Face c={client} size={80} px={32} /></span>
              <span className="sview__name">{client.name}<Chev rtl={rtl} small /></span>
              <span className="sview__pos">{pos.i + 1}/{items.length}</span>
            </a>
          ) : (
            <span className="sview__who">
              <span className="sview__logo"><Face c={client} size={80} px={32} /></span>
              <span className="sview__name">{client.name}</span>
              <span className="sview__pos">{pos.i + 1}/{items.length}</span>
            </span>
          )}
          <span className="sview__ctl">
            {(kind === 'video' || kind === 'youtube') && (
              <button type="button" className="sview__btn" onClick={() => { soundPref.off = !muted; setMuted(!muted); }} aria-label={muted ? t.unmute : t.mute} aria-pressed={muted}>
                {muted ? <IcMuted /> : <IcSound />}
              </button>
            )}
            <button type="button" className="sview__btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? t.play : t.pause} aria-pressed={paused}>
              {paused ? <IcPlay /> : <IcPause />}
            </button>
            <button type="button" ref={closeBtn} className="sview__btn" onClick={close} aria-label={t.close}><IcClose /></button>
          </span>
        </div>
        <div className="sview__media">
          {/* the story's still frame sits under the video, so a story change never flashes black */}
          {poster && <img className="sview__under" src={poster} alt="" aria-hidden="true" draggable={false} />}
          {kind === 'video' ? (
            <video ref={video} src={cdnVideo(item.video)} poster={poster || undefined} playsInline preload="auto" muted={muted}
              aria-label={item.caption || label}
              onLoadedData={() => setReady(true)} onEnded={next} onError={() => { setFailed(true); setReady(true); }} />
          ) : embed?.kind === 'instagram' ? (
            /* Instagram's player as a 9:16 window: its header, caption and white card are cropped away, so only
               the reel shows (a link the import couldn't copy — e.g. a private post — lands here) */
            <div className="sview__igbox">
              <iframe key={embed.src} className="sview__embed sview__embed--instagram" src={embed.src} scrolling="no"
                title={item.caption || label} allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin"
                onLoad={() => setReady(true)} />
            </div>
          ) : embed ? (
            /* YouTube, loaded only now (when this story is open): a Short fills the 9:16 frame; a wide video is shown
               whole over a blurred copy of its own thumbnail instead of black bars */
            <div className={'sview__ytbox' + (youtubeIsShort(item.link ?? '') ? ' is-tall' : '')} style={{ ['--yt' as string]: `url(https://i.ytimg.com/vi/${embed.id}/hqdefault.jpg)` }}>
              <iframe key={embed.src} ref={yt} className={'sview__embed sview__embed--' + embed.kind} src={embed.src}
                title={item.caption || label} allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" />
            </div>
          ) : imgSrc ? (
            <img src={imgSrc} alt={item.image?.alt || item.caption || label} decoding="async"
              onLoad={() => setReady(true)} onError={() => { setFailed(true); setReady(true); }} draggable={false} />
          ) : textOnly ? (
            <blockquote className="sview__quote">{item.quote}</blockquote>
          ) : null}
          {!ready && !textOnly && <span className="sview__spin" role="status" aria-label={t.loading} />}
          {failed && <p className="sview__err">{t.failed}</p>}
          {item.caption && <p className="sview__cap">{item.caption}</p>}
          {/* the next story's video, buffering while this one plays (only while the viewer is open) */}
          {nextVideo && nextVideo !== cdnVideo(item.video) && <video className="sview__pre" src={nextVideo} preload="auto" muted playsInline aria-hidden="true" tabIndex={-1} />}
        </div>
        {/* the tap layer (over the media; an Instagram post keeps its middle clickable for its own play button) */}
        {kind === 'instagram' ? (
          <>
            <div className="sview__tap sview__tap--start" {...tap} />
            <div className="sview__tap sview__tap--end" {...tap} />
          </>
        ) : (
          <div className="sview__tap" {...tap} />
        )}
        {/* a testimonial: the result → what they said → who said it → «القصة كاملة» (only what is filled) */}
        {(client.metric || (item.quote && !textOnly) || client.person || client.role || (client.href && client.more)) && (
          <div className="sview__info">
            {client.metric && <p className="sview__metric"><b dir={numDir(client.metric.v)}>{client.metric.v}</b><span>{client.metric.l}</span></p>}
            {item.quote && !textOnly && <p className="sview__q">{item.quote}</p>}
            {(client.person || client.role) && <p className="sview__by">{client.person && <b>{client.person}</b>}{client.role && <span>{client.role}</span>}</p>}
            {client.href && client.more && <a className="sview__more" href={client.href}>{client.more}<Chev rtl={rtl} small /></a>}
          </div>
        )}
        <p className="sr-only" aria-live="polite">{client.name} · {t.pos(pos.i + 1, items.length)}</p>
        <span className="sview__kbd">
          <button type="button" className="sr-only sr-focus" onClick={prev}>{t.prev}</button>
          <button type="button" className="sr-only sr-focus" onClick={next}>{t.next}</button>
        </span>
      </div>
      </div>
      {many && <button type="button" className="sview__side sview__side--next" onClick={next} aria-label={t.next}><Chev rtl={rtl} /></button>}
      <Peek c={clients[pos.c + 1]} side="next" label={t.nextClient} onClick={nextClient} />
    </div>
  );
}

// a neighbour client's face on the cube: its first story's still + avatar and name, as the viewer will show it
function Ghost({ c, side }: { c?: Client & { items: Item[] }; side: 'prev' | 'next' }) {
  if (!c) return null;
  const it = c.items[0];
  const src = posterOf(it);
  return (
    <div className={'sview__ghost sview__ghost--' + side} aria-hidden="true">
      {src ? <img src={src} alt="" decoding="async" draggable={false} /> : it?.quote ? <blockquote className="sview__quote">{it.quote}</blockquote> : null}
      <div className="sview__head">
        <span className="sview__who">
          <span className="sview__logo"><Face c={c} size={80} px={32} /></span>
          <span className="sview__name">{c.name}</span>
        </span>
      </div>
    </div>
  );
}

// a client's small round picture: its logo, else (a testimonial) the frame of its video, else its first letter
function Face({ c, size, px }: { c: Client; size: number; px: number }) {
  if (c.logo?.src) return <img src={cdnImage(c.logo.src, size, true)} alt="" width={px} height={px} loading="lazy" decoding="async" />;
  if (c.thumb) return <img src={c.thumb} alt="" width={px} height={px} loading="lazy" decoding="async" />;
  return <b>{(c.name || '?').trim().charAt(0)}</b>;
}

// a neighbour client beside the viewer on desktop (hidden on phones): its logo ring + name; jumps to that client
function Peek({ c, side, label, onClick }: { c?: Client; side: 'prev' | 'next'; label: string; onClick: () => void }) {
  if (!c) return <span className={'sview__peek sview__peek--' + side + ' is-empty'} aria-hidden="true" />;
  return (
    <button type="button" className={'sview__peek sview__peek--' + side} onClick={onClick} aria-label={label + ': ' + (c.name || '')} title={c.name || ''}>
      <span className="sview__peek-ring"><Face c={c} size={96} px={48} /></span>
      <span className="sview__peek-name">{c.name}</span>
    </button>
  );
}

const sv = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
const IcClose = () => <svg {...sv}><path d="M6 6l12 12M18 6L6 18" /></svg>;
const IcPause = () => <svg {...sv}><path d="M9 5v14M15 5v14" /></svg>;
const IcPlay = () => <svg {...sv}><path d="M8 5l11 7-11 7z" fill="currentColor" /></svg>;
const IcSound = () => <svg {...sv}><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 010 7" /></svg>;
const IcMuted = () => <svg {...sv}><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17 9l5 6M22 9l-5 6" /></svg>;
// «back» points to the reading start (right in Arabic, left in English)
const Chev = ({ back, rtl, small }: { back?: boolean; rtl: boolean; small?: boolean }) => (
  <svg {...sv} width={small ? 14 : 28} height={small ? 14 : 28} className={small ? 'sview__go' : undefined}><path d={(back ? !rtl : rtl) ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} /></svg>
);

// ——— the same viewer elsewhere: a client's works as a grid (its page) and one video (a testimonial) ———
const thumbOf = (it: Item): string => {
  if (it.video) return storyPoster(it, 540);
  const e = storyEmbed(it.link);
  if (e?.kind === 'youtube') return `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`;
  return it.image?.src ? cdnImage(it.image.src, 540) : '';
};

/** A client's works as a grid of 9:16 tiles; a tile opens the story viewer at that work. */
export function StoryGrid({ client, lang, label }: { client: Client; lang?: string; label?: string }) {
  const L: Lang = lang === 'en' ? 'en' : 'ar';
  const t = T[L];
  const items = (client.items ?? []).filter(hasMedia);
  const [open, setOpen] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const one = useMemo(() => [{ ...client, href: undefined, items }], [client, items]);
  if (!items.length) return null;
  return (
    <>
      <ul className="wgrid" aria-label={label}>
        {items.map((it, i) => {
          const th = thumbOf(it);
          const k = kindOf(it);
          return (
            <li key={it._key ?? i}>
              <button type="button" className="wgrid__tile" onClick={(e) => { opener.current = e.currentTarget; setOpen(i); }} aria-label={t.work(client.name || '', i + 1)}>
                {th ? <img src={th} alt={it.image?.alt || it.caption || ''} width={270} height={480} loading="lazy" decoding="async" /> : <span className="wgrid__blank" aria-hidden="true">{k === 'instagram' ? 'Instagram' : ''}</span>}
                {k !== 'image' && <span className="clip__play" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
      {open !== null && createPortal(
        <Viewer clients={one} start={{ c: 0, i: open }} lang={L} onSeen={noop} originOf={() => opener.current} onClose={() => { setOpen(null); requestAnimationFrame(() => opener.current?.focus()); }} />,
        document.body,
      )}
    </>
  );
}

/** «آراء العملاء» as Instagram stories: one round avatar per client with a testimonial (the frame of their
 *  video, a ring in ClearUp's purple, the name under it, the result as a small badge); tapping opens the same
 *  full-screen viewer as the client works and runs on to the next client by itself. Only the small avatars load
 *  with the page; a video is fetched when its story is opened (plus the next one's poster). The list is built
 *  on the server by lib/tstories.ts (empty fields left out, nothing invented). */
export function TestimonialStories({ clients, lang, kind = 'testimonial' }: { clients: Client[]; lang?: string; kind?: 'testimonial' | 'work' }) {
  const L: Lang = lang === 'en' ? 'en' : 'ar';
  const t = T[L];
  // the Work page's row: «شاهد أعمال …» instead of «شاهد رأي …»
  const openLabel = kind === 'work' ? t.open : t.topen;
  const listLabel = kind === 'work' ? t.wlist : t.tlist;
  const list = useMemo(() => clients
    .map((c) => ({ ...c, items: (c.items ?? []).filter(hasMedia), more: c.href ? t.more : undefined }))
    .filter((c) => c.items.length > 0), [clients, t.more]);
  const [open, setOpen] = useState<number | null>(null);
  const raw = useSyncExternalStore(seenSub, seenRaw, () => '[]');
  const seen = useMemo<string[]>(() => { try { return JSON.parse(raw); } catch { return []; } }, [raw]);
  const opener = useRef<HTMLButtonElement | null>(null);
  const rings = useRef<(HTMLButtonElement | null)[]>([]);
  const ringOf = useCallback((ci: number) => rings.current[ci] ?? null, []);
  const pre = kind === 'work' ? 'w:' : 't:';
  const tkey = (c: Client, i: number) => pre + keyOf(c, i);
  const markSeen = useCallback((ci: number) => addSeen(pre + keyOf(list[ci], ci)), [list, pre]);
  if (!list.length) return null;
  return (
    <>
      <ul className={'tstories' + (kind === 'work' ? ' tstories--work' : '')} aria-label={listLabel}>
        {list.map((c, ci) => {
          const isSeen = seen.includes(tkey(c, ci));
          const who = c.person || c.name || '';
          const sub = c.person ? c.name : c.role;
          return (
            <li key={tkey(c, ci)} data-rec-story={c._key || undefined} data-rec-case={c._key || undefined}>
              <button type="button" className={'sring tring' + (isSeen ? ' is-seen' : '')} ref={(el) => { rings.current[ci] = el; }}
                aria-label={openLabel(who) + (c.person && c.name ? ' · ' + c.name : '') + (isSeen ? ' · ' + t.seen : '')}
                onClick={(e) => { opener.current = e.currentTarget; setOpen(ci); }}>
                <span className="sring__ring" aria-hidden="true">
                  <span className="sring__in">
                    {c.thumb
                      ? <img src={c.thumb} alt="" width={160} height={160} loading="lazy" decoding="async" />
                      : c.logo?.src ? <img src={cdnImage(c.logo.src, 160, true)} alt="" width={80} height={80} loading="lazy" decoding="async" />
                        : <b>{who.trim().charAt(0) || '?'}</b>}
                  </span>
                  {c.metric && <span className="tring__badge" dir={numDir(c.metric.v)}>{c.metric.v}</span>}
                </span>
                <span className="sring__name">{who}</span>
                {sub && <span className="tring__sub">{sub}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {open !== null && createPortal(
        <Viewer clients={list} start={{ c: open, i: 0 }} lang={L} onSeen={markSeen} originOf={ringOf}
          onClose={() => { setOpen(null); requestAnimationFrame(() => opener.current?.focus()); }} />,
        document.body,
      )}
    </>
  );
}
