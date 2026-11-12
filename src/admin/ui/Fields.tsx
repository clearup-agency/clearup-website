'use client';
import { useId, useRef, useState } from 'react';
import type { Field } from '@/admin/content';
import { emptyValue, newKey, sectionLabel } from '@/admin/content';
import { blocksToText, textToBlocks } from '@/admin/blocks';
import { fmtSize, importLink, stepText, uploadFile, type Preset, type Step } from './upload';
import { checkFontAction } from '@/admin/actions';
import { PRESETS, DEFAULT_AR, DEFAULT_EN, asFontChoice, fontLoad, fontStack, type FontChoice } from '@/lib/fonts';
import { seedContent } from '@/lib/view';
import { IcDown, IcEye, IcEyeOff, IcGrip, IcImage, IcPlus, IcTrash, IcUp } from './icons';
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type Lang = 'ar' | 'en';
type P = { f: Field; value: any; onChange: (v: any) => void; lang: Lang; path: string };
const join = (a: string, b: string | number) => (a ? `${a}.${b}` : String(b));

/** A list of fields (one object's worth). */
export function FieldList({ fields, value, onChange, lang, path = '' }: { fields: Field[]; value: any; onChange: (v: any) => void; lang: Lang; path?: string }) {
  const v = value && typeof value === 'object' ? value : {};
  return (
    <>
      {fields.filter((f) => f.name !== 'hidden').map((f) => (
        <FieldRow key={f.name} f={f} value={v[f.name]} lang={lang} path={join(path, f.name)} onChange={(x) => onChange({ ...v, [f.name]: x })} />
      ))}
    </>
  );
}

export function FieldRow(p: P) {
  const id = useId();
  const { f } = p;
  const isGroup = f.type === 'object' || f.type === 'array' || f.type === 'image' || f.type === 'file' || (f.options?.list && f.type !== 'string') || (f.type === 'string' && f.options?.layout === 'radio');
  const L = isGroup ? 'div' : 'label';
  return (
    <div className="fld" data-path={p.path}>
      {f.type !== 'object' && (
        <L className={isGroup ? 'lbl' : undefined} {...(isGroup ? { id: id + '-l' } : { htmlFor: id })}>
          {f.title || f.name}
          {f.description && <span className="desc">{f.description}</span>}
        </L>
      )}
      <Input {...p} id={id} />
    </div>
  );
}

function Input({ f, value, onChange, lang, id, path }: P & { id: string }) {
  switch (f.type) {
    case 'localeString':
    case 'localeText': {
      // العربي | English side by side (stacked on narrow panels) — no language tabs
      const v = value && typeof value === 'object' ? value : { _type: f.type, ar: '', en: '' };
      return (
        <div className="bi">
          {(['ar', 'en'] as const).map((l) => {
            const props = {
              id: l === 'ar' ? id : `${id}-en`, className: 'inp', dir: l === 'ar' ? 'rtl' : 'ltr', lang: l, value: v[l] ?? '',
              placeholder: l === 'en' && String(v.ar ?? '').trim() ? 'فارغ — يظهر النص العربي مكانه' : '',
              'aria-label': `${f.title || f.name} (${l === 'ar' ? 'عربي' : 'English'})`,
              onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...v, _type: f.type, [l]: e.target.value }),
            };
            return (
              <div className="bi__c" data-lang={l} key={l}>
                <span className="bi__t" aria-hidden="true">{l === 'ar' ? 'ع' : 'EN'}</span>
                {f.type === 'localeText' ? <textarea rows={3} {...props} /> : <input type="text" {...props} />}
                {/\[[^\]]*\]/.test(String(v[l] ?? '')) && (
                  <span className="desc ph-note">{l === 'ar'
                    ? 'فيه نص مؤقت بين [ ]: الموقع ما بيعرض هذا الحقل للزوار لحد ما تكتب النص الحقيقي (في الأسئلة: الجزء اللي بين الأقواس بس).'
                    : 'Holds a [placeholder]: visitors don’t see this field until the real text replaces it (FAQ answers: only the bracketed part).'}</span>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    case 'localeBlock':
      return <BlockInput id={id} value={value} onChange={onChange} />;
    case 'string':
    case 'number': {
      const list = f.options?.list;
      if (list?.length) {
        const opts = list.map((o) => (typeof o === 'object' ? o : { title: String(o), value: o }));
        const cur = value ?? f.initialValue ?? (opts.some((o) => o.value === '') ? '' : undefined);
        if (opts.length <= 5 || f.options?.layout === 'radio') {
          return (
            <div className="seg" role="group" aria-labelledby={id + '-l'}>
              {opts.map((o) => (
                <button type="button" key={String(o.value)} aria-pressed={cur === o.value} onClick={() => onChange(o.value)}>{o.title}</button>
              ))}
            </div>
          );
        }
        return (
          <select id={id} className="inp" value={String(cur ?? '')} onChange={(e) => onChange(f.type === 'number' ? Number(e.target.value) : e.target.value)}>
            {opts.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.title}</option>)}
          </select>
        );
      }
      if (f.type === 'number') return <input id={id} type="number" className="inp" dir="ltr" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />;
      const ltr = /href|anchor|whatsapp|email|index|brand|url|link/i.test(f.name);
      const bad = f.name === 'whatsapp' && value && !/^[0-9]{8,15}$/.test(value) ? 'أرقام فقط مع رمز الدولة، بدون + أو مسافات' :
        f.name === 'anchor' && value && !/^[a-z0-9-]*$/.test(value) ? 'أحرف إنجليزية صغيرة وأرقام و - فقط' : '';
      return (
        <>
          <input id={id} type={f.name === 'email' ? 'email' : 'text'} className="inp" dir={ltr ? 'ltr' : 'auto'} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
          {bad && <span className="err">{bad}</span>}
        </>
      );
    }
    case 'font':
      return <FontInput f={f} value={value} onChange={onChange} id={id} />;
    case 'range': {
      const o = (f.options ?? {}) as { min?: number; max?: number; step?: number; unit?: string; low?: string; high?: string };
      const cur = typeof value === 'number' ? value : Number(f.initialValue ?? o.min ?? 0);
      return (
        <div className="rng">
          <span className="rng__e">{o.low}</span>
          <input id={id} type="range" min={o.min} max={o.max} step={o.step} value={cur} onChange={(e) => onChange(Number(e.target.value))} dir="ltr" />
          <span className="rng__e">{o.high}</span>
          <output htmlFor={id} className="rng__v" dir="ltr">{o.unit === '%' ? `${Math.round(cur)}%` : `${cur.toFixed(1)}${o.unit ?? ''}`}</output>
        </div>
      );
    }
    case 'url':
      return <input id={id} type="url" className="inp" dir="ltr" placeholder="https://" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'boolean':
      return (
        <label className="sw">
          <input id={id} type="checkbox" checked={!!(value ?? f.initialValue)} onChange={(e) => onChange(e.target.checked)} />
          <span className="sw__t" /><span className="sw__l">{(value ?? f.initialValue) ? 'نعم' : 'لا'}</span>
        </label>
      );
    case 'color': {
      const hex = value?.hex ?? '';
      const set = (h: string) => onChange({ _type: 'color', hex: h });
      return (
        <div className="color">
          <input type="color" aria-label={f.title} value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : '#5b2096'} onChange={(e) => set(e.target.value.toUpperCase())} />
          <input id={id} className="inp" dir="ltr" value={hex} placeholder="#5B2096" onChange={(e) => set(e.target.value)} />
        </div>
      );
    }
    case 'image':
    case 'file':
      return <MediaInput f={f} value={value} onChange={onChange} lang={lang} path={path} />;
    case 'object':
      return (
        <fieldset className="obj">
          <legend>{f.title}</legend>
          {f.description && <span className="desc">{f.description}</span>}
          <div className={f.fields && f.fields.length > 4 && f.fields.every((x) => x.type === 'color') ? 'grid2' : undefined}>
            <FieldList fields={f.fields ?? []} value={value} onChange={onChange} lang={lang} path={path} />
          </div>
          {f.name === 'colors' && (
            <button type="button" className="btn btn--ghost reset" onClick={() => onChange((seedContent.settings as Record<string, unknown>).colors)}>↺ رجوع للألوان الأصلية</button>
          )}
        </fieldset>
      );
    case 'array':
      return <ArrayInput f={f} value={value} onChange={onChange} lang={lang} path={path} />;
    default:
      return <input id={id} className="inp" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />;
  }
}

function BlockInput({ id, value, onChange }: { id: string; value: any; onChange: (v: any) => void }) {
  const v = value && typeof value === 'object' ? value : { _type: 'localeBlock', ar: [], en: [] };
  const [text, setText] = useState<Record<Lang, string | null>>({ ar: null, en: null });
  return (
    <>
      <div className="bi">
        {(['ar', 'en'] as const).map((l) => (
          <div className="bi__c" data-lang={l} key={l}>
            <span className="bi__t" aria-hidden="true">{l === 'ar' ? 'ع' : 'EN'}</span>
            <textarea id={l === 'ar' ? id : `${id}-en`} className="inp" rows={7} dir={l === 'ar' ? 'rtl' : 'ltr'} lang={l} value={text[l] ?? blocksToText(v[l])}
              onChange={(e) => { setText({ ...text, [l]: e.target.value }); onChange({ ...v, _type: 'localeBlock', [l]: textToBlocks(e.target.value) }); }} />
          </div>
        ))}
      </div>
      <span className="desc" style={{ marginTop: 4 }}>سطر فارغ = فقرة جديدة · ابدأ السطر بـ «- » لنقاط · «## » لعنوان فرعي</span>
    </>
  );
}

/** Image or video: preview, upload (button or drag-and-drop), remove, plus its own small fields (alt text…). */
function MediaInput({ f, value, onChange, lang, path }: P) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [over, setOver] = useState(false);
  const isVideo = f.type === 'file';
  const v = value && typeof value === 'object' ? value : null;
  const url: string | undefined = v?.url || v?.localSrc;
  const extra = (f.fields ?? []).filter((x) => x.name !== 'asset');
  // «أعمال العملاء (ستوري)»: compressed on the way in (story image/video, logo) + a Google Drive link instead of a file
  const compress = f.options?.compress;
  const preset: Preset | undefined = compress === 'logo' ? 'logo' : compress === 'story' ? (isVideo ? 'story-video' : 'story-image') : undefined;
  const [sizes, setSizes] = useState<{ before?: number; after?: number | null } | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [link, setLink] = useState('');

  async function pick(file?: File | null) {
    if (!file) return;
    setErr(''); setBusy(true); setSizes(null); setStep(null);
    try {
      const u = await uploadFile(file, preset, setStep);
      onChange({ ...(v ?? {}), _type: f.type, url: u.url, ...(isVideo ? {} : { width: u.width, height: u.height }) });
      if (u.before) setSizes({ before: u.before, after: u.after });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }
  async function fromLink() {
    if (!link.trim()) return;
    setErr(''); setBusy(true); setSizes(null); setStep(null);
    try {
      const r = await importLink(link.trim(), compress === 'logo' ? 'logo' : 'story', setStep);
      const want = isVideo ? 'video' : 'image';
      if (r.kind === 'embed') throw new Error('روابط يوتيوب وإنستغرام الصقها في مربع «ضيف أعمال» (صفحة «أعمال العملاء»).');
      if (!r.url || r.kind !== want) throw new Error(r.folder ? 'هذا رابط مجلد. استخدم صفحة «أعمال العملاء» لإضافة مجلد كامل.' : `هذا الرابط ${r.kind === 'video' ? 'فيديو' : 'صورة'}، ضعه في خانة ${r.kind === 'video' ? 'الفيديو' : 'الصورة'}`);
      onChange({ ...(v ?? {}), _type: f.type, url: r.url, ...(isVideo ? {} : { width: r.width, height: r.height }) });
      setSizes({ before: r.before, after: r.after });
      setLink('');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={over ? 'drop' : undefined}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}>
      <div className="img">
        <div className="img__pv">
          {url ? (isVideo ? <video src={url} muted playsInline preload="metadata" controls /> : <img src={url} alt="" />) : <span><IcImage /><br />لا يوجد {isVideo ? 'فيديو' : 'صورة'}</span>}
        </div>
        <div className="img__acts">
          <div className="row2">
            <button type="button" className="btn btn--soft" onClick={() => input.current?.click()} disabled={busy}>
              {busy ? 'جارٍ الرفع…' : url ? (isVideo ? 'تغيير الفيديو' : 'تغيير الصورة') : (isVideo ? 'رفع فيديو' : 'رفع صورة')}
            </button>
            {url && !busy && <button type="button" className="btn btn--ghost" onClick={() => onChange(undefined)}>إزالة</button>}
          </div>
          {busy && <div className="prog"><i /></div>}
          {busy && step && <span className="desc">{stepText(step)}</span>}
          {err && <span className="err">{err}</span>}
          {sizes && <span className="desc ok">تم الضغط: <bdi dir="ltr">{fmtSize(sizes.before)} → {fmtSize(sizes.after)}</bdi></span>}
          <span className="desc">{preset === 'story-video' ? 'أي حجم: الفيديو الكبير بينضغط على جهازك أولاً، وبعدين إلى 720p (~10 MB للدقيقة)' : preset ? 'PNG أو JPG أو WebP بأي حجم، بتنضغط لحالها' : isVideo ? 'MP4 · يُفضّل أقل من 4 ميغابايت' : 'PNG أو JPG أو WebP — أو اسحب الصورة إلى هنا'}</span>
          {preset && (
            <div className="row2 linkrow">
              <input type="url" className="inp" dir="ltr" placeholder="أو الصق رابط (Drive، يوتيوب، إنستغرام)" value={link} onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fromLink(); } }} disabled={busy} aria-label="رابط" />
              <button type="button" className="btn btn--soft" onClick={fromLink} disabled={busy || !link.trim()}>استيراد</button>
            </div>
          )}
          <input ref={input} type="file" hidden accept={isVideo ? (preset ? 'video/*' : 'video/mp4') : 'image/png,image/jpeg,image/webp,image/svg+xml,image/gif'} onChange={(e) => pick(e.target.files?.[0])} />
        </div>
      </div>
      {url && extra.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <FieldList fields={extra} value={v} onChange={(x) => onChange({ ...x, _type: f.type })} lang={lang} path={path} />
        </div>
      )}
    </div>
  );
}

function ArrayInput({ f, value, onChange, lang, path }: P) {
  const items: any[] = Array.isArray(value) ? value : [];
  const member = f.of?.[0] ?? { type: 'string', name: 'item' };
  const set = (next: any[]) => onChange(next);
  const move = (i: number, d: number) => { const n = [...items]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); set(n); };
  const del = (i: number) => set(items.filter((_, j) => j !== i));
  const add = () => {
    let item: any;
    if (member.type === 'object') item = { _key: newKey(), _type: member.name, ...(emptyValue(member) as object) };
    else if (member.type === 'localeString' || member.type === 'localeText') item = { _key: newKey(), _type: member.type, ar: '', en: '' };
    else if (member.type === 'image') item = { _key: newKey(), _type: 'image' };
    else item = '';
    set([...items, item]);
  };
  const simple = member.type === 'localeString' || member.type === 'localeText' || member.type === 'string';
  // a list whose lines can be hidden from visitors without deleting them (👁, the strip's client names — Nov 9, 2026)
  const hideable = !!f.options?.hideable && (member.type === 'localeString' || member.type === 'localeText');
  const addLabel = 'إضافة ' + (member.title || (member.type === 'image' ? 'صورة' : simple ? 'سطر' : 'عنصر'));
  // drag & drop to reorder (by the handle; the ↑ ↓ buttons and the keyboard still work)
  const ids = items.map((it, i) => String(it?._key ?? `i${i}`));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = ids.indexOf(String(e.active.id)), to = ids.indexOf(String(e.over.id));
    if (from < 0 || to < 0) return;
    set(arrayMove(items, from, to));
  };
  return (
    <div className="arr">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {items.map((it, i) => (
            <SortRow key={ids[i]} id={ids[i]}>
              {(handle) => simple ? (
                <div className={'simple' + (hideable && it?.hidden ? ' is-off' : '')} data-path={join(path, i)}>
                  {handle}
                  <div style={{ flex: 1 }}>
                    <Input f={{ ...member, name: f.name + i }} value={it} lang={lang} path={join(path, i)} id={`${path}-${i}`} onChange={(x) => set(items.map((y, j) => (j === i ? (member.type === 'string' ? x : { ...x, _key: it?._key ?? newKey(), ...(it?.hidden ? { hidden: true } : {}) }) : y)))} />
                    {hideable && it?.hidden && <span className="tag tag--off">مخفي عن الزوار</span>}
                  </div>
                  {hideable && <HideButton off={!!it?.hidden} label={itemText(it, lang)} onToggle={() => set(items.map((y, j) => (j === i ? hideToggled(y) : y)))} />}
                  <ItemButtons i={i} n={items.length} move={move} del={del} />
                </div>
              ) : (
                <details className="item" data-path={join(path, i)}>
                  <summary>
                    {handle}
                    <span className="item__n">{i + 1}</span>
                    <span className="item__t">{itemTitle(it, member, lang) || `${member.title || 'عنصر'} ${i + 1}`}</span>
                    {it?.hide === true && <span className="tag tag--off">مخفي</span>}
                    <ItemButtons i={i} n={items.length} move={move} del={del} />
                  </summary>
                  <div className="item__body">
                    {member.type === 'image'
                      ? <MediaInput f={member} value={it} lang={lang} path={join(path, i)} onChange={(x) => set(items.map((y, j) => (j === i ? { ...(x ?? { _type: 'image' }), _key: it?._key ?? newKey() } : y)))} />
                      : <FieldList fields={member.fields ?? []} value={it} lang={lang} path={join(path, i)} onChange={(x) => set(items.map((y, j) => (j === i ? x : y)))} />}
                  </div>
                </details>
              )}
            </SortRow>
          ))}
        </SortableContext>
      </DndContext>
      <button type="button" className="add" onClick={add}><IcPlus /> {addLabel}</button>
      {f.options?.bulk === 'story' && <StoryBulk member={member} items={items} set={set} />}
    </div>
  );
}

/** Under a client's works: add several at once — a pasted link (Google Drive file or whole public folder,
 *  YouTube, Instagram) or several files picked together. Drive files are imported once into Cloudinary,
 *  compressed on the way in; a public Instagram reel/post is copied the same way (link kept); YouTube stays a link. */
function StoryBulk({ member, items, set }: { member: Field; items: any[]; set: (next: any[]) => void }) {
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ n: number; before: number; after: number } | null>(null);
  const files = useRef<HTMLInputElement>(null);
  const blank = () => ({ _key: newKey(), _type: member.name, ...(emptyValue(member) as object) });
  // an Instagram post copied into Cloudinary keeps its link too (where it came from); the copy is what plays
  const asItem = (r: { url?: string; kind?: string; link?: string; width?: number; height?: number }) =>
    r.kind === 'embed' ? { ...blank(), link: r.link }
      : r.kind === 'video' ? { ...blank(), video: { _type: 'file', url: r.url }, ...(r.link ? { link: r.link } : {}) }
        : { ...blank(), image: { _type: 'image', url: r.url, width: r.width, height: r.height }, ...(r.link ? { link: r.link } : {}) };
  async function run(jobs: (() => Promise<{ item: any; before?: number; after?: number | null }>)[]) {
    setErr(''); setDone(null);
    let acc = [...items]; let before = 0; let after = 0; let n = 0;
    for (let i = 0; i < jobs.length; i++) {
      setBusy(`${i + 1} / ${jobs.length}`);
      try {
        const r = await jobs[i]();
        acc = [...acc, r.item]; set(acc); n++;
        before += r.before ?? 0; after += r.after ?? 0;
      } catch (e) {
        setErr((jobs.length > 1 ? `الملف ${i + 1}: ` : '') + (e as Error).message);
      }
    }
    setBusy('');
    if (n && before) setDone({ n, before, after });
  }
  async function fromLink() {
    const u = link.trim();
    if (!u) return;
    setBusy('…'); setErr('');
    try {
      const r = await importLink(u, 'story');
      if (r.items) {
        await run(r.items.map((x) => async () => ({ item: asItem(x), before: x.before, after: x.after })));
      } else if (r.folder) {
        await run(r.folder.map((f) => async () => { const x = await importLink(f.url, 'story'); return { item: asItem(x), before: x.before, after: x.after }; }));
      } else {
        await run([async () => ({ item: asItem(r), before: r.before, after: r.after })]);
      }
      setLink('');
    } catch (e) {
      setErr((e as Error).message); setBusy('');
    }
  }
  async function fromFiles(list: FileList | null) {
    const arr = Array.from(list ?? []).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!arr.length) return;
    await run(arr.map((file) => async () => {
      const video = file.type.startsWith('video/');
      const u = await uploadFile(file, video ? 'story-video' : 'story-image');
      return { item: asItem({ ...u, kind: video ? 'video' : 'image' }), before: u.before, after: u.after };
    }));
    if (files.current) files.current.value = '';
  }
  return (
    <div className="bulk">
      <p className="bulk__t">إضافة أعمال بسرعة</p>
      <div className="row2 linkrow">
        <input type="url" className="inp" dir="ltr" placeholder="رابط Google Drive (ملف أو مجلد) أو YouTube أو Instagram" value={link}
          onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fromLink(); } }} disabled={!!busy} aria-label="رابط الأعمال" />
        <button type="button" className="btn btn--soft" onClick={fromLink} disabled={!!busy || !link.trim()}>إضافة من رابط</button>
      </div>
      <div className="row2">
        <button type="button" className="btn btn--ghost" onClick={() => files.current?.click()} disabled={!!busy}>رفع عدة صور / فيديوهات</button>
        <input ref={files} type="file" hidden multiple accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime" onChange={(e) => fromFiles(e.target.files)} />
      </div>
      {busy && <span className="desc">جارٍ الاستيراد والضغط… {busy}</span>}
      {err && <span className="err">{err}</span>}
      {done && <span className="desc ok">أُضيف {done.n} — الحجم بعد الضغط: <bdi dir="ltr">{fmtSize(done.before)} → {fmtSize(done.after)}</bdi></span>}
      <span className="desc">مجلد Drive يجب أن يكون «أي شخص لديه الرابط». الصور تُضغط إلى 1080×1920 والفيديو إلى 720p. ريلز إنستغرام العامة تُنسخ وتُضغط مثلها فتعمل بملء الشاشة؛ يوتيوب يُعرض من مصدره.</span>
    </div>
  );
}

/** One draggable row of a list; `children` gets the drag handle to place where it fits. */
function SortRow({ id, children }: { id: string; children: (handle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, position: 'relative', zIndex: isDragging ? 5 : undefined, opacity: isDragging ? 0.85 : undefined };
  const handle = (
    <button type="button" className="icon-btn grip" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label="اسحب لتغيير الترتيب" title="اسحب لتغيير الترتيب" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      <IcGrip />
    </button>
  );
  return <div ref={setNodeRef} style={style} className={isDragging ? 'sort-row is-drag' : 'sort-row'}>{children(handle)}</div>;
}

function itemTitle(it: any, member: Field, lang: Lang): string {
  if (!it || typeof it !== 'object') return '';
  if (member.type === 'image') return it.url ? decodeURIComponent(String(it.url).split('/').pop() || '') : '';
  const fromLang = (v: any) => (v && typeof v === 'object' && !Array.isArray(v) ? String(v[lang] || v.ar || '') : typeof v === 'string' ? v : '');
  for (const f of member.fields ?? []) {
    if (f.type === 'localeString' || f.type === 'string') { const t = fromLang(it[f.name]).trim(); if (t) return t; }
  }
  return sectionLabel(it);
}

/** A line of a hideable list, hidden ⇄ shown («hidden: true» on the line; nothing is deleted). */
function hideToggled(y: any): any {
  if (!y || typeof y !== 'object') return y;
  const { hidden, ...rest } = y;
  return hidden ? rest : { ...rest, hidden: true };
}
const itemText = (it: any, lang: Lang) => (it && typeof it === 'object' ? String(it[lang] || it.ar || '').trim() : '');

function HideButton({ off, label, onToggle }: { off: boolean; label: string; onToggle: () => void }) {
  return (
    <button type="button" className={'icon-btn' + (off ? ' is-off' : '')} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
      aria-pressed={!off} aria-label={off ? `إظهار ${label}` : `إخفاء ${label}`} title={off ? 'مخفي عن الزوار — اضغط للإظهار' : 'ظاهر — اضغط للإخفاء (بدون حذف)'}>
      {off ? <IcEyeOff /> : <IcEye />}
    </button>
  );
}

function ItemButtons({ i, n, move, del }: { i: number; n: number; move: (i: number, d: number) => void; del: (i: number) => void }) {
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); fn(); };
  return (
    <span style={{ display: 'flex', flex: 'none' }}>
      <button type="button" className="icon-btn" disabled={i === 0} onClick={stop(() => move(i, -1))} aria-label="للأعلى"><IcUp /></button>
      <button type="button" className="icon-btn" disabled={i === n - 1} onClick={stop(() => move(i, 1))} aria-label="للأسفل"><IcDown /></button>
      <button type="button" className="icon-btn danger" onClick={stop(() => del(i))} aria-label="حذف"><IcTrash /></button>
    </span>
  );
}

const SAMPLE = { ar: 'لا نبيع تصاميم. نبني أنظمة أرباح ١٢٣', en: 'We build profit systems. 0123' };

/** A font: a ready one, any Google Fonts link (pasted → checked at Google → used), or an uploaded file. */
function FontInput({ f, value, onChange, id }: { f: Field; value: any; onChange: (v: any) => void; id: string }) {
  const script = ((f.options as { script?: string } | undefined)?.script === 'en' ? 'en' : 'ar') as Lang;
  const cur: FontChoice = asFontChoice(value, script === 'en' ? DEFAULT_EN : DEFAULT_AR);
  const [mode, setMode] = useState<FontChoice['kind']>(cur.kind);
  const [paste, setPaste] = useState(cur.kind === 'google' ? `https://fonts.google.com/specimen/${cur.family.replace(/ /g, '+')}` : '');
  const [st, setSt] = useState<{ busy?: boolean; err?: string; ok?: string }>({});
  const file = useRef<HTMLInputElement>(null);
  const presets = Object.entries(PRESETS).filter(([k, p]) => p.script === 'both' || p.script === script || k === 'thmanyah');
  const load = fontLoad(cur);

  async function check(text: string) {
    if (!text.trim()) return;
    setSt({ busy: true });
    try {
      const r = await checkFontAction(text);
      if (r.ok) {
        onChange({ kind: 'google', family: r.family, weights: r.weights });
        setSt({ ok: `تم ✓ «${r.family}» — الأوزان: ${r.weights.join('، ')}` });
      } else setSt({ err: r.error });
    } catch { setSt({ err: 'تعذّر الاتصال، حاول مرة أخرى' }); }
  }
  async function upload(fl?: File | null) {
    if (!fl) return;
    if (!/\.(woff2?|ttf|otf)$/i.test(fl.name)) { setSt({ err: 'ارفع ملف خط: woff2 أو woff أو ttf أو otf' }); return; }
    setSt({ busy: true });
    try {
      const u = await uploadFile(fl);
      const family = (fl.name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9 -]+/g, ' ').trim() || 'Custom Font').slice(0, 50);
      onChange({ kind: 'file', family, url: u.url });
      setSt({ ok: `تم رفع «${fl.name}» ✓` });
    } catch (e) { setSt({ err: (e as Error).message }); }
    if (file.current) file.current.value = '';
  }
  return (
    <div className="font">
      {load.href && <link rel="stylesheet" href={load.href} />}
      {load.faceCss && <style>{load.faceCss}</style>}
      <div className="seg" role="group" aria-label="مصدر الخط">
        <button type="button" aria-pressed={mode === 'preset'} onClick={() => setMode('preset')}>خطوط جاهزة</button>
        <button type="button" aria-pressed={mode === 'google'} onClick={() => setMode('google')}>Google Fonts</button>
        <button type="button" aria-pressed={mode === 'file'} onClick={() => setMode('file')}>رفع ملف</button>
      </div>
      {mode === 'preset' && (
        <select id={id} className="inp" value={cur.kind === 'preset' ? cur.id : ''} onChange={(e) => { onChange({ kind: 'preset', id: e.target.value }); setSt({}); }}>
          {cur.kind !== 'preset' && <option value="">— اختر —</option>}
          {presets.map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
        </select>
      )}
      {mode === 'google' && (
        <>
          <div className="font__row">
            <input id={id} className="inp" dir="ltr" placeholder="https://fonts.google.com/specimen/Cairo" value={paste}
              onChange={(e) => setPaste(e.target.value)}
              onPaste={(e) => { const t = e.clipboardData.getData('text'); if (t) { e.preventDefault(); setPaste(t); check(t); } }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); check(paste); } }} />
            <button type="button" className="btn btn--soft" disabled={st.busy || !paste.trim()} onClick={() => check(paste)}>{st.busy ? '…' : 'استخدم'}</button>
          </div>
          <span className="desc">افتح fonts.google.com، اختر خطاً، وانسخ رابط صفحته أو رابط «Get embed code» والصقه هنا. أو اكتب اسمه فقط.</span>
        </>
      )}
      {mode === 'file' && (
        <div className="font__row">
          <button type="button" className="btn btn--soft" disabled={st.busy} onClick={() => file.current?.click()}>{st.busy ? 'جارٍ الرفع…' : 'رفع ملف خط (woff2)'}</button>
          <input ref={file} type="file" hidden accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf" onChange={(e) => upload(e.target.files?.[0])} />
        </div>
      )}
      {st.err && <span className="err">{st.err}</span>}
      {st.ok && <span className="ok">{st.ok}</span>}
      <div className="font__pv" dir={script === 'ar' ? 'rtl' : 'ltr'} style={{ fontFamily: fontStack(cur, script) }}>
        <b>{SAMPLE[script]}</b>
        <span>{cur.kind === 'preset' ? PRESETS[cur.id]?.label : cur.family}</span>
      </div>
    </div>
  );
}
