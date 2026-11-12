'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ContentSnapshot, SectionRow } from '@/db/schema';
import { SCHEMA, SECTION_TYPES, emptyValue, newKey, rekey, sectionLabel, typeTitle, type Field } from '@/admin/content';
import { discardDraft, listVersions, loadVersion, logoutAction, publishDraft, saveDraft } from '@/admin/actions';
import { seedContent } from '@/lib/view';
import { FieldList, type Lang } from './Fields';
import StoriesManager, { type StoryClient } from './StoriesManager';
import TestimonialsManager from './TestimonialsManager';
import { Confirm, useToast } from './Toast';
import { IcBack, IcCog, IcCopy, IcDesktop, IcEye, IcEyeOff, IcGrip, IcHistory, IcLayers, IcMore, IcPhone, IcPlus, IcRedo, IcTrash, IcUndo, MarkLight } from './icons';
import { CHAT_ID, FOOTER_ID, MSG, NAV_ID, type PageMsg, type SelectMsg } from './preview-protocol';
import { CASES, CASE_TYPE, PAGE_IDS, PAGE_INFO, isPageId, pageOf, slugify } from '@/lib/pages';
import { fieldTrail, parents } from '@/admin/inspect';
import { readerData, sourceRow, splitChange } from '@/admin/shared';

/* The live editor (/admin): the real site on the left, everything editable on the right.
   Every change shows in the preview instantly (it is a draft, saved automatically so a refresh loses nothing);
   «نشر» puts the draft on the public site. Undo/redo here, and the history of every publish. */

type Tab = 'sections' | 'settings' | 'history';
type Device = 'desktop' | 'mobile';
type Version = { id: number; at: string; action: string; detail: string | null };
const FREE = ['clientStoriesSection', 'textImageSection', 'gallerySection', 'statsSection'];
type EditPage = (typeof PAGE_IDS)[number] | typeof CASES;
const PAGE_ORDER: EditPage[] = ['home', 'services', 'work', CASES, 'about', 'contact'];
const DESKTOP_W = 1280;
const ACTION: Record<string, string> = {
  publish: 'نشر من المحرر', edit: 'تعديل قسم', settings: 'تعديل الإعدادات', hide: 'إخفاء قسم', show: 'إظهار قسم', reorder: 'تغيير الترتيب',
  add: 'إضافة قسم', duplicate: 'نسخ قسم', delete: 'حذف قسم', import: 'استيراد نسخة', restore: 'استرجاع نسخة', seed: 'تحميل المحتوى الأولي',
};
const fmt = (s: string) => new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' }).format(new Date(s));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export default function LiveEditor({ published: initialPublished, draft, initialSelected, initialTab, version }: {
  published: ContentSnapshot; draft: ContentSnapshot | null; initialSelected?: string | null; initialTab?: Tab; version?: number | null;
}) {
  // the newest history entry when this editor opened: «حفظ ونشر» checks nothing was published elsewhere since
  const baseVer = useRef<number | null | undefined>(version);
  const [published, setPublished] = useState(initialPublished);
  // the content being edited + undo/redo stacks, in one state so each step is one update
  const [h, setH] = useState<{ content: ContentSnapshot; past: ContentSnapshot[]; future: ContentSnapshot[] }>(() => ({ content: draft ?? initialPublished, past: [], future: [] }));
  const content = h.content;
  const setContent = useCallback((c: ContentSnapshot) => setH((p) => ({ ...p, content: c })), []);
  const lastPush = useRef<{ key: string; at: number }>({ key: '', at: 0 });
  const [selected, setSelected] = useState<string | null>(initialSelected ?? null);
  // the field being edited inside the selected section (or the settings, prefixed "s:") — set by clicking an element on the preview
  const [focusPath, setFocusPath] = useState<string | null>(null);
  const [focusReq, setFocusReq] = useState(0);
  const focusRef = useRef<string | null>(null);
  useEffect(() => { focusRef.current = focusPath; }, [focusPath]);
  const [tab, setTab] = useState<Tab>(initialTab ?? 'sections');
  // which page of the site is being edited (the preview shows it); «قصص العملاء» = the case-study collection
  const [page, setPageState] = useState<EditPage>('home');
  const [openGroup, setOpenGroup] = useState<string>('brand');
  const [lang, setLang] = useState<Lang>('ar');
  const [device, setDevice] = useState<Device>('desktop');
  const [mobileView, setMobileView] = useState<'preview' | 'panel'>('panel');
  const [savedDraft, setSavedDraft] = useState<string | null>(() => (draft ? JSON.stringify(draft) : null));
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<null | { kind: 'delete'; s: SectionRow } | { kind: 'discard' } | { kind: 'version'; v: Version } | { kind: 'conflict' }>(null);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const { show, node } = useToast();
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const serverHasDraft = useRef(!!draft);

  const dirty = !same(content, published);
  const sel = content.sections.find((s) => s.id === selected) ?? null;
  // a section that shows another section's text (Home's services, growth path, tools…): edited in place (admin/shared.ts)
  const selSrc = sel ? sourceRow(sel, content.sections) : null;
  const onPage = useMemo(() => content.sections.filter((s) => (page === CASES ? s.type === CASE_TYPE : pageOf(s) === page && s.type !== CASE_TYPE)), [content.sections, page]);
  const labels = useMemo(() => Object.fromEntries(content.sections.map((s) => [s.id, typeTitle(s.type)])), [content.sections]);

  // ——— every change goes through here (undo history; typing in one field within a moment counts as one step) ———
  const update = useCallback((fn: (c: ContentSnapshot) => ContentSnapshot, key = '') => {
    const now = Date.now();
    const merge = !!key && lastPush.current.key === key && now - lastPush.current.at < 900;
    lastPush.current = { key, at: now };
    setH((p) => {
      const next = fn(p.content);
      if (next === p.content) return p;
      return { content: next, past: merge ? p.past : [...p.past.slice(-80), p.content], future: [] };
    });
  }, []);
  const undo = useCallback(() => {
    lastPush.current = { key: '', at: 0 };
    setH((p) => (p.past.length ? { content: p.past[p.past.length - 1], past: p.past.slice(0, -1), future: [p.content, ...p.future].slice(0, 80) } : p));
  }, []);
  const redo = useCallback(() => {
    lastPush.current = { key: '', at: 0 };
    setH((p) => (p.future.length ? { content: p.future[0], past: [...p.past, p.content], future: p.future.slice(1) } : p));
  }, []);

  const setSection = (id: string, fn: (s: SectionRow) => SectionRow, key = '') =>
    update((c) => ({ ...c, sections: c.sections.map((s) => (s.id === id ? fn(s) : s)) }), key);

  // ——— the preview: send the draft on every change (and whenever the iframe (re)loads) ———
  const post = useCallback((msg: unknown) => frame.current?.contentWindow?.postMessage(msg, window.location.origin), []);
  // the preview shows the page being edited; on «قصص العملاء» the selected story's page (else the Work page)
  const sendDraft = useCallback(() => {
    const s = page === CASES ? content.sections.find((x) => x.id === selected && x.type === CASE_TYPE) : undefined;
    post({ type: MSG.draft, content, selected, labels, page: page === CASES ? (s ? CASES : 'work') : page, caseId: s?.id ?? null });
  }, [post, content, selected, labels, page]);
  useEffect(() => {
    const id = requestAnimationFrame(sendDraft);
    return () => cancelAnimationFrame(id);
  }, [sendDraft]);
  const sendRef = useRef(sendDraft);
  useEffect(() => { sendRef.current = sendDraft; }, [sendDraft]);

  const select = useCallback((id: string | null, opts: { scroll?: boolean; panel?: boolean } = {}) => {
    setSelected(id);
    setFocusPath(null);
    if (id) {
      setTab('sections');
      if (opts.scroll !== false) setTimeout(() => post({ type: MSG.scroll, id }), 30);
    }
    if (opts.panel) setMobileView('panel');
  }, [post]);

  const contentRef = useRef(content);
  useEffect(() => { contentRef.current = content; }, [content]);
  const setPage = useCallback((p: EditPage, caseSlug?: string | null) => {
    setPageState(p);
    setFocusPath(null);
    setTab('sections');
    const c = caseSlug ? contentRef.current.sections.find((s) => s.type === CASE_TYPE && (s.data as Record<string, unknown>).slug === caseSlug) : null;
    setSelected(c ? c.id : null);
    setTimeout(() => frame.current?.contentWindow?.scrollTo({ top: 0 }), 40);
  }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const m = e.data as SelectMsg | { type: string };
      if (m?.type === MSG.ready) sendRef.current();
      else if (m?.type === MSG.page) {
        const pm = m as PageMsg;
        if (pm.slug) setPage(CASES, pm.slug);
        else if (isPageId(pm.page)) setPage(pm.page);
      }
      else if (m?.type === MSG.select && typeof (m as SelectMsg).id === 'string') {
        const { id, path } = m as SelectMsg;
        const p = typeof path === 'string' && path ? path : null;
        if (id === NAV_ID || id === FOOTER_ID || id === CHAT_ID || p?.startsWith('s:')) {
          setSelected(null);
          setTab('settings');
          const sf = p ? SCHEMA.settings.fields?.find((f) => f.name === p.slice(2).split('.')[0]) : null;
          setOpenGroup(sf?.group ?? (id === NAV_ID ? 'header' : id === CHAT_ID ? 'chatbot' : 'footer'));
          setFocusPath(p ?? (id === CHAT_ID ? 's:chatbot' : null));
        } else {
          setSelected(id);
          setTab('sections');
          setFocusPath(p);
        }
        setFocusReq((x) => x + 1);
        setMobileView('panel');
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [setPage]);

  // ——— autosave the draft (so a refresh, or another device, continues where you stopped) ———
  const json = useMemo(() => JSON.stringify(content), [content]);
  const unsaved = dirty && savedDraft !== json; // changes not yet in the database
  useEffect(() => {
    if (!dirty) {
      if (serverHasDraft.current) { serverHasDraft.current = false; discardDraft().catch(() => {}); }
      return;
    }
    if (savedDraft === json) return;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        const r = await saveDraft(JSON.parse(json));
        serverHasDraft.current = true;
        if (r.ok) setSavedDraft(json);
        setSaveErr(!r.ok);
      } catch { setSaveErr(true); }
      setSaving(false);
    }, 500);
    return () => clearTimeout(t);
  }, [json, dirty, savedDraft]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (unsaved) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  // keyboard: Ctrl/⌘+Z, Ctrl/⌘+Shift+Z (outside text fields, which keep their own undo)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      // Esc goes up one level: field → section → all sections (like leaving an element in DevTools)
      if (e.key === 'Escape') {
        if (t.closest('input, textarea, select, [contenteditable]')) (t as HTMLElement).blur();
        if (focusRef.current) setFocusPath(null);
        else setSelected(null);
        return;
      }
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [undo, redo]);


  // inspect: bring the clicked element's field into view in the panel, open what hides it, focus its input
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!focusPath) return;
    const t = setTimeout(() => {
      const root = panel.current;
      if (!root) return;
      const want = focusPath.startsWith('s:') ? focusPath.slice(2) : focusPath;
      let el: HTMLElement | null = null;
      for (const p of parents(want)) { el = root.querySelector<HTMLElement>(`[data-path="${window.CSS.escape(p)}"]`); if (el) break; }
      if (!el) return;
      for (let d = el.parentElement?.closest('details'); d; d = d.parentElement?.closest('details')) d.open = true;
      if (el.tagName === 'DETAILS') (el as HTMLDetailsElement).open = true;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      root.querySelectorAll('.is-focus').forEach((x) => x.classList.remove('is-focus'));
      el.classList.add('is-focus');
      // an image: its upload button; a text: the input in the preview's language; else the first control
      const inp = el.querySelector<HTMLElement>(':scope > div > .img .img__acts button, :scope > .img .img__acts button') ?? el.querySelector<HTMLElement>(`[data-lang="${lang}"] .inp`) ?? el.querySelector<HTMLElement>('input:not([type=hidden]):not([type=color]), textarea, select, button');
      inp?.focus({ preventScroll: true });
      if (inp instanceof HTMLInputElement || inp instanceof HTMLTextAreaElement) { const n = inp.value.length; try { inp.setSelectionRange(n, n); } catch { /* not a text input */ } }
    }, 80);
    return () => clearTimeout(t);
    // runs when the preview asks for a field (not when you click into a field in the panel yourself)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusReq]);
  // and the other way: a field focused in the panel outlines its element on the preview
  useEffect(() => {
    const root = panel.current;
    if (!root) return;
    const on = (e: FocusEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-path]');
      if (!el) return;
      const p = el.dataset.path!;
      const full = tab === 'settings' ? 's:' + p : p;
      focusRef.current = full;
      setFocusPath((cur) => (cur === full ? cur : full));
      root.querySelectorAll('.is-focus').forEach((x) => x !== el && x.classList.remove('is-focus'));
      post({ type: MSG.focus, id: tab === 'settings' ? '' : selected ?? '', path: full });
    };
    root.addEventListener('focusin', on);
    return () => root.removeEventListener('focusin', on);
  }, [tab, selected, post]);
  useEffect(() => { if (!focusPath) post({ type: MSG.focus, id: '', path: '' }); }, [focusPath, post]);

  // preview size: the desktop site is drawn at 1280 px and scaled to fit; the phone at 390 px
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  async function publish(force = false) {
    setBusy(true);
    try {
      const r = await publishDraft(content, baseVer.current, force);
      if (r.conflict) { setConfirm({ kind: 'conflict' }); setBusy(false); return; }
      if (r.ok && r.content) {
        baseVer.current = r.version;
        setPublished(r.content);
        setContent(r.content);
        setSavedDraft(null);
        serverHasDraft.current = false;
        setVersions(null);
        show('تم الحفظ والنشر ✓ التعديلات على الموقع خلال ثوانٍ', 'ok');
      } else show(r.error || 'لم يتم النشر، حاول مرة أخرى', 'bad');
    } catch { show('انقطع الاتصال، حاول مرة أخرى', 'bad'); }
    setBusy(false);
  }

  // ——— section actions (all in the draft until «نشر») ———
  function addSection(type: string) {
    const t = SECTION_TYPES[type];
    if (!t) return;
    const template = type === CASE_TYPE ? null : seedContent.sections.find((s) => s.type === type);
    let data: Record<string, unknown>;
    if (template) { data = rekey(template.data); delete data.anchor; }
    else data = Object.fromEntries((t.fields ?? []).filter((f) => f.name !== 'hidden').map((f) => [f.name, emptyValue(f)]).filter(([, v]) => v !== undefined));
    const id = newKey();
    const target = type === CASE_TYPE ? CASES : page === CASES ? 'work' : page;
    if (type === CASE_TYPE) {
      // a new story starts hidden (so a half-written one never reaches visitors) with a unique link
      const n = content.sections.filter((s) => s.type === CASE_TYPE).length + 1;
      data = { ...data, slug: slugify(`client-${n}`), featured: false };
    }
    update((c) => {
      // after the selected section, else at the end of this page's sections
      const last = [...c.sections].reverse().find((s) => (target === CASES ? s.type === CASE_TYPE : pageOf(s) === target && s.type !== CASE_TYPE));
      const after = selected ?? last?.id ?? null;
      const at = after ? c.sections.findIndex((s) => s.id === after) + 1 : c.sections.length;
      const sections = [...c.sections];
      sections.splice(at > 0 ? at : sections.length, 0, { id, type, hidden: type === CASE_TYPE, data, page: target });
      return { ...c, sections };
    });
    setAdding(false);
    select(id, { panel: true });
    show(type === CASE_TYPE ? 'أُضيفت قصة جديدة (مخفية حتى تكملها) — اكتب اسم العميل وأظهرها' : `أُضيف «${t.title}» — عدّله وشوفه بالمعاينة`, 'info');
  }
  function duplicate(s: SectionRow) {
    const id = newKey();
    update((c) => {
      const i = c.sections.findIndex((x) => x.id === s.id);
      const sections = [...c.sections];
      const data = rekey(s.data) as Record<string, unknown>;
      // a copied story gets its own link (and stays hidden until it is edited)
      if (s.type === CASE_TYPE) {
        const taken = new Set(c.sections.map((x) => String((x.data as Record<string, unknown>).slug ?? '')));
        let slug = String(data.slug || 'case') + '-2', n = 2;
        while (taken.has(slug)) slug = String(data.slug || 'case') + '-' + ++n;
        data.slug = slug;
      }
      sections.splice(i + 1, 0, { ...s, id, data, ...(s.type === CASE_TYPE ? { hidden: true } : {}) });
      return { ...c, sections };
    });
    select(id);
  }
  function remove(s: SectionRow) {
    update((c) => ({ ...c, sections: c.sections.filter((x) => x.id !== s.id) }));
    if (selected === s.id) setSelected(null);
    show('حُذف القسم من المسودة (تقدر تتراجع)', 'info');
  }
  const toggle = (s: SectionRow) => setSection(s.id, (x) => ({ ...x, hidden: !x.hidden }));
  // the testimonial videos' order, «يظهر بالرئيسية» and count live on Home's section (lib/view.ts sharedSource)
  const proofHome = useMemo(() => {
    const homes = content.sections.filter((x) => x.type === 'proofSection' && (x.page || 'home') === 'home');
    return homes.find((x) => !x.hidden) ?? homes[0] ?? null;
  }, [content.sections]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    update((c) => {
      const from = c.sections.findIndex((r) => r.id === e.active.id);
      const to = c.sections.findIndex((r) => r.id === e.over!.id);
      return { ...c, sections: arrayMove(c.sections, from, to) };
    });
    setTimeout(() => post({ type: MSG.scroll, id: String(e.active.id) }), 60);
  }

  async function openHistory() {
    setTab('history');
    setSelected(null);
    try {
      const v = await listVersions(40);
      setVersions(v.map((x) => ({ id: x.id, at: new Date(x.at).toISOString(), action: x.action, detail: x.detail })));
    } catch { setVersions([]); }
  }
  async function openVersion(v: Version) {
    const r = await loadVersion(v.id);
    if (r.ok && r.content) {
      const c = r.content;
      update(() => c);
      setSelected(null);
      show('فتحنا النسخة بالمعاينة — اضغط «حفظ ونشر» لتصير على الموقع', 'info');
    } else show(r.error || 'تعذّر فتح النسخة', 'bad');
  }

  // ——— preview geometry ———
  const phoneish = stageSize.w > 0 && stageSize.w < 600;
  const frameW = device === 'mobile' || phoneish ? Math.min(390, stageSize.w || 390) : Math.max(DESKTOP_W, stageSize.w);
  const scale = device === 'desktop' && !phoneish && stageSize.w ? Math.min(1, stageSize.w / frameW) : 1;
  const realPhone = phoneish && device === 'desktop'; // on a phone the preview simply fills the screen
  const frameH = device === 'mobile' && !phoneish ? Math.max(400, stageSize.h - 28) : stageSize.h / scale;
  const frameSrc = `/preview/${lang}/`;

  const status = busy ? 'جارٍ الحفظ والنشر…'
    : !dirty ? 'كل شي منشور ✓'
    : saveErr ? 'ما انحفظ: تأكد من الإنترنت'
    : unsaved || saving ? 'في تعديلات مش منشورة · بنحفظها…'
    : 'في تعديلات مش منشورة (محفوظة كمسودة)';

  return (
    <div className="le" data-mview={mobileView}>
      <header className="le-bar">
        <Link href="/admin/" className="le-brand" aria-label="ClearUp"><MarkLight /><span>CLEAR UP</span></Link>
        <div className="le-seg" role="group" aria-label="لغة المعاينة والنصوص">
          <button aria-pressed={lang === 'ar'} onClick={() => setLang('ar')}>عربي</button>
          <button aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
        </div>
        <div className="le-seg le-dev" role="group" aria-label="حجم المعاينة">
          <button aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')} title="كمبيوتر" aria-label="كمبيوتر"><IcDesktop /></button>
          <button aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')} title="موبايل" aria-label="موبايل"><IcPhone /></button>
        </div>
        <div className="le-undo">
          <button className="le-ib" onClick={undo} disabled={!h.past.length} title="تراجع" aria-label="تراجع"><IcUndo /></button>
          <button className="le-ib" onClick={redo} disabled={!h.future.length} title="إعادة" aria-label="إعادة"><IcRedo /></button>
        </div>
        <span className={'le-st' + (dirty ? ' dirty' : '') + (saveErr ? ' bad' : '')} role="status" aria-live="polite"><span className="dot" /> <span className="le-st__t">{status}</span></span>
        <Link href="/admin/stories/" className="btn btn--soft le-stories" title="العملاء: الأعمال (ستوري) + رأي العميل + قصة المشروع"><span className="le-ring" aria-hidden="true" /><span>العملاء</span></Link>
        <button className="btn le-pub" onClick={() => publish()} disabled={busy || !dirty}>
          {dirty && <span className="le-pub__dot" aria-hidden="true" />}حفظ ونشر
        </button>
        <div className="le-menu">
          <button className="le-ib" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="المزيد" title="المزيد"><IcMore /></button>
          {menu && (
            <div className="le-menu__box" onClick={() => setMenu(false)}>
              <a href={`/${lang}/`} target="_blank" rel="noopener">فتح الموقع المنشور ↗</a>
              <button disabled={!dirty} onClick={() => setConfirm({ kind: 'discard' })}>تجاهل كل التغييرات غير المنشورة</button>
              <Link href="/admin/backup/">نسخة احتياطية (تنزيل / استيراد)</Link>
              <Link href="/admin/account/">الحساب وكلمة المرور</Link>
              <form action={logoutAction}><button>تسجيل الخروج</button></form>
            </div>
          )}
        </div>
      </header>

      <div className="le-main">
        <aside className="le-panel" aria-label="لوحة التعديل" ref={panel}>
          <nav className="le-pages" aria-label="صفحات الموقع">
            {PAGE_ORDER.map((p) => (
              <button key={p} type="button" aria-pressed={page === p} className={p === CASES ? 'is-sub' : ''} onClick={() => setPage(p)}>
                {PAGE_INFO[p].title}
                <small>{p === CASES ? content.sections.filter((s) => s.type === CASE_TYPE).length : content.sections.filter((s) => pageOf(s) === p && s.type !== CASE_TYPE).length}</small>
              </button>
            ))}
          </nav>
          <div className="le-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'sections'} onClick={() => setTab('sections')}><IcLayers /> {page === CASES ? 'القصص' : 'الأقسام'}</button>
            <button role="tab" aria-selected={tab === 'settings'} onClick={() => { setTab('settings'); setSelected(null); }}><IcCog /> إعدادات الموقع</button>
            <button role="tab" aria-selected={tab === 'history'} onClick={openHistory}><IcHistory /> السجل</button>
          </div>
          {((tab === 'sections' && sel) || (tab === 'settings' && focusPath)) && (
            <Crumbs
              root={tab === 'sections' ? 'الأقسام' : 'إعدادات الموقع'}
              section={tab === 'sections' && sel ? typeTitle(sel.type) : null}
              trail={focusPath ? fieldTrail(tab === 'sections' && sel ? SECTION_TYPES[sel.type]?.fields ?? [] : SCHEMA.settings.fields ?? [], focusPath.replace(/^s:/, '')) : []}
              onRoot={() => { setFocusPath(null); if (tab === 'sections') setSelected(null); }}
              onSection={() => setFocusPath(null)}
              onField={(p) => { setFocusPath((tab === 'settings' ? 's:' : '') + p); setFocusReq((x) => x + 1); }}
            />
          )}
          <div className="le-scroll">
            {tab === 'sections' && !sel && (
              <>
                {page !== CASES && (
                  <PageSettings page={page} value={content.settings} lang={lang}
                    onChange={(settings, key) => update((c) => ({ ...c, settings }), key)} />
                )}
                {page === CASES && (
                  <p className="le-hint le-hint--box">الأسهل: كل عميل (أعماله، رأيه، قصة المشروع) صار بشاشة وحدة في <Link href="/admin/stories/">«العملاء»</Link>. القصص هنا بتظهر هناك كمان.</p>
                )}
                <SectionList rows={onPage} cases={page === CASES} selected={selected} sensors={sensors} onDragEnd={onDragEnd}
                  onSelect={(id) => select(id)} onToggle={toggle} onDuplicate={duplicate} onDelete={(s) => setConfirm({ kind: 'delete', s })}
                  onAdd={() => (page === CASES ? addSection(CASE_TYPE) : setAdding(true))} />
              </>
            )}
            {tab === 'sections' && sel && (
              <SectionEditor s={selSrc ? { ...sel, data: readerData(sel, selSrc) } : sel} lang={lang} shared={selSrc ? sharedNote(selSrc) : undefined} focus={focusPath}
                testimonials={sel.type === 'proofSection'
                  ? <TestimonialsManager content={content} home={proofHome} onChange={(data, key) => { if (proofHome) setSection(proofHome.id, (x) => ({ ...x, data }), key); }} />
                  : undefined}
                onBack={() => setSelected(null)}
                onChange={(data, key) => {
                  if (!selSrc) return setSection(sel.id, (x) => ({ ...x, data }), key);
                  // a reader of a shared section: the text goes to its source (so it changes everywhere), the
                  // placement and design stay this section's own — one undo step
                  const sp = splitChange(sel, selSrc, data);
                  update((c) => ({ ...c, sections: c.sections.map((x) => (x.id === sel.id ? { ...x, data: sp.reader } : x.id === selSrc.id ? { ...x, data: sp.source } : x)) }), key);
                }}
                onToggle={() => toggle(sel)} onDuplicate={() => duplicate(sel)} onDelete={() => setConfirm({ kind: 'delete', s: sel })} />
            )}
            {tab === 'settings' && (
              <SettingsEditor value={content.settings} lang={lang} open={openGroup} setOpen={setOpenGroup}
                onChange={(settings, key) => update((c) => ({ ...c, settings }), key)}
                onShow={(g) => g === 'chatbot' ? (setFocusPath('s:chatbot'), post({ type: MSG.focus, id: '', path: 's:chatbot' })) : post({ type: MSG.scroll, id: g === 'footer' ? FOOTER_ID : NAV_ID })} />
            )}
            {tab === 'history' && (
              <div className="le-pad">
                <p className="le-hint">كل «حفظ ونشر» محفوظ هنا. اختر نسخة لتفتحها بالمعاينة، وما بتصير على الموقع إلا لما تضغط «حفظ ونشر». وزر <b>تراجع</b> فوق يرجّع آخر تعديلاتك قبل النشر.</p>
                {versions === null ? <p className="empty">جارٍ التحميل…</p> : !versions.length ? <p className="empty">لا يوجد سجل بعد.</p> : (
                  <ul className="vers">
                    {versions.map((v) => (
                      <li key={v.id}>
                        <span className="v__t"><b>قبل «{ACTION[v.action] ?? v.action}»</b><small>{fmt(v.at)}</small></span>
                        <button className="btn btn--ghost" onClick={() => setConfirm({ kind: 'version', v })}>افتحها</button>
                      </li>
                    ))}
                  </ul>
                )}
                <Link className="btn btn--soft btn--block" href="/admin/backup/" style={{ marginTop: 14 }}>تنزيل نسخة احتياطية / استيراد</Link>
              </div>
            )}
          </div>
        </aside>

        <section className={'le-stage' + (device === 'mobile' && !phoneish ? ' is-phone' : '')} ref={stage} aria-label="معاينة الموقع">
          {stageSize.w > 0 && (
            <div className="le-frame" style={realPhone ? { inset: 0 } : device === 'mobile' && !phoneish ? { width: frameW, height: frameH } : { width: frameW * scale, height: stageSize.h }}>
              <iframe ref={frame} key={frameSrc} src={frameSrc} title="معاينة الموقع"
                style={realPhone ? { width: '100%', height: '100%' } : { width: frameW, height: frameH, transform: scale !== 1 ? `scale(${scale})` : undefined }} />
            </div>
          )}
        </section>
      </div>

      <nav className="le-switch" aria-label="التبديل بين المعاينة والتعديل">
        <button aria-pressed={mobileView === 'preview'} onClick={() => setMobileView('preview')}><IcEye /> شوف الموقع</button>
        <button aria-pressed={mobileView === 'panel'} onClick={() => setMobileView('panel')}><IcLayers /> عدّل</button>
      </nav>

      {adding && (
        <div className="modal" onClick={() => setAdding(false)}>
          <div className="modal__box" role="dialog" aria-modal="true" aria-labelledby="add-t" onClick={(e) => e.stopPropagation()}>
            <h2 id="add-t">إضافة قسم جديد</h2>
            <p>{sel ? <>يُضاف بعد «{typeTitle(sel.type)}».</> : 'يُضاف في آخر الصفحة.'} بيظهر بالمعاينة فوراً، وعلى الموقع بعد «حفظ ونشر».</p>
            <div className="types">
              {[...SCHEMA.sections].filter((t) => t.name !== CASE_TYPE).sort((a, b) => Number(FREE.includes(b.name)) - Number(FREE.includes(a.name))).map((t) => (
                <button key={t.name} onClick={() => addSection(t.name)}>
                  <IcPlus /> <span>{t.title}{FREE.includes(t.name) && <small>قسم حر تملؤه كما تريد</small>}</span>
                </button>
              ))}
            </div>
            <div className="modal__acts"><button className="btn btn--ghost" onClick={() => setAdding(false)}>إلغاء</button></div>
          </div>
        </div>
      )}
      {confirm?.kind === 'delete' && (
        <Confirm danger title={`حذف «${typeTitle(confirm.s.type)}»؟`} okLabel="نعم، احذف"
          text="بيختفي من المعاينة الآن، ومن الموقع بعد «حفظ ونشر». تقدر ترجعه بزر «تراجع»."
          onCancel={() => setConfirm(null)} onOk={() => { const s = confirm.s; setConfirm(null); remove(s); }} />
      )}
      {confirm?.kind === 'discard' && (
        <Confirm danger title="تجاهل كل التغييرات غير المنشورة؟" okLabel="نعم، تجاهلها"
          text="المحرر بيرجع للموقع كما هو منشور الآن."
          onCancel={() => setConfirm(null)} onOk={() => { setConfirm(null); update(() => published); setSelected(null); }} />
      )}
      {confirm?.kind === 'conflict' && (
        <Confirm danger title="في تعديل انحفظ من مكان ثاني" okLabel="انشر تعديلاتي على كل حال"
          text="بعد ما فتحت المحرر، انحفظ تعديل على الموقع من جهاز أو نافذة ثانية (مثلاً من صفحة «أعمال العملاء»). إذا نشرت الآن، المحتوى هذا كله بيحل محل ذاك التعديل. الأفضل: انسخ تعديلك، حدّث الصفحة، وعيده."
          onCancel={() => setConfirm(null)} onOk={() => { setConfirm(null); publish(true); }} />
      )}
      {confirm?.kind === 'version' && (
        <Confirm title="فتح هذه النسخة بالمعاينة؟" okLabel="نعم، افتحها"
          text={`المحرر بيعرض الموقع كما كان قبل «${ACTION[confirm.v.action] ?? confirm.v.action}» (${fmt(confirm.v.at)}). الموقع ما بيتغير إلا لما تضغط «حفظ ونشر»، وتقدر تتراجع.`}
          onCancel={() => setConfirm(null)} onOk={() => { const v = confirm.v; setConfirm(null); openVersion(v); }} />
      )}
      {node}
    </div>
  );
}

function SectionList({ rows, cases, selected, sensors, onDragEnd, onSelect, onToggle, onDuplicate, onDelete, onAdd }: {
  rows: SectionRow[]; cases: boolean; selected: string | null; sensors: ReturnType<typeof useSensors>; onDragEnd: (e: DragEndEvent) => void;
  onSelect: (id: string) => void; onToggle: (s: SectionRow) => void; onDuplicate: (s: SectionRow) => void; onDelete: (s: SectionRow) => void;
  onAdd: () => void;
}) {
  const shown = rows.filter((s) => !s.hidden).length;
  return (
    <div className="le-pad">
      {cases
        ? <p className="le-hint">كل قصة = صفحة خاصة على <b>/work/…</b> وبطاقة في «أعمالنا» (والمميّزة في الرئيسية). اسحب <b>⋮⋮</b> للترتيب، 👁 للإظهار، ونسخ لتبدأ قصة جديدة من قصة جاهزة. أي نص بين [أقواس] ما بيظهر للزوار.</p>
        : <p className="le-hint">اضغط على <b>أي عنصر بالمعاينة</b> (عنوان، زر، صورة، رقم…) وبيفتح حقله هنا مباشرة. اسحب <b>⋮⋮</b> لتغيير الترتيب، و👁 للإظهار والإخفاء. Esc يرجعك خطوة.</p>}
      <div className="le-count">{rows.length} {cases ? 'قصص' : 'أقسام'} · {shown} ظاهرة</div>
      <DndContext id="le-sections" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <ol className="le-list">
            {rows.map((s, i) => (
              <ListRow key={s.id} s={s} i={i} active={s.id === selected} onSelect={() => onSelect(s.id)} onToggle={() => onToggle(s)} onDuplicate={() => onDuplicate(s)} onDelete={() => onDelete(s)} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <button className="add le-addbtn" onClick={onAdd}><IcPlus /> {cases ? 'إضافة قصة عميل' : 'إضافة قسم'}</button>
    </div>
  );
}

/** «إعدادات هذه الصفحة»: the page's own title, description and share image for Google / social apps. */
function PageSettings({ page, value, lang, onChange }: {
  page: string; value: Record<string, unknown>; lang: Lang; onChange: (v: Record<string, unknown>, key: string) => void;
}) {
  const pmField = SCHEMA.settings.fields?.find((f) => f.name === 'pageMeta');
  const fields = pmField?.fields?.find((f) => f.name === page)?.fields ?? [];
  const all = (value.pageMeta ?? {}) as Record<string, Record<string, unknown>>;
  const mine = all[page] ?? {};
  if (!fields.length) return null;
  return (
    <div className="le-pad le-pad--top">
      <details className="card le-pagecfg">
        <summary>⚙ إعدادات هذه الصفحة <small>(العنوان والوصف في جوجل وصورة المشاركة)</small></summary>
        <p className="le-hint">فارغ = عنوان الموقع ووصفه العام. العنوان الظاهر في القائمة من «إعدادات الموقع» ← القائمة العلوية.</p>
        <FieldList fields={fields} value={mine} lang={lang}
          onChange={(v) => onChange({ ...value, pageMeta: { ...all, [page]: v } }, `pageMeta:${page}`)} />
      </details>
    </div>
  );
}

function ListRow({ s, i, active, onSelect, onToggle, onDuplicate, onDelete }: { s: SectionRow; i: number; active: boolean; onSelect: () => void; onToggle: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } = useSortable({ id: s.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const isCase = s.type === CASE_TYPE;
  const d = s.data as Record<string, any>;
  // a story's row shows the client's name, then its link; a section's row its kind, then its title
  const t = isCase ? (String(d.client?.ar || d.client?.en || '').trim() || 'قصة بدون اسم') : typeTitle(s.type);
  const label = isCase ? `/work/${String(d.slug ?? '')}/` + (d.featured ? ' · مميّزة' : '') : sectionLabel(s.data as Record<string, unknown>);
  return (
    <li ref={setNodeRef} style={style} className={'le-row' + (s.hidden ? ' is-hidden' : '') + (isDragging ? ' dragging' : '') + (active ? ' active' : '')} data-id={s.id}>
      <button type="button" className="handle" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`اسحب لتغيير ترتيب ${t}`}><IcGrip /></button>
      <button type="button" className="le-row__main" onClick={onSelect}>
        <span className="le-row__t"><span className="le-row__n">{i + 1}</span>{t}{s.hidden && <span className="tag tag--off">مخفي</span>}</span>
        {label && <span className="le-row__l">{label}</span>}
      </button>
      <button className="le-ib" onClick={onToggle} aria-label={s.hidden ? `إظهار ${t}` : `إخفاء ${t}`} title={s.hidden ? 'مخفي — اضغط للإظهار' : 'ظاهر — اضغط للإخفاء'} aria-pressed={!s.hidden}>{s.hidden ? <IcEyeOff /> : <IcEye />}</button>
      <button className="le-ib" onClick={onDuplicate} aria-label={`نسخ ${t}`} title="نسخ"><IcCopy /></button>
      <button className="le-ib danger" onClick={onDelete} aria-label={`حذف ${t}`} title="حذف"><IcTrash /></button>
    </li>
  );
}

/** Where you are, DevTools-style: الأقسام › الواجهة الرئيسية › الأرقام › 2 › الرقم — each step clickable; Esc goes up one. */
function Crumbs({ root, section, trail, onRoot, onSection, onField }: {
  root: string; section: string | null; trail: { title: string; path: string; field?: unknown }[];
  onRoot: () => void; onSection: () => void; onField: (path: string) => void;
}) {
  return (
    <nav className="le-crumbs" aria-label="مكانك">
      <button type="button" onClick={onRoot}>{root}</button>
      {section && (<><span aria-hidden="true">›</span><button type="button" onClick={onSection} aria-current={trail.length ? undefined : 'location'}>{section}</button></>)}
      {trail.map((t, i) => (
        <span key={t.path} className="le-crumbs__s">
          <span aria-hidden="true">›</span>
          <button type="button" onClick={() => onField(t.path)} aria-current={i === trail.length - 1 ? 'location' : undefined}>{t.field ? t.title : '#' + t.title}</button>
        </span>
      ))}
      <span className="le-crumbs__esc" aria-hidden="true">Esc ↑</span>
    </nav>
  );
}

function grouped(fields: Field[], groups: { name: string; title: string }[]) {
  const names = groups.map((g) => g.name);
  const m = new Map<string, Field[]>();
  for (const f of fields) {
    if (f.name === 'hidden') continue;
    const g = f.group && names.includes(f.group) ? f.group : names[0] ?? 'content';
    m.set(g, [...(m.get(g) ?? []), f]);
  }
  return m;
}

/** The note on a section that shows another section's text: where the text lives, and that a change here
 *  changes it there too. */
function sharedNote(src: SectionRow): string {
  const where = PAGE_NAMES[src.page || 'home'] ?? '';
  return `نفس المحتوى بكل الموقع: هذا القسم بيعرض نص «${typeTitle(src.type)}»${where ? ' من ' + where : ''}. أي تعديل هون بيتعدل هناك كمان. التصميم ومكان القسم خاصّين فيه.`;
}
const PAGE_NAMES: Record<string, string> = { home: 'الرئيسية', services: 'صفحة الخدمات', work: 'صفحة أعمالنا', about: 'صفحة من نحن', contact: 'صفحة التواصل' };

function SectionEditor({ s, lang, shared, testimonials, focus, onBack, onChange, onToggle, onDuplicate, onDelete }: {
  s: SectionRow; lang: Lang; shared?: string; focus?: string | null; testimonials?: React.ReactNode; onBack: () => void; onChange: (data: Record<string, unknown>, key: string) => void;
  onToggle: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const t = SECTION_TYPES[s.type];
  const groups = useMemo(() => {
    const g = t?.groups?.length ? t.groups : [{ name: 'content', title: 'المحتوى' }];
    // the stories section: the clients first (that's what is edited there), the titles after
    return s.type === 'clientStoriesSection' ? [...g].sort((a, b) => Number(b.name === 'media') - Number(a.name === 'media')) : g;
  }, [t, s.type]);
  const byGroup = useMemo(() => grouped(t?.fields ?? [], groups), [t, groups]);
  // one undo step per field while typing
  const onField = (data: Record<string, unknown>) => {
    const changed = Object.keys(data).find((k) => !same(data[k], (s.data as Record<string, unknown>)[k])) ?? '';
    onChange(data, `${s.id}:${changed}`);
  };
  return (
    <div className="le-pad le-ed">
      <button className="le-back" onClick={onBack}><IcBack /> كل الأقسام</button>
      <div className="le-edh">
        <h2>{t?.title ?? s.type}</h2>
        <div className="le-edh__acts">
          <label className="sw" title={s.hidden ? 'مخفي عن الزوار' : 'ظاهر للزوار'}>
            <input type="checkbox" checked={!s.hidden} onChange={onToggle} aria-label="إظهار هذا القسم على الموقع" />
            <span className="sw__t" /><span className="sw__l">{s.hidden ? 'مخفي' : 'ظاهر'}</span>
          </label>
          <button className="le-ib" onClick={onDuplicate} aria-label="نسخ القسم" title="نسخ"><IcCopy /></button>
          <button className="le-ib danger" onClick={onDelete} aria-label="حذف القسم" title="حذف"><IcTrash /></button>
        </div>
      </div>
      {shared && <p className="le-hint le-hint--box">🔗 {shared}</p>}
      {testimonials}
      {groups.map((g) => {
        // the testimonials' count, order and Home switches are edited in the videos card above (TestimonialsManager)
        const list = s.type === 'proofSection' ? byGroup.get(g.name)?.filter((f) => !['limit', 'order', 'onHome'].includes(f.name)) : byGroup.get(g.name);
        if (!list?.length) return null;
        if (s.type === 'clientStoriesSection' && g.name === 'media') {
          const d = s.data as Record<string, unknown>;
          return (
            <section className="card" key={g.name}>
              <FieldList fields={list.filter((f) => f.name === 'mirror')} value={s.data} lang={lang} onChange={onField} />
              {d.mirror ? <p className="le-hint">هذا القسم بيعرض نفس عملاء أول قسم ستوري (بالرئيسية).</p>
                : <StoriesManager value={d.clients as StoryClient[]} focus={focus} onChange={(clients) => onChange({ ...d, clients }, `${s.id}:clients`)} />}
              <p className="le-hint" style={{ marginTop: 12 }}>أسهل على الجوال: <Link href="/admin/stories/">افتح صفحة «العملاء» لحالها</Link>.</p>
            </section>
          );
        }
        const body = <FieldList fields={list} value={s.data} lang={lang} onChange={onField} />;
        return g.name === 'settings' || g.name === 'design'
          ? <details className="card" key={g.name}><summary>{g.name === 'design' ? '🎨 تصميم القسم (خلفية، مسافات، محاذاة)' : 'إعدادات متقدمة'}</summary>{body}</details>
          : <section className="card" key={g.name}><h2>{g.title}</h2>{body}</section>;
      })}
    </div>
  );
}

function SettingsEditor({ value, lang, open, setOpen, onChange, onShow }: {
  value: Record<string, unknown>; lang: Lang; open: string; setOpen: (g: string) => void;
  onChange: (v: Record<string, unknown>, key: string) => void; onShow: (g: string) => void;
}) {
  const t = SCHEMA.settings;
  const byGroup = useMemo(() => grouped(t.fields ?? [], t.groups ?? []), [t]);
  const groups = t.groups ?? [];
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector(`[data-g="${open}"]`)?.scrollIntoView({ block: 'nearest' }); }, [open]);
  const onField = (data: Record<string, unknown>) => {
    const changed = Object.keys(data).find((k) => !same(data[k], value[k])) ?? '';
    onChange(data, `settings:${changed}`);
  };
  return (
    <div className="le-pad" ref={ref}>
      <p className="le-hint">الشعار والألوان والخطوط والحركة والتواصل والشات بوت والقائمة وأسفل الصفحة ومحركات البحث. كل تغيير بيبين بالمعاينة فوراً.</p>
      {groups.map((g) => {
        const list = byGroup.get(g.name);
        if (!list?.length) return null;
        return (
          <details className="card le-acc" key={g.name} data-g={g.name} open={open === g.name}
            onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) { setOpen(g.name); if (g.name === 'header' || g.name === 'footer' || g.name === 'chatbot') onShow(g.name); } }}>
            <summary>{g.title}</summary>
            <FieldList fields={list} value={value} lang={lang} onChange={onField} />
          </details>
        );
      })}
    </div>
  );
}
