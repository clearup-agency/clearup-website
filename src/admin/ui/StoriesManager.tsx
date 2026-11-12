'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { newKey } from '@/admin/content';
import { instagramPost, linkSource, splitLinks, youtubeId } from '@/lib/links';
import { slugify } from '@/lib/pages';
import { fmtSize, importLink, stepText, uploadFile, type Imported, type Step } from './upload';
import { IcGrip, IcImage, IcPlus, IcTrash } from './icons';

/* «أعمال العملاء (ستوري)» — the simple manager (one screen, phone first):
   «+ عميل جديد» → name + logo → one big «ضيف أعمال» box: drop/pick files, or paste links (several at once, any
   source: YouTube, Instagram, Google Drive file/folder). Each work is a card with a thumbnail and where it came
   from; drag to reorder, × to delete. Big videos are compressed on this device first (no 100 MB limit).
   Works on the section's `clients` array exactly as stored (schema unchanged; `source` is an optional extra). */

type Ls = { _type?: string; ar?: string; en?: string };
export type StoryItem = { _key: string; _type?: string; caption?: Ls; image?: { _type?: string; url?: string; width?: number; height?: number; alt?: Ls }; video?: { _type?: string; url?: string }; link?: string; duration?: number; source?: string };
type Pic = { _type?: string; url?: string; width?: number; height?: number; alt?: Ls };
export type Metric = { _key: string; _type?: string; v?: Ls; l?: Ls };
export type StoryClient = {
  _key: string; _type?: string; name?: Ls; logo?: Pic; items?: StoryItem[];
  /** its page's address (/<lang>/work/<slug>/), written on save from the English name */
  slug?: string; caseKey?: string;
  /** «رأي العميل»: what they said (+ a video of them speaking) — shown in «آراء العملاء» and on its page */
  testimonial?: { quote?: Ls; name?: Ls; role?: Ls; item?: StoryItem };
  /** «قصة المشروع»: its page — the challenge, what we did, results (number + label), a cover */
  story?: { challenge?: Ls; solution?: Ls; results?: Metric[]; cover?: Pic };
};
const filledS = (v?: Ls) => !!((v?.ar ?? '').trim() || (v?.en ?? '').trim()) && !/\[[^\]]*\]/.test(`${v?.ar ?? ''}${v?.en ?? ''}`);
export const hasTestimonial = (c: StoryClient) => filledS(c.testimonial?.quote) || !!(c.testimonial?.item && (c.testimonial.item.video?.url || c.testimonial.item.image?.url || c.testimonial.item.link));
export const hasStory = (c: StoryClient) => filledS(c.story?.challenge) || filledS(c.story?.solution) || (c.story?.results ?? []).some((m) => filledS(m.v) && filledS(m.l));

type Job = { id: string; client: string; batch: string; idx: number; label: string; source: string; step: Step | null; error?: string; retry?: () => void };

const CLD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/)(?:v\d+\/)?(.+?)(\.[a-z0-9]{2,5})?$/i;
/** a small 9:16 picture for the card */
export function thumbOf(it: StoryItem): string | null {
  const v = it.video?.url;
  if (v) { const m = CLD.exec(v); return m ? `${m[1]}so_0,c_fill,w_240,h_426,q_auto/${m[3]}.jpg` : null; }
  const i = it.image?.url;
  if (i) { const m = CLD.exec(i); return m ? `${m[1]}c_fill,w_240,h_426,q_auto,f_auto/${m[3]}${m[4] ?? ''}` : i; }
  const yt = youtubeId(it.link);
  if (yt) return `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
  return null;
}
const logoThumb = (u?: string) => { const m = u ? CLD.exec(u) : null; return m ? `${m[1]}c_fill,w_120,h_120,q_auto,f_auto/${m[3]}${m[4] ?? ''}` : u; };
export function sourceOf(it: StoryItem): 'youtube' | 'instagram' | 'drive' | 'upload' | 'link' {
  if (it.source === 'youtube' || it.source === 'instagram' || it.source === 'drive' || it.source === 'upload') return it.source;
  if (youtubeId(it.link)) return 'youtube';
  if (instagramPost(it.link)) return 'instagram';
  if (it.link && /google\.com/.test(it.link)) return 'drive';
  if (it.video?.url || it.image?.url) return 'upload';
  return 'link';
}
const SRC: Record<string, string> = { youtube: 'يوتيوب', instagram: 'إنستغرام', drive: 'درايف', upload: 'من جهازك', link: 'رابط', direct: 'رابط' };
const kindOf = (it: StoryItem) => (it.video?.url || youtubeId(it.link) || instagramPost(it.link) ? 'video' : 'image');
const nm = (c: StoryClient) => (c.name?.ar || c.name?.en || '').trim();
const arNum = (n: number) => String(n);

function asItems(r: Imported): StoryItem[] {
  const base = () => ({ _key: newKey(), _type: 'storyItem' });
  const one = (x: Imported): StoryItem =>
    x.kind === 'embed' ? { ...base(), link: x.link, source: x.source }
      : x.kind === 'video' ? { ...base(), video: { _type: 'file', url: x.url }, ...(x.link ? { link: x.link } : {}), source: x.source ?? 'upload' }
        : { ...base(), image: { _type: 'image', url: x.url, width: x.width, height: x.height }, ...(x.link ? { link: x.link } : {}), source: x.source ?? 'upload' };
  return r.items ? r.items.map(one) : [one(r)];
}

export default function StoriesManager({ value, onChange, title, focus }: { value: StoryClient[] | undefined; onChange: (v: StoryClient[]) => void; title?: string; focus?: string | null }) {
  const clients: StoryClient[] = Array.isArray(value) ? value : [];
  // the latest list, for imports that finish later (they add to whatever the list is by then)
  const latest = useRef(clients);
  const changeRef = useRef(onChange);
  useLayoutEffect(() => { latest.current = clients; changeRef.current = onChange; });
  const apply = (fn: (c: StoryClient[]) => StoryClient[]) => { const next = fn(latest.current); latest.current = next; changeRef.current(next); };
  const [open, setOpen] = useState<string | null>(null);
  // a click on a client's part in the preview (a testimonial card, a story ring) opens that client here
  const focusKey = (() => { const m = /^clients\.(\d+)/.exec(focus ?? ''); return m ? clients[Number(m[1])]?._key ?? null : null; })();
  const [seenFocus, setSeenFocus] = useState<string | null>(null);
  if (focusKey && focusKey !== seenFocus) { setSeenFocus(focusKey); setOpen(focusKey); }
  const [jobs, setJobs] = useState<Job[]>([]);
  const order = useRef(new Map<string, { batch: string; idx: number }>());
  const [ask, setAsk] = useState<null | { kind: 'client'; c: StoryClient }>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const setClient = (key: string, fn: (c: StoryClient) => StoryClient) => apply((cs) => cs.map((c) => (c._key === key ? fn(c) : c)));
  function addClient() {
    const c: StoryClient = { _key: newKey(), _type: 'storyClient', name: { _type: 'localeString', ar: '', en: '' }, items: [] };
    apply((cs) => [...cs, c]);
    setOpen(c._key);
    setTimeout(() => document.getElementById('cname-' + c._key)?.focus(), 60);
  }
  function onClientsDrag(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    apply((cs) => { const a = cs.findIndex((c) => c._key === e.active.id); const b = cs.findIndex((c) => c._key === e.over!.id); return a < 0 || b < 0 ? cs : arrayMove(cs, a, b); });
  }

  // ——— adding works (files or links), several at a time, each with its own progress card ———
  const patchJob = (id: string, p: Partial<Job>) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...p } : j)));
  function insert(clientKey: string, batch: string, idx: number, items: StoryItem[]) {
    items.forEach((it, k) => order.current.set(it._key, { batch, idx: idx + k / 100 }));
    setClient(clientKey, (c) => {
      const list = [...(c.items ?? [])];
      // keep the order things were pasted/picked in, even when a later one finishes first
      let at = list.length;
      for (let i = list.length - 1; i >= 0; i--) {
        const o = order.current.get(list[i]._key);
        if (o?.batch === batch && o.idx > idx) at = i; else if (o?.batch === batch) break;
      }
      list.splice(at, 0, ...items);
      return { ...c, items: list };
    });
  }
  async function runJob(job: Job, work: (onStep: (s: Step) => void) => Promise<Imported>) {
    setJobs((js) => [...js.filter((j) => j.id !== job.id), { ...job, step: null, error: undefined }]);
    try {
      const r = await work((s) => patchJob(job.id, { step: s }));
      if (r.folder) {
        // a Drive folder: each file is its own job, in the folder's order
        setJobs((js) => js.filter((j) => j.id !== job.id));
        await pool(r.folder.map((f, k) => () => runJob({ ...job, id: newKey(), idx: job.idx + (k + 1) / 1000, label: f.name || 'ملف من المجلد', source: 'drive' }, (s) => importLink(f.url, 'story', s))), 2);
        return;
      }
      insert(job.client, job.batch, job.idx, asItems(r));
      setJobs((js) => js.filter((j) => j.id !== job.id));
    } catch (e) {
      patchJob(job.id, { error: (e as Error).message || 'ما زبط', retry: () => runJob(job, work) });
    }
  }
  function addFiles(clientKey: string, list: FileList | File[] | null) {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/') || /\.(mov|mp4|m4v|heic|jpe?g|png|webp)$/i.test(f.name));
    if (!files.length) return;
    const batch = newKey();
    pool(files.map((file, i) => () => runJob(
      { id: newKey(), client: clientKey, batch, idx: i, label: file.name, source: 'upload', step: null },
      async (onStep) => {
        const video = file.type.startsWith('video/') || /\.(mov|mp4|m4v)$/i.test(file.name);
        const u = await uploadFile(file, video ? 'story-video' : 'story-image', onStep);
        return { ...u, kind: video ? 'video' : 'image', source: 'upload' } as Imported;
      })), 2);
  }
  function addLinks(clientKey: string, text: string): number {
    const urls = splitLinks(text);
    const batch = newKey();
    pool(urls.map((u, i) => () => {
      const s = linkSource(u);
      return runJob({ id: newKey(), client: clientKey, batch, idx: i, label: u.replace(/^https:\/\/(www\.)?/, '').slice(0, 60), source: s.startsWith('drive') ? 'drive' : s === 'unknown' || s === 'direct' ? 'link' : s, step: null }, (onStep) => importLink(u, 'story', onStep));
    }), 3);
    return urls.length;
  }

  return (
    <div className="sm">
      <div className="sm-head">
        <div>
          <h2 className="sm-h">{title ?? 'العملاء'}</h2>
          <p className="sm-sub">{clients.length ? `${arNum(clients.length)} ${clients.length === 1 ? 'عميل' : 'عملاء'} · اسحب من النقاط لتغيير الترتيب` : 'ما في عملاء لسا. ابدأ بأول عميل.'}</p>
        </div>
        <button type="button" className="btn btn--lg sm-new" onClick={addClient}><IcPlus /> عميل جديد</button>
      </div>

      <DndContext id="sm-clients" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onClientsDrag}>
        <SortableContext items={clients.map((c) => c._key)} strategy={verticalListSortingStrategy}>
          <div className="sm-list">
            {clients.map((c, i) => (
              <Sortable key={c._key} id={c._key} className="sm-client" data-open={open === c._key || undefined}>
                {(handle) => (
                  <>
                    <div className="sm-row" data-path={`clients.${i}`}>
                      {handle}
                      <button type="button" className="sm-row__main" onClick={() => setOpen(open === c._key ? null : c._key)} aria-expanded={open === c._key}>
                        <span className="sm-logo">{c.logo?.url ? <img src={logoThumb(c.logo.url)} alt="" /> : <span>{nm(c).slice(0, 1) || arNum(i + 1)}</span>}</span>
                        <span className="sm-row__t">
                          <b>{nm(c) || 'عميل بدون اسم'}</b>
                          <small>{arNum(c.items?.length ?? 0)} {(c.items?.length ?? 0) === 1 ? 'عمل' : 'أعمال'}{hasTestimonial(c) ? ' · رأي ✓' : ''}{hasStory(c) ? ' · قصة ✓' : ''}{jobs.some((j) => j.client === c._key && !j.error) ? ' · جارٍ الإضافة…' : ''}{!c.logo?.url ? ' · بدون شعار' : ''}</small>
                        </span>
                        <span className="sm-row__go" aria-hidden="true">{open === c._key ? 'إغلاق' : 'تعديل'}</span>
                      </button>
                    </div>
                    {open === c._key && (
                      <ClientEditor c={c} jobs={jobs.filter((j) => j.client === c._key)} sensors={sensors}
                        onChange={(fn) => setClient(c._key, fn)}
                        onFiles={(f) => addFiles(c._key, f)} onLinks={(t) => addLinks(c._key, t)}
                        onDismiss={(id) => setJobs((js) => js.filter((j) => j.id !== id))}
                        onDelete={() => setAsk({ kind: 'client', c })} />
                    )}
                  </>
                )}
              </Sortable>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {clients.length > 0 && <button type="button" className="btn btn--soft btn--block sm-new2" onClick={addClient}><IcPlus /> عميل جديد</button>}

      {ask && (
        <div className="modal" onClick={() => setAsk(null)}>
          <div className="modal__box" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>حذف «{nm(ask.c) || 'هذا العميل'}» وكل أعماله ورأيه وقصته؟</h2>
            <p>بيختفي من الموقع بعد «حفظ ونشر».</p>
            <div className="modal__acts">
              <button type="button" className="btn btn--danger" autoFocus onClick={() => { const k = ask.c._key; setAsk(null); apply((cs) => cs.filter((x) => x._key !== k)); }}>نعم، احذف</button>
              <button type="button" className="btn btn--ghost" onClick={() => setAsk(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** runs jobs with at most `n` at a time */
async function pool(fns: (() => Promise<unknown>)[], n: number) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, fns.length) }, async () => { while (i < fns.length) { const f = fns[i++]; await f().catch(() => {}); } }));
}

function ClientEditor({ c, jobs, sensors, onChange, onFiles, onLinks, onDismiss, onDelete }: {
  c: StoryClient; jobs: Job[]; sensors: ReturnType<typeof useSensors>; onChange: (fn: (c: StoryClient) => StoryClient) => void;
  onFiles: (f: FileList | File[] | null) => void; onLinks: (t: string) => number; onDismiss: (id: string) => void; onDelete: () => void;
}) {
  const items = c.items ?? [];
  const [text, setText] = useState('');
  const [over, setOver] = useState(false);
  const [note, setNote] = useState('');
  const [edit, setEdit] = useState<string | null>(null);
  const files = useRef<HTMLInputElement>(null);
  const found = splitLinks(text);
  function onItemsDrag(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    onChange((x) => { const l = x.items ?? []; const a = l.findIndex((i) => i._key === e.active.id); const b = l.findIndex((i) => i._key === e.over!.id); return a < 0 || b < 0 ? x : { ...x, items: arrayMove(l, a, b) }; });
  }
  function submit(t = text) {
    const n = onLinks(t);
    if (!n) { setNote('ما لقينا رابط. الصق رابط يوتيوب أو إنستغرام أو Drive.'); return; }
    setNote(''); setText('');
  }
  const editing = items.find((i) => i._key === edit);
  return (
    <div className="sm-body">
      <div className="sm-grid2">
        <label className="sm-f"><span>اسم العميل</span>
          <input id={'cname-' + c._key} className="inp" dir="rtl" placeholder="مثلاً: مطعم السرايا" value={c.name?.ar ?? ''} onChange={(e) => onChange((x) => ({ ...x, name: { _type: 'localeString', ar: e.target.value, en: x.name?.en ?? '' } }))} />
        </label>
        <label className="sm-f"><span>الاسم بالإنجليزي <small>(اختياري)</small></span>
          <input className="inp" dir="ltr" placeholder="Saraya Restaurant" value={c.name?.en ?? ''} onChange={(e) => onChange((x) => ({ ...x, name: { _type: 'localeString', ar: x.name?.ar ?? '', en: e.target.value } }))} />
        </label>
      </div>

      <LogoBox c={c} onChange={onChange} />
      <PageLink c={c} />

      <Part n={1} title="الأعمال" hint="صور وفيديوهات من شغلكم. بتظهر بالستوري بالرئيسية." on={items.length > 0} onText={`${arNum(items.length)} ${items.length === 1 ? 'عمل' : 'أعمال'}`} open>
      <div className={'sm-drop' + (over ? ' is-over' : '')}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { if (!e.dataTransfer.files?.length) return; e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files); }}>
        <p className="sm-drop__t">ضيف أعمال</p>
        <button type="button" className="btn btn--lg" onClick={() => files.current?.click()}><IcImage /> اختر صور أو فيديوهات</button>
        <p className="sm-drop__or">أو اسحبها هنا · أو الصق روابط تحت</p>
        <textarea className="inp sm-links" dir="ltr" rows={4} value={text}
          placeholder={'الصق رابط أو أكثر (كل رابط بسطر)\nyoutube.com/shorts/…\ninstagram.com/reel/…\ndrive.google.com/…'}
          onChange={(e) => { setText(e.target.value); setNote(''); }}
          onPaste={(e) => { const t = e.clipboardData.getData('text'); if (splitLinks(t).length && !text.trim()) { e.preventDefault(); submit(t); } }}
          aria-label="روابط الأعمال" />
        {found.length > 0 && <button type="button" className="btn btn--soft btn--block" onClick={() => submit()}>أضف {found.length === 1 ? 'الرابط' : `${arNum(found.length)} روابط`}</button>}
        {note && <span className="err">{note}</span>}
        <p className="sm-drop__hint">بيقبل: يوتيوب وشورتس · ريلز وبوستات إنستغرام · ملف أو مجلد درايف (مشارك «أي شخص لديه الرابط») · صور وفيديوهات بأي حجم، الفيديو الكبير بينضغط لحاله.</p>
        <input ref={files} type="file" hidden multiple accept="image/*,video/*" onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {(items.length > 0 || jobs.length > 0) && (
        <DndContext id={'sm-items-' + c._key} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onItemsDrag}>
          <SortableContext items={items.map((i) => i._key)} strategy={rectSortingStrategy}>
            <div className="sm-works">
              {items.map((it, i) => (
                <Sortable key={it._key} id={it._key} className="sm-work" whole>
                  {() => <WorkCard it={it} n={i + 1} onOpen={() => setEdit(it._key)} onDelete={() => onChange((x) => ({ ...x, items: (x.items ?? []).filter((y) => y._key !== it._key) }))} />}
                </Sortable>
              ))}
              {jobs.map((j) => (
                <div key={j.id} className={'sm-work sm-job' + (j.error ? ' is-bad' : '')}>
                  <span className="sm-badge">{SRC[j.source] ?? 'رابط'}</span>
                  <div className="sm-job__in">
                    {j.error ? <><b>ما زبط</b><span>{j.error}</span></> : <><span className="sm-spin" aria-hidden="true" /><span>{stepText(j.step)}</span>{typeof j.step?.pct === 'number' && <i className="sm-bar"><i style={{ width: j.step.pct + '%' }} /></i>}</>}
                    <small dir="auto">{j.label}</small>
                    {j.error && <span className="sm-job__acts">{j.retry && <button type="button" className="btn btn--soft" onClick={j.retry}>جرّب ثاني</button>}<button type="button" className="btn btn--ghost" onClick={() => onDismiss(j.id)}>إخفاء</button></span>}
                  </div>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {items.length > 1 && <p className="sm-tip">اسحب أي بطاقة لتغيير مكانها. اضغط عليها لإضافة وصف.</p>}
      </Part>

      <Part n={2} title="رأي العميل (فيديو)" hint="فيديو العميل وهو بيحكي + جملة قصيرة. بيظهر بقسم «عملاؤنا يحكون» وبصفحته." on={hasTestimonial(c)} open={hasTestimonial(c)}>
        <TestimonialPart c={c} onChange={onChange} />
      </Part>

      <Part n={3} title="قصة المشروع" hint="التحدي، شو عملتوا، والنتائج بالأرقام. بتظهر بصفحة العميل." on={hasStory(c)} open={hasStory(c)}>
        <StoryPart c={c} onChange={onChange} />
      </Part>

      <button type="button" className="sm-del" onClick={onDelete}><IcTrash /> حذف هذا العميل</button>

      {editing && <WorkSheet it={editing} onClose={() => setEdit(null)} onChange={(fn) => onChange((x) => ({ ...x, items: (x.items ?? []).map((y) => (y._key === editing._key ? fn(y) : y)) }))} />}
    </div>
  );
}

function WorkCard({ it, n, onOpen, onDelete }: { it: StoryItem; n: number; onOpen: () => void; onDelete: () => void }) {
  const t = thumbOf(it);
  const src = sourceOf(it);
  const [bad, setBad] = useState(false);
  return (
    <>
      <button type="button" className="sm-work__pic" onClick={onOpen} aria-label={`العمل ${n}`}>
        {t && !bad ? <img src={t} alt="" loading="lazy" draggable={false} onError={() => setBad(true)} /> : <span className={'sm-ph sm-ph--' + src}>{src === 'instagram' ? 'IG' : src === 'youtube' ? '▶' : '🖼'}</span>}
        {kindOf(it) === 'video' && <span className="sm-play" aria-hidden="true">▶</span>}
      </button>
      <span className={'sm-badge sm-badge--' + src}>{SRC[src]}</span>
      <span className="sm-num">{arNum(n)}</span>
      <button type="button" className="sm-x" onClick={(e) => { e.stopPropagation(); onDelete(); }} onPointerDown={(e) => e.stopPropagation()} aria-label={`حذف العمل ${n}`}><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></button>
    </>
  );
}

/** the few optional details of one work */
function WorkSheet({ it, onChange, onClose }: { it: StoryItem; onChange: (fn: (i: StoryItem) => StoryItem) => void; onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const t = thumbOf(it);
  const isImg = kindOf(it) === 'image';
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__box sm-sheet" role="dialog" aria-modal="true" aria-label="تفاصيل العمل" onClick={(e) => e.stopPropagation()}>
        <div className="sm-sheet__top">
          {t ? <img src={t} alt="" /> : <span className={'sm-ph sm-ph--' + sourceOf(it)}>{sourceOf(it) === 'instagram' ? 'IG' : '▶'}</span>}
          <div><b>{SRC[sourceOf(it)]}</b>{it.link && <a href={it.link} target="_blank" rel="noopener" dir="ltr">فتح الأصل ↗</a>}</div>
        </div>
        <label className="sm-f"><span>وصف قصير <small>(اختياري، يظهر أسفل الستوري)</small></span>
          <input className="inp" dir="rtl" value={it.caption?.ar ?? ''} onChange={(e) => onChange((x) => ({ ...x, caption: { _type: 'localeString', ar: e.target.value, en: x.caption?.en ?? '' } }))} />
        </label>
        <label className="sm-f"><span>الوصف بالإنجليزي <small>(اختياري)</small></span>
          <input className="inp" dir="ltr" value={it.caption?.en ?? ''} onChange={(e) => onChange((x) => ({ ...x, caption: { _type: 'localeString', ar: x.caption?.ar ?? '', en: e.target.value } }))} />
        </label>
        {isImg && (
          <label className="sm-f"><span>مدة عرض الصورة</span>
            <select className="inp" value={String(it.duration ?? 5)} onChange={(e) => onChange((x) => ({ ...x, duration: Number(e.target.value) === 5 ? undefined : Number(e.target.value) }))}>
              {[3, 5, 7, 10, 15].map((s) => <option key={s} value={s}>{arNum(s)} ثوانٍ{s === 5 ? ' (عادي)' : ''}</option>)}
            </select>
          </label>
        )}
        <div className="modal__acts"><button type="button" className="btn" onClick={onClose}>تم</button></div>
      </div>
    </div>
  );
}

// ——— the client screen's three parts: «الأعمال» (above), «رأي العميل», «قصة المشروع» ———
/** One part of a client: a numbered heading that opens/closes, and whether it shows on the site. */
function Part({ n, title, hint, on, onText, open: open0, children }: { n: number; title: string; hint: string; on: boolean; onText?: string; open?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(!!open0);
  return (
    <section className={'sm-part' + (open ? ' is-open' : '')}>
      <button type="button" className="sm-part__h" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="sm-part__n" aria-hidden="true">{arNum(n)}</span>
        <span className="sm-part__t"><b>{title}</b><small>{hint}</small></span>
        <span className={'sm-part__st' + (on ? ' is-on' : '')}>{on ? (onText ?? 'بيظهر ✓') : 'فاضي (ما بيظهر)'}</span>
      </button>
      {open && <div className="sm-part__b">{children}</div>}
    </section>
  );
}

/** the client's page address (made from the English name when saving) */
export function slugFor(c: StoryClient): string {
  const fromName = slugify(c.name?.en || '');
  if (c.slug && !(c.slug.startsWith('client-') && fromName)) return c.slug;
  return fromName || 'client-' + slugify(c._key).slice(-8);
}
function PageLink({ c }: { c: StoryClient }) {
  const slug = slugFor(c);
  return (
    <p className="sm-page">صفحته على الموقع: <bdi dir="ltr">/ar/work/{slug}/</bdi>
      {!(c.name?.en ?? '').trim() && !c.slug && <small> · اكتب الاسم بالإنجليزي عشان يطلع الرابط أحلى</small>}
      {c.slug && <> · <a href={`/ar/work/${c.slug}/`} target="_blank" rel="noopener">افتحها ↗</a></>}
    </p>
  );
}

/** a text in Arabic + English (English optional) */
function LsField({ label, value, onChange, long, ph, phEn }: { label: string; value?: Ls; onChange: (v: Ls) => void; long?: boolean; ph?: string; phEn?: string }) {
  const set = (k: 'ar' | 'en', x: string) => onChange({ _type: long ? 'localeText' : 'localeString', ar: value?.ar ?? '', en: value?.en ?? '', [k]: x });
  const A = long ? 'textarea' : 'input';
  return (
    <div className="sm-grid2">
      <label className="sm-f"><span>{label}</span><A className="inp" dir="rtl" rows={long ? 3 : undefined} placeholder={ph} value={value?.ar ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => set('ar', e.target.value)} /></label>
      <label className="sm-f"><span>بالإنجليزي <small>(اختياري)</small></span><A className="inp" dir="ltr" rows={long ? 3 : undefined} placeholder={phEn} value={value?.en ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => set('en', e.target.value)} /></label>
    </div>
  );
}

function TestimonialPart({ c, onChange }: { c: StoryClient; onChange: (fn: (c: StoryClient) => StoryClient) => void }) {
  const t = c.testimonial ?? {};
  const set = (patch: Partial<NonNullable<StoryClient['testimonial']>>) => onChange((x) => ({ ...x, testimonial: { ...(x.testimonial ?? {}), ...patch } }));
  return (
    <>
      {/* Nov 9, 2026: the video first — with a short line it is a card in «عملاؤنا يحكون» */}
      <OneMedia label="1. فيديو العميل وهو بيحكي (رأيه بالفيديو)" kind="video" value={t.item} onChange={(it) => set({ item: it })} />
      <LsField label="2. جملة قصيرة تظهر على الفيديو (سطر واحد)" long value={t.quote} onChange={(v) => set({ quote: v })} ph="مثلاً: من أول شهر صار عنا طلبات أكثر من قدرتنا" phEn="From the first month…" />
      <LsField label="3. اسم الشخص اللي بيحكي" value={t.name} onChange={(v) => set({ name: v })} ph="الاسم" phEn="Name" />
      <LsField label="4. منصبه" value={t.role} onChange={(v) => set({ role: v })} ph="مثلاً: المدير التنفيذي" phEn="CEO" />
      <p className="le-hint" style={{ marginTop: 6 }}>اسم العميل (الشركة) هو الاسم اللي فوق. الفيديو + الجملة = كارد بقسم «عملاؤنا يحكون»: بيظهر بصفحة «أعمالنا» لحاله، وبالرئيسية لما تفعّل «يظهر بالرئيسية» له من «تعديل الموقع» ← قسم «عملاؤنا يحكون».</p>
    </>
  );
}

function StoryPart({ c, onChange }: { c: StoryClient; onChange: (fn: (c: StoryClient) => StoryClient) => void }) {
  const st = c.story ?? {};
  const set = (patch: Partial<NonNullable<StoryClient['story']>>) => onChange((x) => ({ ...x, story: { ...(x.story ?? {}), ...patch } }));
  const results = st.results ?? [];
  const setRow = (k: string, patch: Partial<Metric>) => set({ results: results.map((m) => (m._key === k ? { ...m, ...patch } : m)) });
  return (
    <>
      <LsField label="التحدي: شو كانت المشكلة؟" long value={st.challenge} onChange={(v) => set({ challenge: v })} ph="مثلاً: متابعين كثير بس مبيعات قليلة…" />
      <LsField label="الحل: شو عملتوا؟" long value={st.solution} onChange={(v) => set({ solution: v })} ph="كل خطوة بسطر" />
      <div className="sm-f"><span>النتائج بالأرقام</span></div>
      <div className="sm-res">
        {results.map((m) => (
          <div key={m._key} className="sm-res__row">
            <input className="inp sm-res__v" dir="ltr" placeholder="+120%" value={m.v?.ar ?? ''} aria-label="الرقم"
              onChange={(e) => setRow(m._key, { v: { _type: 'localeString', ar: e.target.value, en: e.target.value } })} />
            <input className="inp" dir="rtl" placeholder="مثلاً: زيادة المبيعات" value={m.l?.ar ?? ''} aria-label="الوصف"
              onChange={(e) => setRow(m._key, { l: { _type: 'localeString', ar: e.target.value, en: m.l?.en ?? '' } })} />
            <input className="inp" dir="ltr" placeholder="Sales growth (optional)" value={m.l?.en ?? ''} aria-label="الوصف بالإنجليزي"
              onChange={(e) => setRow(m._key, { l: { _type: 'localeString', ar: m.l?.ar ?? '', en: e.target.value } })} />
            <button type="button" className="sm-x sm-res__x" onClick={() => set({ results: results.filter((y) => y._key !== m._key) })} aria-label="حذف النتيجة"><IcTrash /></button>
          </div>
        ))}
        <button type="button" className="btn btn--soft" onClick={() => set({ results: [...results, { _key: newKey(), _type: 'metric', v: { _type: 'localeString', ar: '', en: '' }, l: { _type: 'localeString', ar: '', en: '' } }] })}><IcPlus /> أضف نتيجة</button>
      </div>
      <OneMedia label="صورة غلاف لصفحته (اختيارية)" kind="image" value={st.cover?.url ? { _key: 'cover', image: st.cover } : undefined}
        onChange={(it) => set({ cover: it?.image?.url ? { _type: 'image', url: it.image.url, width: it.image.width, height: it.image.height } : undefined })} />
    </>
  );
}

/** One picture or video (the testimonial video, the cover): pick/drop a file or paste one link — the same
 *  upload, link reading and on-device compression as «ضيف أعمال». */
function OneMedia({ label, kind, value, onChange }: { label: string; kind: 'video' | 'image'; value?: StoryItem; onChange: (it: StoryItem | undefined) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Step | null | false>(false);
  const [err, setErr] = useState('');
  const [link, setLink] = useState('');
  const [over, setOver] = useState(false);
  async function go(work: (s: (x: Step) => void) => Promise<Imported>) {
    setErr(''); setBusy(null);
    try {
      const r = await work((x) => setBusy(x));
      if (r.folder) throw new Error('هذا رابط مجلد. حط رابط ملف واحد.');
      const it = asItems(r)[0];
      if (kind === 'image' && !it.image?.url) throw new Error('هون لازم صورة.');
      onChange(it); setLink('');
    } catch (e) { setErr((e as Error).message || 'ما زبط'); }
    setBusy(false);
  }
  const file = (f: File) => go((s) => {
    const video = f.type.startsWith('video/') || /\.(mov|mp4|m4v)$/i.test(f.name);
    return uploadFile(f, video ? 'story-video' : 'story-image', s).then((u) => ({ ...u, kind: video ? 'video' : 'image', source: 'upload' } as Imported));
  });
  const th = value ? thumbOf(value) : null;
  const src = value ? sourceOf(value) : 'link';
  return (
    <div className="sm-f">
      <span>{label}</span>
      {value ? (
        <div className="sm-one">
          <span className="sm-one__pic">{th ? <img src={th} alt="" /> : <span className={'sm-ph sm-ph--' + src}>{src === 'instagram' ? 'IG' : '▶'}</span>}</span>
          <span className="sm-one__t"><b>{SRC[src]}</b>{value.link && <a href={value.link} target="_blank" rel="noopener" dir="ltr">فتح الأصل ↗</a>}</span>
          <button type="button" className="btn btn--ghost" onClick={() => onChange(undefined)}><IcTrash /> شيل</button>
        </div>
      ) : (
        <div className={'sm-onebox' + (over ? ' is-over' : '')}
          onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { const f = e.dataTransfer.files?.[0]; if (!f) return; e.preventDefault(); setOver(false); file(f); }}>
          <button type="button" className="btn btn--soft" onClick={() => input.current?.click()} disabled={busy !== false}><IcImage /> {busy !== false ? stepText(busy) : kind === 'video' ? 'اختر فيديو' : 'اختر صورة'}</button>
          {busy && typeof busy.pct === 'number' && <i className="sm-bar"><i style={{ width: busy.pct + '%' }} /></i>}
          <div className="row2 linkrow">
            <input type="url" className="inp" dir="ltr" placeholder={kind === 'video' ? 'أو الصق رابط (يوتيوب، إنستغرام، درايف)' : 'أو الصق رابط صورة (درايف…)'} value={link} disabled={busy !== false}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && link.trim()) { e.preventDefault(); go((s) => importLink(link.trim(), 'story', s)); } }}
              onPaste={(e) => { const u = splitLinks(e.clipboardData.getData('text'))[0]; if (u && !link.trim()) { e.preventDefault(); go((s) => importLink(u, 'story', s)); } }}
              aria-label={label + ' — رابط'} />
            {link.trim() && <button type="button" className="btn btn--soft" onClick={() => go((s) => importLink(link.trim(), 'story', s))} disabled={busy !== false}>استخدم</button>}
          </div>
          {err && <span className="err">{err}</span>}
          <input ref={input} type="file" hidden accept={kind === 'video' ? 'video/*' : 'image/*'} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) file(f); }} />
        </div>
      )}
    </div>
  );
}

function LogoBox({ c, onChange }: { c: StoryClient; onChange: (fn: (c: StoryClient) => StoryClient) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Step | null | false>(false);
  const [err, setErr] = useState('');
  const [link, setLink] = useState('');
  const [over, setOver] = useState(false);
  const set = (u: { url?: string; width?: number; height?: number }) => onChange((x) => ({ ...x, logo: { ...(x.logo ?? {}), _type: 'image', url: u.url, width: u.width, height: u.height } }));
  async function go(work: () => Promise<{ url?: string; width?: number; height?: number; kind?: string }>) {
    setErr(''); setBusy(null);
    try { const u = await work(); if (u.kind && u.kind !== 'image') throw new Error('الشعار لازم يكون صورة'); set(u); setLink(''); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }
  return (
    <div className="sm-f">
      <span>الشعار <small>(مربع، بيظهر داخل الدائرة)</small></span>
      <div className={'sm-logobox' + (over ? ' is-over' : '')}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { const f = e.dataTransfer.files?.[0]; if (!f) return; e.preventDefault(); setOver(false); go(() => uploadFile(f, 'logo')); }}>
        <button type="button" className="sm-logo sm-logo--lg" onClick={() => input.current?.click()} aria-label="اختيار الشعار">
          {c.logo?.url ? <img src={logoThumb(c.logo.url)} alt="" /> : <span>+</span>}
        </button>
        <div className="sm-logobox__r">
          <button type="button" className="btn btn--soft" onClick={() => input.current?.click()} disabled={busy !== false}>{busy !== false ? stepText(busy) : c.logo?.url ? 'تغيير الشعار' : 'اختر الشعار'}</button>
          <div className="row2 linkrow">
            <input type="url" className="inp" dir="ltr" placeholder="أو الصق رابط صورة (Drive…)" value={link} onChange={(e) => setLink(e.target.value)} disabled={busy !== false}
              onKeyDown={(e) => { if (e.key === 'Enter' && link.trim()) { e.preventDefault(); go(() => importLink(link.trim(), 'logo')); } }} aria-label="رابط الشعار" />
            {link.trim() && <button type="button" className="btn btn--soft" onClick={() => go(() => importLink(link.trim(), 'logo'))} disabled={busy !== false}>استخدم</button>}
          </div>
          {err && <span className="err">{err}</span>}
        </div>
        <input ref={input} type="file" hidden accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) go(() => uploadFile(f, 'logo')); }} />
      </div>
    </div>
  );
}

/** A sortable block; `whole` = the whole block is the drag handle (work cards), else a ⋮⋮ handle is passed in. */
function Sortable({ id, className, whole, children, ...rest }: { id: string; className: string; whole?: boolean; children: (handle: React.ReactNode) => React.ReactNode; 'data-open'?: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 5 : undefined, position: 'relative' };
  const handle = whole ? null : (
    <button type="button" className="handle" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label="اسحب لتغيير الترتيب" title="اسحب لتغيير الترتيب"><IcGrip /></button>
  );
  return (
    <div ref={setNodeRef} style={style} className={className + (isDragging ? ' is-drag' : '')} {...rest} {...(whole ? { ...attributes, ...listeners } : {})}>
      {children(handle)}
    </div>
  );
}

export { fmtSize };
