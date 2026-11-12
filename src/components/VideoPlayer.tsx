'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { cdnFrame, cdnImage, cdnVideo, storyEmbed, storyPoster } from '@/lib/cdn';

/** What a video is, as the admin stores it: the file itself (Cloudinary mp4), a YouTube/Instagram link, a poster. */
export type VideoItem = { video?: string | null; link?: string | null; image?: { src: string; alt?: string; width?: number; height?: number } | null; caption?: string };

type Props = {
  item: VideoItem | null | undefined;
  /** who is speaking (the button's name for screen readers) */
  name?: string;
  /** the words on the poster («شاهد …») */
  label: string;
  /** the admin's click-to-edit field for the label */
  labelField?: string;
  /** the × button's name (default: «إغلاق» / Close by `lang`) */
  close?: string;
  lang?: 'ar' | 'en';
  /** show the poster stored with the video before a frame of the video itself (the hero clip, a case's other videos) */
  posterFirst?: boolean;
  className?: string;
  /** card (default): the 9:16 poster box (.tvid) — every video card on the site (testimonial cards, client pages,
   *  services, «قصص أخرى»). clip: the hero's 9:16 intro card (.clip__media), which plays in place. */
  variant?: 'card' | 'clip';
  /** poster = the video file's own frame at this second (a clean frame instead of an uploaded poster); left out = the usual poster */
  posterAt?: number;
  /** the poster's intrinsic size (layout hint only) */
  posterSize?: [number, number];
  /** the poster is the first big picture on the page (the hero clip, a case page's top video): fetched first and at
   *  the size the screen needs (srcset), so it paints sooner on a phone. `sizes` is its displayed width. */
  priority?: { sizes: string };
  /** controlled open state (the hero clip closes on a tap outside it); uncontrolled when left out */
  open?: boolean;
  onOpenChange?: (on: boolean) => void;
  /** Nov 11, 2026 (Mohamed: «عملاؤنا يحكون» — a click makes the video full screen and it plays at once, with sound):
   *  the player goes true full screen inside the click (requestFullscreen; on an iPhone the <video>'s own
   *  webkitEnterFullscreen); leaving full screen pauses it and puts the poster back. */
  fullscreen?: boolean;
};

type FsVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitDisplayingFullscreen?: boolean };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
const fsElement = () => document.fullscreenElement ?? (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement ?? null;
/** Full screen on the player, from inside the user's click; false when the browser offers none. */
function goFullscreen(v: FsVideo): boolean {
  const el = v as unknown as FsEl;
  try {
    if (el.requestFullscreen) { el.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions)?.catch?.(() => { v.webkitEnterFullscreen?.(); }); return true; }
    if (el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); return true; }
    if (v.webkitEnterFullscreen) { v.webkitEnterFullscreen(); return true; }
  } catch { /* plays in place */ }
  return false;
}

const pauseOthers = (me?: HTMLVideoElement | null) =>
  document.querySelectorAll<HTMLVideoElement>('video[data-vplayer]').forEach((v) => { if (v !== me) v.pause(); });

/** THE video component of the site (Nov 11, 2026 — Mohamed: one component for the video card and its player,
 *  used everywhere a video shows; no copies). A poster with a play button; a click plays the video right there:
 *  - a video file (Cloudinary mp4): starts inside the click itself, with sound and its own controls (a browser that
 *    refuses sound gets it muted — never a second tap on play); it stays on its last frame when it ends;
 *  - a YouTube link: YouTube's player in the same box;
 *  - an Instagram reel (its player cannot sit in a small box): a plain centred player with Instagram's own controls;
 *  - any other link: opens in a new tab.
 *  Nothing moves on or closes by itself: × (or Esc / a click outside for the centred player) closes it. Playing one
 *  video pauses any other. Nothing loads until the click. */
export default function VideoPlayer({ item, name, label, labelField, close: closeLabel, lang, className = '', variant = 'card', posterFirst, posterAt, posterSize = [432, 768], priority, open, onOpenChange, fullscreen }: Props) {
  const close = closeLabel || (lang === 'en' ? 'Close' : 'إغلاق');
  const [own, setOwn] = useState(false);
  const on = open ?? own;
  const setOn = (v: boolean) => { if (open === undefined) setOwn(v); onOpenChange?.(v); };
  const el = useRef<HTMLElement | null>(null);
  const vid = useRef<HTMLVideoElement | null>(null);
  const src = item?.video ? cdnVideo(item.video) : '';
  const embed = !src ? storyEmbed(item?.link) : null;
  const yt = embed?.kind === 'youtube' ? embed : null;
  const ig = embed?.kind === 'instagram' ? embed : null;
  const href = !src && !embed && typeof item?.link === 'string' && /^https?:\/\//i.test(item.link.trim()) ? item.link.trim() : '';
  const base = variant === 'clip' ? 'clip__media' : 'tvid';
  useEffect(() => {
    if (!on || !ig) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOn(false); };
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    pauseOthers();
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); document.documentElement.style.overflow = prev; requestAnimationFrame(() => el.current?.focus()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, ig]);
  useEffect(() => {
    if (ig) return;
    el.current?.closest('.tvcard')?.classList.toggle('is-playing', on);
    const v = vid.current;
    if (!on || !v || !v.paused) return;
    v.play()?.catch(() => { v.muted = true; v.play()?.catch(() => { /* the controls are there */ }); });
  }, [on, ig]);
  // full-screen players: leaving full screen (Esc, the browser's own button, iPhone's «Done») pauses and closes
  useEffect(() => {
    if (!fullscreen || !on) return;
    const v = vid.current as FsVideo | null;
    if (!v) return;
    let was = false;
    const onFs = () => {
      const now = fsElement() === v || !!v.webkitDisplayingFullscreen;
      if (now) was = true;
      else if (was) { v.pause(); setOn(false); }
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    v.addEventListener('webkitbeginfullscreen', onFs);
    v.addEventListener('webkitendfullscreen', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
      v.removeEventListener('webkitbeginfullscreen', onFs);
      v.removeEventListener('webkitendfullscreen', onFs);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen, on]);
  // the video goes in and starts inside the click itself (iPhones only allow sound from inside the tap)
  const start = () => {
    if (ig || !src) { setOn(true); return; }
    flushSync(() => setOn(true));
    const v = vid.current;
    if (!v) return;
    v.muted = false;
    pauseOthers(v);
    if (fullscreen) goFullscreen(v as FsVideo);
    v.play()?.catch(() => { v.muted = true; v.play()?.catch(() => { /* the controls are there */ }); });
  };
  if (!item) return null;
  const w = variant === 'clip' ? 720 : 540;
  const frame = posterAt !== undefined && item.video ? cdnFrame(item.video, w, false, posterAt) : '';
  const posterAtW = (pw: number) => (posterAt !== undefined && item.video ? cdnFrame(item.video, pw, false, posterAt) : '') ||
    ((posterFirst || variant === 'clip') && item.image?.src ? cdnImage(item.image.src, pw) : storyPoster(item, pw));
  const poster = frame || posterAtW(w);
  // the same picture at smaller widths (Cloudinary resizes it); only when the CDN actually makes the sizes
  const set = priority ? [360, 480, w].map((pw) => [posterAtW(pw), pw] as const) : [];
  const srcSet = set.length && new Set(set.map(([u]) => u)).size === set.length ? set.map(([u, pw]) => `${u} ${pw}w`).join(', ') : undefined;
  const imgHints = priority
    ? { loading: 'eager' as const, fetchPriority: 'high' as const, ...(srcSet ? { srcSet, sizes: priority.sizes } : {}) }
    : { loading: (variant === 'clip' ? 'eager' : 'lazy') as 'eager' | 'lazy' };
  const aria = label + (name ? ': ' + name : '');
  const face = (
    <>
      {poster ? <img src={poster} alt="" width={posterSize[0]} height={posterSize[1]} {...imgHints} decoding="async" /> : <span className="tvid__blank" aria-hidden="true" />}
      <span className="clip__play" aria-hidden="true" />
      {variant === 'card' && <span className="tvid__label" data-f={labelField}>{label}</span>}
    </>
  );
  // a still with nothing to play: just the picture
  if (!src && !yt && !ig && !href) return poster ? <span className={base + ' ' + className}><img src={poster} alt={item.image?.alt || ''} width={posterSize[0]} height={posterSize[1]} {...(priority ? imgHints : { loading: 'lazy' as const })} decoding="async" /></span> : null;
  if (href) return <a className={base + ' ' + className} href={href} target="_blank" rel="noopener" aria-label={aria}>{face}</a>;
  if (!on || ig) {
    return (
      <>
        <button type="button" ref={(n) => { el.current = n; }} className={base + ' ' + className} onClick={start} aria-label={aria}>{face}</button>
        {on && ig && createPortal(
          <div className="tvmodal" role="dialog" aria-modal="true" aria-label={aria} onClick={(e) => { if (e.target === e.currentTarget) setOn(false); }}>
            <div className="tvmodal__box">
              <iframe className="sview__embed sview__embed--instagram" src={ig.src} title={label} scrolling="no"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            </div>
            <button type="button" className="tvid__x tvmodal__x" onClick={() => setOn(false)} aria-label={close} title={close} autoFocus>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>,
          document.body,
        )}
      </>
    );
  }
  return (
    <div ref={(n) => { el.current = n; }} className={base + (variant === 'card' ? ' tvid--on ' : ' ') + className}>
      {src ? (
        <video ref={vid} data-vplayer="" src={src} poster={poster || undefined} controls autoPlay playsInline preload="auto" aria-label={label}
          onPlay={(e) => pauseOthers(e.currentTarget)} />
      ) : yt ? (
        <iframe src={`https://www.youtube-nocookie.com/embed/${yt.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`} title={label}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      ) : null}
      {variant === 'card' && (
        <button type="button" className="tvid__x" onClick={() => setOn(false)} aria-label={close} title={close}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      )}
    </div>
  );
}
