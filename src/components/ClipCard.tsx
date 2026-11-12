'use client';
import { useEffect, useRef, useState } from 'react';
import type { Dict } from '@/lib/dict';
import { VIDEO_MODE } from '@/content';
import VideoPlayer from './VideoPlayer';
// The hero's intro video (Nov 11, 2026 landing hero: it takes the place of the animated logo): a tall 9:16 card,
// real face, plays only on tap — at once, with sound (no autoplay weight). Media comes from the CMS (hero → «الفيديو
// في الواجهة»): mp4 file, poster and/or an Instagram/YouTube link. The poster is a clean frame of the video itself
// («الغلاف: لقطة من الفيديو عند الثانية», default 12.6 s; 0 = the uploaded poster). The poster and the player are the
// site's one video component (VideoPlayer, variant "clip"); it plays in place. A tap anywhere outside it (or Esc)
// stops it and shows the poster again (Mohamed, Nov 8, 2026). A scroll is not a tap: a press that moves more than a
// few pixels is ignored.
export const POSTER_AT = 12.6;
export default function ClipCard({ d }: { d: Dict }) {
  const [on, setOn] = useState(false);
  const box = useRef<HTMLElement>(null);
  const c = d.hero.clip;
  useEffect(() => {
    if (!on) return;
    const shut = () => {
      const el = box.current?.querySelector('video');
      if (el) { try { el.pause(); el.currentTime = 0; } catch { /* not loaded yet */ } }
      setOn(false);
    };
    let start: { x: number; y: number; t: number } | null = null;
    const outside = (t: EventTarget | null) => !(t instanceof Node && box.current?.contains(t));
    const down = (e: PointerEvent) => { start = outside(e.target) ? { x: e.clientX, y: e.clientY, t: Date.now() } : null; };
    const up = (e: PointerEvent) => {
      const s = start; start = null;
      if (!s || !outside(e.target)) return;
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > 12 || Date.now() - s.t > 800) return; // a scroll or a long press
      shut();
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') shut(); };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointerup', up, true);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('keydown', key);
    };
  }, [on]);
  if (!c || (!c.poster && !c.video && !c.videoUrl)) return null;
  // the light preview build plays the Instagram link instead of the file
  const video = VIDEO_MODE === 'instagram' && c.videoUrl ? null : c.video || null;
  const at = typeof c.posterAt === 'number' && Number.isFinite(c.posterAt) ? c.posterAt : POSTER_AT;
  return (
    <figure ref={box} className={'clip' + (on ? ' is-on' : '')}>
      <VideoPlayer variant="clip" item={{ video, link: c.videoUrl || null, image: c.poster?.src ? c.poster : null }} name={c.name} label={c.play}
        open={on} onOpenChange={setOn} posterAt={at > 0 ? at : undefined} posterSize={[720, 1280]}
        priority={{ sizes: '(max-width: 760px) 240px, clamp(280px, 23vw, 330px)' }} />
      {/* one quiet line under the card (option A): the name · «watch the intro (24 s)» */}
      <figcaption><b>{c.name}</b>{c.play && <><span className="clip__sep" aria-hidden="true">·</span><span>{c.play}</span></>}</figcaption>
    </figure>
  );
}
