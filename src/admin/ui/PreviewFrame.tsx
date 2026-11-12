'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ContentSnapshot } from '@/db/schema';
import { buildView, snapshotToRaw } from '@/lib/view';
import { googleFontHref, themeCss } from '@/lib/theme';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import PageBody from '@/components/PageBody';
import Reveal from '@/components/Reveal';
import ChatLauncher from '@/components/chat/ChatLauncher';
import { CHAT_ID, FOOTER_ID, MSG, NAV_ID, type DraftMsg, type FocusMsg, type ScrollMsg } from './preview-protocol';
import { SCHEMA, SECTION_TYPES } from '@/admin/content';
import { assetKey, candidates, normText, pathLabel, type Candidate } from '@/admin/inspect';
import { readerData, sourceRow } from '@/admin/shared';
import { CASES, hrefPage, isPageId, type PageId } from '@/lib/pages';

/* Runs inside the editor's iframe. Renders the real site components from the draft the editor posts
   (every keystroke, colour, image, reorder), outlines what the mouse is over, and tells the editor what
   was clicked. Links and buttons don't navigate here.
   It renders EXACTLY what visitors see (Mohamed, Nov 8, 2026: «الموقع الي بظهر في لوحة الادمن … غير الموقع الي
   بظهر على رابط فيرسل»): no [placeholder] texts, no sample clients, no Concept chip. Only the section selected
   in the panel shows even when visitors don't see it (dimmed), so it can be edited. */

const CSS_PREVIEW = `
.cu-box{position:absolute;pointer-events:none;z-index:2147483000;border-radius:4px;transition:top .12s,left .12s,width .12s,height .12s}
.cu-box--hover{border:2px dashed #8750A5;background:rgba(135,80,165,.05)}
.cu-box--sel{border:3px solid #5B2096;box-shadow:0 0 0 4px rgba(91,32,150,.18)}
.cu-tag{position:absolute;top:-2px;inset-inline-start:-2px;transform:translateY(-100%);background:#5B2096;color:#fff;font:700 13px/1.2 'Thmanyah Sans',system-ui,sans-serif;padding:5px 10px;border-radius:8px 8px 0 0;white-space:nowrap;direction:rtl}
.cu-box--hover .cu-tag{background:#8750A5}
.cu-box--fld{border:2px solid #8750A5;background:rgba(135,80,165,.08);border-radius:3px}
.cu-box--fld .cu-tag{background:#2b0d4a;font-size:12px;padding:4px 8px;border-radius:6px 6px 0 0}
.cu-box--focus{border:2px solid #f5b700;box-shadow:0 0 0 3px rgba(245,183,0,.25);border-radius:3px}
.cu-box--focus .cu-tag{background:#f5b700;color:#1a1033}
[data-cu-f]{cursor:pointer}
.tvcard__body,.tvcard__body *{pointer-events:auto}
.cu-box[data-top] .cu-tag{transform:none;top:0;border-radius:0 0 8px 8px}
[data-cu-hid]{opacity:.38;filter:grayscale(.6)}
[data-cu-key],.cu-preview header,.cu-preview footer{cursor:pointer}
`;

type Box = { top: number; left: number; width: number; height: number } | null;

function rectOf(el: Element | null): Box {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height };
}
function elFor(id: string | null): Element | null {
  if (!id) return null;
  if (id === NAV_ID) return document.querySelector('body > header, header.nav');
  if (id === FOOTER_ID) return document.querySelector('footer');
  if (id === CHAT_ID) return document.querySelector('[data-cu-chat]');
  return document.querySelector(`[data-cu-key="${CSS.escape(id)}"]`);
}

/** The text a visitor reads in an element: its text without decorations marked aria-hidden (a «×» or «✓» icon
 *  before a list line, a number badge) — so the line still matches its field. */
function readText(el: Element): string {
  if (!el.querySelector('[aria-hidden="true"]')) return el.textContent ?? '';
  const c = el.cloneNode(true) as Element;
  c.querySelectorAll('[aria-hidden="true"]').forEach((x) => x.remove());
  return c.textContent ?? '';
}

/** Tags every element inside `root` that shows one of the candidates (a text or an image of a field)
 *  with data-cu-f="<path>". Innermost element wins; elements a component marked with data-f keep that path
 *  (and data-fid, when the field belongs to another section — a testimonial card shows its client's record). */
function tagFields(root: Element, cands: Candidate[], prefix = '', fid?: string, skipMarked = false) {
  const byText = new Map<string, string>();
  for (const c of cands) if (c.text && !byText.has(c.text)) byText.set(c.text, c.path);
  const byUrl = cands.filter((c) => c.url).map((c) => ({ ...c, key: assetKey(c.url!) }));
  const els = Array.from(root.querySelectorAll<HTMLElement>('*')).reverse(); // children before parents
  for (const el of els) {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    if (/^(SCRIPT|STYLE|SOURCE|BR)$/.test(el.tagName)) continue;
    if (el.dataset.f) {
      if (skipMarked) continue; // a part the section itself marked keeps its own field
      el.dataset.cuF = (el.dataset.f.startsWith('s:') ? '' : prefix) + el.dataset.f;
      if (el.dataset.fid) el.dataset.cuFid = el.dataset.fid;
      continue;
    }
    let path: string | undefined;
    if (el.tagName === 'IMG' || el.tagName === 'VIDEO') {
      const srcs = [el.getAttribute('src'), el.getAttribute('poster'), el.getAttribute('srcset'), (el as HTMLImageElement).currentSrc].filter(Boolean).map((s) => { try { return decodeURIComponent(s!); } catch { return s!; } }).join(' ');
      path = (byUrl.find((c) => srcs.includes(c.url!)) ?? byUrl.find((c) => c.key !== c.url && srcs.includes(c.key)))?.path;
    } else {
      const bg = el.style?.backgroundImage;
      if (bg) path = (byUrl.find((c) => bg.includes(c.url!)) ?? byUrl.find((c) => c.key !== c.url && bg.includes(c.key)))?.path;
      if (!path && el.childElementCount < 40) {
        const t = normText(el.textContent ?? '');
        if (t && t.length < 1200) path = byText.get(t);
        if (!path && t) { const v = normText(readText(el)); if (v && v !== t) path = byText.get(v); }
      }
    }
    if (!path) continue;
    const full = prefix + path;
    if (el.querySelector(`[data-cu-f="${CSS.escape(full)}"]`)) continue; // a child already shows exactly this field
    el.dataset.cuF = full;
    if (fid) el.dataset.cuFid = fid;
  }
}

/** Where a client's record lives: its entry in the «العملاء» list (the stories section's clients) or its case row. */
function recordSource(rows: ContentSnapshot['sections'], storyKey?: string, caseKey?: string): { id: string; prefix: string; data: unknown } | null {
  if (storyKey) {
    for (const r of rows) {
      const d = r.data as { mirror?: boolean; clients?: { _key?: string }[] };
      if (r.type !== 'clientStoriesSection' || d?.mirror || !Array.isArray(d?.clients)) continue;
      const i = d.clients.findIndex((c) => c?._key === storyKey);
      if (i >= 0) return { id: r.id, prefix: `clients.${i}.`, data: d.clients[i] };
    }
  }
  const row = caseKey ? rows.find((r) => r.id === caseKey) : null;
  return row ? { id: row.id, prefix: '', data: row.data } : null;
}

function fieldsFor(content: ContentSnapshot, id: string | null, path: string) {
  if (path.startsWith('s:')) return SCHEMA.settings.fields ?? [];
  const s = content.sections.find((x) => x.id === id);
  return (s && SECTION_TYPES[s.type]?.fields) || [];
}

export default function PreviewFrame({ lang, initial }: { lang: 'ar' | 'en'; initial: ContentSnapshot }) {
  const [content, setContent] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [hover, setHover] = useState<string | null>(null);
  // inspect: the field under the mouse, and the field being edited in the panel (both: section id + path)
  const [hoverF, setHoverF] = useState<{ id: string; path: string; el: HTMLElement } | null>(null);
  const [focusF, setFocusF] = useState<{ id: string; path: string } | null>(null);
  const contentRef = useRef(content);
  useEffect(() => { contentRef.current = content; }, [content]);
  const [, setTick] = useState(0);
  const framed = useRef(false);
  // re-tags the page (also when a part re-renders on its own: the six stages, a slider, a card that opens)
  const tagRef = useRef<() => void>(() => {});

  // which page the editor is on (and, on «قصص العملاء», which case study)
  const [page, setPage] = useState<PageId>('home');
  const [caseId, setCaseId] = useState<string | null>(null);
  const caseSlug = useMemo(() => {
    if (!caseId) return null;
    const s = content.sections.find((x) => x.id === caseId);
    return s ? String((s.data as Record<string, unknown>).slug ?? '') || null : null;
  }, [content, caseId]);
  const view = useMemo(() => buildView(snapshotToRaw(content), lang, page, { showHidden: selected, caseSlug, editor: true }), [content, lang, page, selected, caseSlug]);
  const css = themeCss(view);
  const gf = googleFontHref(view);

  useEffect(() => {
    framed.current = window.parent !== window;
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const m = e.data as DraftMsg | ScrollMsg;
      if (m?.type === MSG.draft && m.content && Array.isArray(m.content.sections)) {
        setContent(m.content);
        setSelected(m.selected ?? null);
        setLabels(m.labels ?? {});
        const pg = (m as DraftMsg).page;
        setPage(isPageId(pg) ? pg : 'home');
        setCaseId(pg === CASES ? (m as DraftMsg).caseId ?? null : null);
      } else if ((m as unknown as FocusMsg)?.type === MSG.focus) {
        const f = m as unknown as FocusMsg;
        setFocusF(f.path ? { id: f.id, path: f.path } : null);
        if (f.path) setTimeout(() => {
          const el = document.querySelector<HTMLElement>(`[data-cu-f="${CSS.escape(f.path)}"]`);
          const r = el?.getBoundingClientRect();
          if (el && r && (r.top < 60 || r.bottom > window.innerHeight)) window.scrollTo({ top: Math.max(0, r.top + window.scrollY - window.innerHeight / 3), behavior: 'smooth' });
        }, 60); // a beat later: some parts mount only once focused (the contact form)
      } else if (m?.type === MSG.scroll && typeof m.id === 'string') {
        // wait a frame so a just-shown (hidden) section is in the page
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const el = elFor(m.id);
          if (el) window.scrollTo({ top: Math.max(0, (rectOf(el)?.top ?? 0) - (m.id === NAV_ID ? 0 : 70)), behavior: 'smooth' });
        }));
      }
    };
    window.addEventListener('message', onMsg);

    const idAt = (t: EventTarget | null): string | null => {
      const el = t as HTMLElement | null;
      if (!el?.closest) return null;
      const block = el.closest<HTMLElement>('[data-cu-key]');
      if (block) return block.dataset.cuKey ?? null;
      if (el.closest('[data-cu-chat]')) return CHAT_ID;
      if (el.closest('header')) return NAV_ID;
      if (el.closest('footer')) return FOOTER_ID;
      return null;
    };
    // the field under the pointer; an image under a play button / overlay still counts (elementsFromPoint)
    const fieldAt = (t: EventTarget | null, e?: MouseEvent) => {
      // the chat widget renders its panel later (lazy), so its parts are tagged when touched
      const cf = (t as HTMLElement | null)?.closest?.<HTMLElement>('[data-cu-chat] [data-f]');
      if (cf) { cf.dataset.cuF = 's:' + cf.dataset.f; return cf; }
      const hit = (t as HTMLElement | null)?.closest?.<HTMLElement>('[data-cu-f]') ?? null;
      if (hit || !e) return hit;
      return (document.elementsFromPoint(e.clientX, e.clientY).find((x) => (x as HTMLElement).dataset?.cuF) as HTMLElement | undefined) ?? null;
    };
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      // nothing navigates inside the editor (links, the WhatsApp button, forms) — a link to another page of the
      // site (menu, cards, breadcrumbs) switches the editor to that page instead
      const a = el.closest?.('a') as HTMLAnchorElement | null;
      if (el.closest?.('a, button, [type=submit]')) e.preventDefault();
      if (a && framed.current && !el.closest?.('[data-cu-f]') ) {
        const href = a.getAttribute('href') || '';
        const m = href.match(/^\/(?:ar|en)\/work\/([a-z0-9-]+)\/$/);
        const pg = m ? 'work' : hrefPage(href);
        if (pg) { window.parent.postMessage({ type: MSG.page, page: pg, slug: m?.[1] ?? null }, window.location.origin); return; }
      }
      const f = fieldAt(e.target, e);
      const path = f?.dataset.cuF;
      // the field's own section: a part marked with another section's field (data-fid) belongs to that one; a
      // site setting shown outside the header/footer (the breadcrumbs) opens the settings
      const id = f?.dataset.cuFid ?? idAt(e.target) ?? (path?.startsWith('s:') ? NAV_ID : null);
      // an inspect click selects; it doesn't also play the clip or open a link (FAQ <details> still open/close)
      if (path && !el.closest?.('summary')) e.stopPropagation();
      if (path) setFocusF({ id: id ?? '', path });
      if (id && framed.current) window.parent.postMessage({ type: MSG.select, id, path }, window.location.origin);
    };
    const onOver = (e: MouseEvent) => {
      const id = idAt(e.target);
      setHover(id);
      const f = fieldAt(e.target, e);
      const fid = f?.dataset.cuFid ?? id ?? (f?.dataset.cuF?.startsWith('s:') ? NAV_ID : null);
      setHoverF(f && fid ? { id: fid, path: f.dataset.cuF!, el: f } : null);
    };
    const onLeave = () => { setHover(null); setHoverF(null); };
    const onSubmit = (e: Event) => e.preventDefault();
    const redraw = () => setTick((x) => x + 1);
    document.addEventListener('click', onClick, true);
    document.addEventListener('mouseover', onOver);
    document.documentElement.addEventListener('mouseleave', onLeave);
    document.addEventListener('submit', onSubmit, true);
    window.addEventListener('resize', redraw);
    window.addEventListener('scroll', redraw, { passive: true });
    const ro = new ResizeObserver(redraw);
    ro.observe(document.body);
    // a part that re-renders by itself (the active stage of the system, the story ring, an opened card) loses its
    // tags: tag again on the next frame after any change of elements or text in the page
    let rt = 0;
    const ours = (n: Node) => !!(n instanceof Element ? n : n.parentElement)?.closest('.cu-box, [data-cu-chat]');
    const retag = new MutationObserver((recs) => {
      const box = (n: Node) => n instanceof Element && n.classList.contains('cu-box');
      if (recs.every((r) => ours(r.target) || (r.type === 'childList' && [...r.addedNodes, ...r.removedNodes].every(box)))) return; // the outlines
      if (!rt) rt = requestAnimationFrame(() => { rt = 0; tagRef.current(); redraw(); });
    });
    retag.observe(document.body, { childList: true, subtree: true, characterData: true });
    // the chat panel mounts / changes on its own: tag its parts and redraw the outlines when it does
    const chat = document.querySelector('[data-cu-chat]');
    const mo = new MutationObserver(() => { if (chat) tagFields(chat, [], 's:'); redraw(); });
    if (chat) mo.observe(chat, { childList: true, subtree: true, characterData: true });
    if (framed.current) window.parent.postMessage({ type: MSG.ready }, window.location.origin);
    return () => {
      window.removeEventListener('message', onMsg);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('mouseover', onOver);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('submit', onSubmit, true);
      window.removeEventListener('resize', redraw);
      window.removeEventListener('scroll', redraw);
      ro.disconnect();
      retag.disconnect();
      if (rt) cancelAnimationFrame(rt);
      mo.disconnect();
    };
  }, []);

  // tag each section's element (the one right after its marker) so it can be found, outlined and clicked
  useLayoutEffect(() => {
    document.querySelectorAll<HTMLElement>('[data-cu-key]').forEach((el) => { delete el.dataset.cuKey; delete el.dataset.cuHid; });
    document.querySelectorAll<HTMLElement>('[data-cu-mark]').forEach((m) => {
      const el = m.nextElementSibling as HTMLElement | null;
      if (!el) return;
      el.dataset.cuKey = m.dataset.cuMark;
      if (m.dataset.hid) el.dataset.cuHid = '1';
    });
    // inspect: tag every element that shows a field, per section, plus the header and footer (site settings)
    tagRef.current = () => {
      document.querySelectorAll<HTMLElement>('[data-cu-f]').forEach((el) => { delete el.dataset.cuF; delete el.dataset.cuFid; });
      document.querySelectorAll<HTMLElement>('[data-cu-key]').forEach((el) => {
        const s = content.sections.find((x) => x.id === el.dataset.cuKey);
        if (!s) return;
        // a section showing another one's text (Home's services, growth path, tools…) is matched on that text
        const src = sourceRow(s, content.sections);
        tagFields(el, candidates(src ? readerData(s, src) : s.data, lang));
      });
      // a card that shows a client's record (a testimonial): its parts belong to that client — the client in the
      // «العملاء» list (stories section → clients.N) or the older case row
      document.querySelectorAll<HTMLElement>('[data-rec-story], [data-rec-case]').forEach((el) => {
        const rec = recordSource(content.sections, el.dataset.recStory, el.dataset.recCase);
        if (!rec) return;
        tagFields(el, candidates(rec.data, lang, rec.prefix), '', rec.id, true);
        el.querySelectorAll<HTMLElement>('[data-rf]').forEach((x) => { x.dataset.cuF = rec.prefix + x.dataset.rf; x.dataset.cuFid = rec.id; });
      });
      const sc = candidates(content.settings, lang);
      const hd = elFor(NAV_ID);
      const ft = elFor(FOOTER_ID);
      if (hd) tagFields(hd, sc, 's:');
      if (ft) tagFields(ft, sc, 's:');
      // parts outside any section that a component marked itself (the breadcrumbs → the menu's labels)
      document.querySelectorAll<HTMLElement>('main [data-f]').forEach((el) => {
        if (el.dataset.cuF || el.closest('[data-cu-key]')) return;
        el.dataset.cuF = el.dataset.f;
        if (el.dataset.fid) el.dataset.cuFid = el.dataset.fid;
      });
      const cb = elFor(CHAT_ID);
      if (cb) tagFields(cb, [], 's:'); // the chat widget marks its own parts (data-f="chatbot.…")
    };
    tagRef.current();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-measure the outlines once the DOM is tagged
    setTick((x) => x + 1);
  }, [view, content, lang]);

  const selBox = rectOf(elFor(selected));
  const hovFBox = hoverF && hoverF.el.isConnected ? rectOf(hoverF.el) : null;
  const hovBox = !hovFBox && hover && hover !== selected ? rectOf(elFor(hover)) : null;
  const focusEl = focusF ? document.querySelector<HTMLElement>(`[data-cu-f="${CSS.escape(focusF.path)}"]`) : null;
  const focusBox = focusEl ? rectOf(focusEl) : null;
  const fLabel = (id: string, path: string) => pathLabel(fieldsFor(content, id, path), path.replace(/^s:/, '')) || path;
  const hidden = (id: string | null) => !!id && content.sections.find((s) => s.id === id)?.hidden;
  const tag = (id: string) => (labels[id] ?? (id === CHAT_ID ? 'الشات بوت' : '')) + (hidden(id) ? ' · مخفي عن الزوار' : '');

  return (
    <>
      {gf && <link rel="stylesheet" href={gf} />}
      {css && <style>{css}</style>}
      <style>{CSS_PREVIEW}</style>
      <Nav d={view.base} />
      {/* a change to the motion settings replays the hero entrance with the new speed / tilt */}
      <main id="top" key={JSON.stringify(view.motion) + page + (caseSlug ?? '')} className={'pg pg--' + (caseSlug ? 'case' : page)}>
        <PageBody view={view} mark focus={focusF} />
      </main>
      <Reveal key={'rv' + page + (caseSlug ?? '')} />
      <Footer d={view.base} />
      {/* the chat button; it opens (and shows the Q&A being edited) while the panel edits «الشات بوت» */}
      <ChatLauncher bot={view.chatbot} preview={{ open: !!focusF?.path.startsWith('s:chatbot'), focus: focusF?.path ?? null }} />
      {hovBox && hover && (
        <div className="cu-box cu-box--hover" style={hovBox} data-top={hovBox.top < 30 ? '' : undefined}><span className="cu-tag">{tag(hover)}</span></div>
      )}
      {hovFBox && hoverF && !(focusF && focusF.path === hoverF.path) && (
        <div className="cu-box cu-box--fld" style={hovFBox} data-top={hovFBox.top < 30 ? '' : undefined}><span className="cu-tag">{fLabel(hoverF.id, hoverF.path)}</span></div>
      )}
      {focusBox && focusF && (
        <div className="cu-box cu-box--focus" style={focusBox} data-top={focusBox.top < 30 ? '' : undefined}><span className="cu-tag">✎ {fLabel(focusF.id, focusF.path)}</span></div>
      )}
      {selBox && selected && (
        <div className="cu-box cu-box--sel" style={selBox} data-top={selBox.top < 30 ? '' : undefined}><span className="cu-tag">✎ {tag(selected)}</span></div>
      )}
    </>
  );
}
