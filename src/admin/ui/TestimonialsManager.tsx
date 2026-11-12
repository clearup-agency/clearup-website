'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ContentSnapshot, SectionRow } from '@/db/schema';
import { buildView, snapshotToRaw } from '@/lib/view';
import { homeCount, onHome, testimonialCards, TESTIMONIALS_MAX, type TestimonialCard } from '@/lib/testimonials';
import { storyPoster } from '@/lib/cdn';
import { IcGrip, IcPlus } from './icons';

/* «عملاؤنا يحكون» — the testimonial videos (Nov 9, 2026 — Mohamed: «بدي أضيف فيديو رابع، خامس، عاشر… وأتحكم شو
   بيظهر بالرئيسية وبأي ترتيب»). The list is exactly what the site shows (the same testimonialCards as the public
   section, built from the same draft), so what is ticked here is what the preview and the site show:
   • drag = the order on Home and on «أعمالنا»;
   • «يظهر بالرئيسية» = which ones Home shows, up to «عدد الفيديوهات بالرئيسية»; «أعمالنا» shows them all.
   Stored on Home's testimonials section (order, onHome, limit) whichever page's copy is being edited. */

const arNum = (n: number) => n.toLocaleString('ar-EG');

export default function TestimonialsManager({ content, home, onChange }: {
  content: ContentSnapshot; home: SectionRow | null; onChange: (data: Record<string, unknown>, key: string) => void;
}) {
  const d = (home?.data ?? {}) as Record<string, unknown>;
  const cards = useMemo(() => {
    const view = buildView(snapshotToRaw(content), 'ar', 'work', { editor: true });
    return testimonialCards(view.ctx.cases, d.order);
  }, [content, d.order]);
  const count = homeCount(d.limit);
  const on = cards.map((c, i) => onHome(c, i, d));
  const shown = new Set(cards.filter((_, i) => on[i]).slice(0, count).map((c) => c.id));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  if (!home) return <section className="card"><h2>الفيديوهات</h2><p className="le-hint">ما في قسم «عملاؤنا يحكون» بالصفحة الرئيسية. ضيفه للرئيسية أولاً.</p></section>;

  // every change writes the whole order and the switches as they are now (so a drag never changes what Home shows)
  const write = (list: TestimonialCard[], onIds: string[], limit: number, key: string) =>
    onChange({ ...d, order: list.map((c) => c.id), onHome: onIds, limit }, `${home.id}:${key}`);
  const onIds = () => cards.filter((_, i) => on[i]).map((c) => c.id);
  const toggle = (c: TestimonialCard, i: number) => {
    const ids = onIds();
    write(cards, on[i] ? ids.filter((x) => x !== c.id) : [...ids, c.id], count, 'onHome');
  };
  const setCount = (n: number) => write(cards, onIds(), Math.max(1, Math.min(TESTIMONIALS_MAX, n)), 'limit');
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = cards.findIndex((c) => c.id === e.active.id), to = cards.findIndex((c) => c.id === e.over!.id);
    if (from < 0 || to < 0) return;
    write(arrayMove(cards, from, to), onIds(), count, 'order');
  };
  const onCount = cards.filter((_, i) => on[i]).length;

  return (
    <section className="card tm">
      <h2>الفيديوهات ({arNum(cards.length)})</h2>
      <p className="le-hint">نفس الترتيب بالرئيسية وبصفحة «أعمالنا». اسحب <IcGrip /> لتغيير الترتيب. صفحة «أعمالنا» بتعرض كل الفيديوهات.</p>
      <div className="tm-count">
        <label htmlFor="tm-count">عدد الفيديوهات بالرئيسية</label>
        <div className="tm-step">
          <button type="button" className="le-ib" onClick={() => setCount(count - 1)} disabled={count <= 1} aria-label="أقل">−</button>
          <input id="tm-count" type="number" className="inp" dir="ltr" min={1} max={TESTIMONIALS_MAX} value={count}
            onChange={(e) => { const n = parseInt(e.target.value, 10); if (n >= 1) setCount(n); }} />
          <button type="button" className="le-ib" onClick={() => setCount(count + 1)} disabled={count >= TESTIMONIALS_MAX} aria-label="أكثر">+</button>
        </div>
      </div>
      <p className="tm-sum" role="status">بالرئيسية الآن: <b>{arNum(shown.size)}</b> من {arNum(cards.length)}{cards.length > shown.size ? ' · والباقي بيبين برابط «شوف كل الآراء»' : ''}</p>
      {cards.length ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <ol className="tm-list">
              {cards.map((c, i) => (
                <Row key={c.id} c={c} n={i + 1} on={on[i]} shown={shown.has(c.id)} overCount={on[i] && !shown.has(c.id)} onToggle={() => toggle(c, i)} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      ) : <p className="le-hint">لسا ما في فيديوهات.</p>}
      {onCount > count && <p className="le-hint tm-warn">مفعّل {arNum(onCount)} للرئيسية بس العدد {arNum(count)} — بيظهر أول {arNum(count)} بالترتيب.</p>}
      <Link className="btn btn--soft btn--block tm-add" href="/admin/stories/"><IcPlus /> إضافة فيديو جديد</Link>
      <p className="le-hint" style={{ marginTop: 8 }}>من «العملاء»: افتح العميل (أو «+ عميل جديد») ← «رأي العميل» ← ارفع الفيديو واكتب جملة قصيرة واسم الشخص ← «حفظ ونشر». بعدها بيبين هون بآخر القائمة، وفعّل «يظهر بالرئيسية» إذا بدك ياه بالرئيسية.</p>
    </section>
  );
}

function Row({ c, n, on, shown, overCount, onToggle }: { c: TestimonialCard; n: number; on: boolean; shown: boolean; overCount: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 5 : undefined, position: 'relative' };
  const v = (c.video ?? {}) as Record<string, any>;
  const poster: string = storyPoster(v as never, 160) || v.image?.url || v.image?.src || '';
  const file: string = typeof v.video === 'string' ? v.video : v.video?.url || '';
  const who = [c.person, c.role].filter(Boolean).join(' · ');
  return (
    <li ref={setNodeRef} style={style} className={'tm-row' + (isDragging ? ' is-drag' : '') + (shown ? ' is-home' : '')}>
      <button type="button" className="handle" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`اسحب لتغيير ترتيب ${c.client}`} title="اسحب لتغيير الترتيب"><IcGrip /></button>
      <span className="tm-n" aria-hidden="true">{n}</span>
      <span className="tm-pic" aria-hidden="true">
        {poster ? <img src={poster} alt="" loading="lazy" /> : file ? <video src={file + '#t=0.5'} muted playsInline preload="metadata" /> : null}
      </span>
      <span className="tm-t">
        <b>{c.client}</b>
        {who && <small>{who}</small>}
        <small className={'tm-where' + (shown ? ' on' : '')}>{shown ? 'بالرئيسية + «أعمالنا»' : overCount ? '«أعمالنا» بس (أكثر من العدد)' : '«أعمالنا» بس'}</small>
      </span>
      <label className="sw tm-sw" title="يظهر بالرئيسية">
        <input type="checkbox" checked={on} onChange={onToggle} aria-label={`${c.client}: يظهر بالرئيسية`} />
        <span className="sw__t" /><span className="sw__l">يظهر بالرئيسية</span>
      </label>
    </li>
  );
}
