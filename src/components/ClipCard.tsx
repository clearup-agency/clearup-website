'use client';
import type { Dict } from '@/lib/dict';
import { VIDEO_MODE } from '@/content';
import VideoPlayer from './VideoPlayer';
// The hero's intro video (Nov 11, 2026 landing hero: it takes the place of the animated logo): a tall 9:16 card,
// real face, plays only on tap — at once, with sound (no autoplay weight). Media comes from the CMS (hero → «الفيديو
// في الواجهة»): mp4 file, poster and/or an Instagram/YouTube link. The poster is a clean frame of the video itself
// («الغلاف: لقطة من الفيديو عند الثانية», default 12.6 s; 0 = the uploaded poster). The poster and the player are the
// site's one video component (VideoPlayer, variant "clip"). Nov 14, 2026 (Mohamed): a tap opens it in its own window
// like a story (laptop: a centred 9:16 player with × on top; phone: full screen with × on top); ×, Esc or a tap
// outside it closes it.
export const POSTER_AT = 12.6;
export default function ClipCard({ d }: { d: Dict }) {
  const c = d.hero.clip;
  if (!c || (!c.poster && !c.video && !c.videoUrl)) return null;
  // the light preview build plays the Instagram link instead of the file
  const video = VIDEO_MODE === 'instagram' && c.videoUrl ? null : c.video || null;
  const at = typeof c.posterAt === 'number' && Number.isFinite(c.posterAt) ? c.posterAt : POSTER_AT;
  return (
    <figure className="clip">
      <VideoPlayer variant="clip" item={{ video, link: c.videoUrl || null, image: c.poster?.src ? c.poster : null }} name={c.name} label={c.play}
        modal posterAt={at > 0 ? at : undefined} posterSize={[720, 1280]}
        priority={{ sizes: '(max-width: 760px) 240px, clamp(280px, 23vw, 330px)' }} />
      {/* one quiet line under the card (option A): the name · «watch the intro (24 s)» */}
      <figcaption><b>{c.name}</b>{c.play && <><span className="clip__sep" aria-hidden="true">·</span><span>{c.play}</span></>}</figcaption>
    </figure>
  );
}
