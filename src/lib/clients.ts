import { CASE_TYPE, filled, slugify, validSlug } from './pages';
import { storyEmbed } from './cdn';

/* One record per client, built from what is stored (no database writes, no migration):
   • every client of the «العملاء» screen (the stories section's clients list) — name, logo, works (the stories),
     and, optional, «رأي العميل» (testimonial: quote, person, a video) and «قصة المشروع» (story: challenge,
     solution, results, cover) and a slug;
   • every case study row («قصص العملاء», page "cases") — the older home of a client's story and video.
   A client and a case row are the same client when the client says so (caseKey), or by the same slug or name;
   then the client's own filled fields win and the case row fills the gaps. A case row with no client stays a
   client record of its own, so nothing that shows today disappears.
   Pure code (no server imports): used by the public pages, the admin preview and the sitemap. */

type Raw = Record<string, any>;
const has = (v: any): boolean => !!v && typeof v === 'object' ? filled(v.ar) || filled(v.en) : filled(v);
const pick = (a: any, b: any) => (has(a) ? a : b);
const norm = (v: any) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** A story item (image / video / link) that has something to show. */
export const itemHasMedia = (it: Raw | null | undefined): boolean =>
  !!it && !!((it.video && (it.video.url || typeof it.video === 'string')) || it.image?.url || it.image?.src || storyEmbed(it.link));

/** The clients' own list: the first stories section with its own clients (a visible one first) and any other
 *  non-mirror stories section's clients after it (same client twice = once). */
export function storyClientsOf(all: Raw[]): { primary: Raw | null; clients: Raw[] } {
  const own = all.filter((y) => y && y._type === 'clientStoriesSection' && !y.mirror);
  const primary = own.find((y) => !y.hidden) ?? own[0] ?? null;
  const ordered = primary ? [primary, ...own.filter((y) => y !== primary)] : [];
  const seen = new Set<string>();
  const clients: Raw[] = [];
  for (const s of ordered) for (const c of (s.clients ?? []) as Raw[]) {
    if (!c || typeof c !== 'object') continue;
    const k = String(c._key ?? '');
    if (k && seen.has(k)) continue;
    if (k) seen.add(k);
    clients.push(c);
  }
  return { primary, clients };
}

/** The slug a client asks for: its own (valid) slug, else one from its English name, else from its key. */
export function clientSlugBase(c: Raw): string {
  if (validSlug(c.slug)) return c.slug;
  return slugify(c.name?.en || '') || slugify(c.client?.en || '') || ('client-' + slugify(String(c._key || '')).slice(-8) || 'client');
}

/** A case row's first video as a story item (the client speaking), so it plays in the same viewer. */
function caseVideoItem(v: Raw | undefined): Raw | null {
  if (!v || typeof v.url !== 'string' || !v.url) return null;
  // a stored video file with it (the one-page site's /media/…mp4) plays as the file; the link stays as the fallback
  const file = typeof v.file === 'string' ? v.file : typeof v.file?.url === 'string' && v.file.url ? v.file.url : null;
  return { _type: 'storyItem', _key: 'tv-' + (v._key || 'v'), link: v.url, ...(file ? { video: file } : {}), ...(v.poster ? { image: v.poster } : {}) };
}

export type ClientRaw = Raw & {
  _key: string; slug: string; caseKey?: string; storyKey?: string;
  /** has «قصة المشروع» or «رأي العميل» (a real case study, listed on the Work page) */
  isCase: boolean; hasTestimonial: boolean; hasPage: boolean; hidden?: boolean;
};

/** Every client record, in order: the clients list first (its order), then case rows nobody claimed. */
export function clientRecords(all: Raw[], opts: { showHidden?: string | null } = {}): ClientRaw[] {
  const { primary, clients } = storyClientsOf(all);
  const removed = new Set<string>(Array.isArray(primary?.removedCases) ? primary!.removedCases.filter((x: unknown) => typeof x === 'string') : []);
  const caseRows = all.filter((x) => x && x._type === CASE_TYPE && (!x.hidden || x._key === opts.showHidden));
  const used = new Set<string>();
  const findCase = (c: Raw): Raw | null => {
    const free = caseRows.filter((r) => !used.has(r._key));
    if (c.caseKey) { const r = caseRows.find((x) => x._key === c.caseKey); if (r) return r; }
    if (validSlug(c.slug)) { const r = free.find((x) => x.slug === c.slug && !removed.has(x._key)); if (r) return r; }
    const names = [norm(c.name?.ar), norm(c.name?.en)].filter(Boolean);
    return free.find((x) => !removed.has(x._key) && names.some((n) => n === norm(x.client?.ar) || n === norm(x.client?.en))) ?? null;
  };
  // a client whose story row the admin hid («قصص العملاء» → 👁) is hidden with it everywhere (its page, its
  // testimonial card, «قصص أخرى», the sitemap), not shown as a client without its story — Nov 9, 2026
  const hiddenCase = new Set(all.filter((x) => x && x._type === CASE_TYPE && x.hidden && x._key !== opts.showHidden).map((x) => String(x._key)));
  const out: ClientRaw[] = [];
  for (const c of clients) {
    if (c.caseKey && hiddenCase.has(String(c.caseKey)) && c._key !== opts.showHidden) continue;
    const cr = findCase(c);
    if (cr) used.add(cr._key);
    out.push(merge(c, cr));
  }
  for (const r of caseRows) if (!used.has(r._key) && !removed.has(r._key)) out.push(merge(null, r));
  // unique slugs: case rows keep theirs first (their pages already exist), then the rest in order
  const taken = new Set<string>();
  const order = [...out.filter((x) => x.caseKey && validSlug(x.slug)), ...out.filter((x) => !(x.caseKey && validSlug(x.slug)))];
  for (const x of order) {
    const base = x.slug || 'client';
    let s = base, i = 2;
    while (taken.has(s)) s = `${base}-${i++}`;
    taken.add(s);
    x.slug = s;
  }
  return out;
}

function merge(c: Raw | null, cr: Raw | null): ClientRaw {
  const t = (c?.testimonial ?? {}) as Raw;
  const st = (c?.story ?? {}) as Raw;
  const ct = (cr?.testimonial ?? {}) as Raw;
  const caseVideos: Raw[] = Array.isArray(cr?.videos) ? cr!.videos.filter((v: Raw) => typeof v?.url === 'string' && v.url) : [];
  const ownVideo = itemHasMedia(t.item) ? t.item : null;
  const tvideo = ownVideo ?? caseVideoItem(caseVideos[0]);
  const results = Array.isArray(st.results) ? st.results.filter((m: Raw) => has(m?.v) || has(m?.l)) : [];
  const works = Array.isArray(c?.items) ? c!.items.filter(itemHasMedia) : [];
  const testimonial = { quote: pick(t.quote, ct.quote), name: pick(t.name, ct.name), role: pick(t.role, ct.role) };
  const data: Raw = {
    ...(cr ?? {}),
    _type: 'clientRecord',
    _key: c?._key || cr?._key,
    client: c && has(c.name) ? c.name : cr?.client ?? c?.name,
    logo: c?.logo ?? cr?.logo ?? null,
    problem: pick(st.challenge, cr?.problem),
    solution: has(st.solution) ? st.solution : null,
    did: has(st.solution) ? [] : cr?.did ?? [],
    metrics: results.length ? results : cr?.metrics ?? [],
    cover: st.cover?.url ? st.cover : cr?.cover ?? null,
    testimonial,
    tvideo,
    // the case row's other videos stay on the client page («فيديوهات أخرى»)
    videos: ownVideo ? caseVideos : caseVideos.slice(1),
    works,
    featured: cr ? cr.featured !== false : true,
  };
  delete data.seo; if (cr?.seo) data.seo = cr.seo;
  const hasTestimonial = has(testimonial.quote) || !!tvideo;
  // an older case study row is a case study by definition (it was listed on the Work page before)
  const isCase = !!cr || hasTestimonial || has(data.problem) || has(data.solution) || has(data.result) || (data.did as Raw[]).some((x) => has(x))
    || (data.metrics as Raw[]).some((m) => has(m?.v) && has(m?.l));
  const slug = c ? (validSlug(c.slug) ? c.slug : cr && validSlug(cr.slug) ? cr.slug : clientSlugBase(c)) : validSlug(cr?.slug) ? cr!.slug : clientSlugBase(cr ?? {});
  return Object.assign(data, {
    slug, isCase, hasTestimonial, hasPage: isCase || works.length > 0,
    ...(cr ? { caseKey: cr._key } : {}), ...(c ? { storyKey: c._key } : {}),
    ...(cr?.hidden && !c ? { hidden: true } : {}),
  }) as ClientRaw;
}

/** The stored snapshot's sections in the shape clientRecords reads. */
export const rawSections = (rows: { id: string; type: string; hidden: boolean; data: Record<string, unknown>; page?: string }[]): Raw[] =>
  rows.map((s) => ({ ...s.data, _type: s.type, _key: s.id, _page: s.page || 'home', hidden: s.hidden }));

const fl = (v: any, t: 'localeString' | 'localeText') => ({ _type: t, ar: filled(v?.ar) ? v.ar : '', en: filled(v?.en) ? v.en : '' });

/** An older case study as a client of the «العملاء» screen (only its real, filled words; [placeholders] stay
 *  out), linked by caseKey so its page, testimonial and video carry on exactly as before. */
export function caseAsClient(row: { id: string; data: Record<string, unknown> }): Raw {
  const d = row.data as Raw;
  const v = (Array.isArray(d.videos) ? d.videos : []).find((x: Raw) => typeof x?.url === 'string' && x.url);
  const src = v ? (/instagram\.com/i.test(v.url) ? 'instagram' : /youtu/i.test(v.url) ? 'youtube' : 'link') : '';
  const did = (Array.isArray(d.did) ? d.did : []).filter((x: Raw) => filled(x?.ar) || filled(x?.en));
  const metrics = (Array.isArray(d.metrics) ? d.metrics : []).filter((m: Raw) => (filled(m?.v?.ar) || filled(m?.v?.en)) && (filled(m?.l?.ar) || filled(m?.l?.en)));
  return {
    _key: ('kc' + row.id).slice(0, 40), _type: 'storyClient', caseKey: row.id,
    name: fl(d.client, 'localeString'), ...(d.logo ? { logo: d.logo } : {}), items: [],
    ...(validSlug(d.slug) ? { slug: d.slug } : {}),
    testimonial: {
      quote: fl(d.testimonial?.quote, 'localeText'), name: fl(d.testimonial?.name, 'localeString'), role: fl(d.testimonial?.role, 'localeString'),
      ...(v ? { item: { _key: 'kt' + row.id.slice(-12), _type: 'storyItem', link: v.url, source: src, ...(v.poster?.url ? { image: v.poster } : {}) } } : {}),
    },
    story: {
      challenge: fl(d.problem, 'localeText'),
      solution: { _type: 'localeText', ar: did.map((x: Raw) => x.ar).filter(filled).join('\n'), en: did.map((x: Raw) => x.en).filter(filled).join('\n') },
      results: metrics.map((m: Raw, i: number) => ({ _key: 'kr' + i + row.id.slice(-10), _type: 'metric', v: m.v, l: m.l })),
      ...(d.cover && (d.cover as Raw).url ? { cover: d.cover } : {}),
    },
  };
}

/** The «العملاء» screen's starting list: case rows no client claims yet, as clients (see caseAsClient). */
export function unclaimedCases(rows: { id: string; type: string; hidden: boolean; data: Record<string, unknown>; page?: string }[]): Raw[] {
  const recs = clientRecords(rawSections(rows));
  const free = new Set(recs.filter((r) => r.caseKey && !r.storyKey).map((r) => r.caseKey));
  return rows.filter((r) => r.type === CASE_TYPE && free.has(r.id)).map(caseAsClient);
}
