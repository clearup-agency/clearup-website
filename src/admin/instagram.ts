import 'server-only';

/* Instagram: a public post's own embed page (instagram.com/<p|reel>/<code>/embed/captioned/ — the page Instagram
   serves to any website that embeds the post) carries the post's media: the video file (720p MP4) and/or the
   image. Importing that file into Cloudinary lets a reel play full-screen in the stories viewer like any other
   video (no white Instagram card, no caption, autoplay, real length). Returns null when Instagram doesn't hand
   the media over (private post, a block) — the caller then keeps the link and shows Instagram's own player. */
export type IgMedia = { kind: 'video' | 'image'; url: string; poster?: string; duration?: number; width?: number; height?: number };

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

export function igShortcode(u: string): { type: 'p' | 'reel' | 'tv'; code: string } | null {
  const m = /instagram\.com\/(?:[\w.]+\/)?(reel|reels|p|tv)\/([\w-]+)/i.exec(u);
  if (!m) return null;
  const t = m[1].toLowerCase();
  return { type: t === 'reels' ? 'reel' : (t as 'p' | 'reel' | 'tv'), code: m[2] };
}

type Node = { is_video?: boolean; video_url?: string; display_url?: string; video_duration?: number; dimensions?: { width?: number; height?: number } };
const toMedia = (n: Node): IgMedia | null =>
  n.is_video && n.video_url ? { kind: 'video', url: n.video_url, poster: n.display_url, duration: n.video_duration, width: n.dimensions?.width, height: n.dimensions?.height }
    : n.display_url ? { kind: 'image', url: n.display_url, width: n.dimensions?.width, height: n.dimensions?.height } : null;

/** The media of a public Instagram post: one entry, or one per slide of a carousel. */
export async function instagramMedia(link: string): Promise<IgMedia[] | null> {
  const sc = igShortcode(link);
  if (!sc) return null;
  const r = await fetch(`https://www.instagram.com/${sc.type}/${sc.code}/embed/captioned/`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', Accept: 'text/html' }, cache: 'no-store', signal: AbortSignal.timeout(12_000),
  }).catch(() => null);
  if (!r?.ok) return null;
  const html = await r.text();
  const m = /"contextJSON":"((?:[^"\\]|\\.)*)"/.exec(html);
  if (!m) return null;
  try {
    const ctx = JSON.parse(JSON.parse('"' + m[1] + '"'));
    const sm = ctx?.gql_data?.shortcode_media;
    if (!sm) return null;
    const kids: Node[] = (sm.edge_sidecar_to_children?.edges ?? []).map((e: { node: Node }) => e.node);
    const list = (kids.length ? kids : [sm]).map(toMedia).filter(Boolean) as IgMedia[];
    return list.length ? list : null;
  } catch {
    return null;
  }
}

/** Size of a remote file (for «before → after»), or 0. */
export async function remoteSize(u: string): Promise<number> {
  const r = await fetch(u, { method: 'HEAD', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8_000) }).catch(() => null);
  return Number(r?.headers.get('content-length') || 0) || 0;
}
