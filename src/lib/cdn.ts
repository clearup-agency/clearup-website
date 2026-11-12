import { instagramPost, youtubeId } from './links';
/* Cloudinary delivery URLs: the stored file stays as uploaded; the transformation in the URL asks the CDN
   for a resized, compressed copy (f_auto → AVIF/WebP where the browser takes it, q_auto → the smallest
   file that still looks the same). Any other URL (database media, /media/…) is returned unchanged. */
const CLD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/)(.+)$/;
// a URL that already carries a transformation (first path segment like "c_fill,w_200") is left alone
const HAS_T = /^[a-z]{1,3}_[^/]*\//;

function parts(url: unknown): { base: string; kind: 'image' | 'video'; rest: string } | null {
  if (typeof url !== 'string') return null;
  const m = CLD.exec(url);
  if (!m || HAS_T.test(m[3])) return null;
  return { base: m[1], kind: m[2] as 'image' | 'video', rest: m[3] };
}

/** An image at most `w` px wide (or a `w`×`w` square crop for logos). */
export function cdnImage(url: string | undefined | null, w: number, square = false): string {
  if (!url) return '';
  const p = parts(url);
  if (!p || p.kind !== 'image') return url;
  return p.base + (square ? `f_auto,q_auto,c_fill,g_center,w_${w},h_${w}` : `f_auto,q_auto,c_limit,w_${w}`) + '/' + p.rest;
}

/** A video as MP4. Story videos are already compressed when they are imported (720p H.264, see
 *  src/admin/media.ts), so they are served as stored — no second encode. */
export function cdnVideo(url: string | undefined | null): string {
  if (!url) return '';
  const p = parts(url);
  if (!p || p.kind !== 'video') return url;
  return p.base + p.rest.replace(/\.[a-z0-9]{2,4}$/i, '') + '.mp4';
}

/** The first frame of a Cloudinary video as a JPEG poster — the same transformation the import makes
 *  eagerly, so it is ready the first time (undefined for other videos). */
export function cdnPoster(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const p = parts(url);
  if (!p || p.kind !== 'video') return undefined;
  return p.base + 'so_0,q_auto,c_limit,w_720/' + p.rest.replace(/\.[a-z0-9]{2,4}$/i, '') + '.jpg';
}

/** A Cloudinary video's frame at `at` seconds (default 1 s — the first frame is often black, a fade-in) as an image:
 *  `w` wide, or a `w`×`w` square crop centred on the subject for round avatars. '' for other videos. */
export function cdnFrame(url: string | undefined | null, w: number, square = false, at = 1): string {
  if (!url) return '';
  const p = parts(url);
  if (!p || p.kind !== 'video') return '';
  const so = `so_${Math.max(0, Math.round(at * 10) / 10)}`;
  return p.base + (square ? `${so},f_auto,q_auto,c_fill,g_auto,w_${w},h_${w}` : `${so},f_auto,q_auto,c_limit,w_${w}`) + '/' + p.rest.replace(/\.[a-z0-9]{2,4}$/i, '') + '.jpg';
}

/** A YouTube / Instagram link → what the story viewer embeds (played from there; nothing stored here). */
export function storyEmbed(url: unknown): { kind: 'youtube' | 'instagram'; src: string; id: string } | null {
  if (typeof url !== 'string') return null;
  const yt = youtubeId(url);
  if (yt) return { kind: 'youtube', id: yt, src: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&playsinline=1&controls=0&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1` };
  const ig = instagramPost(url);
  if (ig) return { kind: 'instagram', id: ig.code, src: `https://www.instagram.com/${ig.type}/${ig.code}/embed/` };
  return null;
}

/** A video file as the admin stores it (a URL, or { url } / { src }) → its URL; '' when there is none. */
export function fileUrl(v: unknown): string {
  if (typeof v === 'string') return v;
  const o = v as { url?: unknown; src?: unknown } | null | undefined;
  return typeof o?.url === 'string' ? o.url : typeof o?.src === 'string' ? o.src : '';
}

type StoryMedia = { video?: string | null; link?: string | null; image?: { src: string } | null };

/** The frame shown before a story video plays: a Cloudinary video's frame at 1 s (the very first frame is often
 *  black — a fade-in), else the poster stored with the video, else a YouTube thumbnail; '' when there is none. */
export function storyPoster(it: StoryMedia | null | undefined, w = 720): string {
  if (!it) return '';
  const fromVideo = it.video ? cdnFrame(it.video, w) : '';
  if (fromVideo) return fromVideo;
  if (it.image?.src) return cdnImage(it.image.src, w);
  const e = storyEmbed(it.link);
  if (e?.kind === 'youtube') return `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`;
  return '';
}

/** The small round avatar: the same frame as a square crop (Cloudinary does the crop; a stored poster is used as
 *  is — the ring's CSS crops it), else the client logo; '' → the ring shows the first letter, never a black disc. */
export function storyThumb(it: StoryMedia | null | undefined, logo: { src: string } | null | undefined, size = 160): string {
  if (it?.video) { const f = cdnFrame(it.video, size, true); if (f) return f; }
  if (it?.image?.src) return cdnImage(it.image.src, size, true);
  const e = storyEmbed(it?.link);
  if (e?.kind === 'youtube') return `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg`;
  return logo?.src ? cdnImage(logo.src, size, true) : '';
}

