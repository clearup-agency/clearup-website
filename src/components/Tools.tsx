'use client';
import { useRef, useState } from 'react';
import { cdnImage } from '@/lib/cdn';
import SectionHead from './SectionHead';

/* Nov 11, 2026 (Mohamed: the client found it unclear — make it stand out): a dark band, each tool a numbered card
   whose drawing sits large on its own white panel with a visible «enlarge» mark; a hover (or focus) lifts the
   panel and brings the line on what the tool is forward; cards come in one after another as you reach them.
   Still the same content and the same dialog; motion is off for prefers-reduced-motion.
   «أدوات نستخدمها» (Munim, Nov 8, 2026): the canvases ClearUp works with. Each card = the tool's clean line
   drawing (in the site's purple), its name in Arabic and English, and one line on what it is (their own glossary
   wording where it has one). Tapping a card opens the drawing large (a native <dialog>, no library). The drawings
   are small SVG files that load lazily; an image uploaded in the admin replaces a drawing. */
type Img = { src: string; alt?: string; width?: number; height?: number };
type Tool = { _key?: string; name?: string; en?: string; desc?: string; image?: Img | null };
type Data = { index?: string; eyebrow?: string; title?: string; lead?: string; items?: Tool[]; anchor?: string };

const src = (im: Img | null | undefined, w: number) => (im?.src ? (/\.svg(\?|$)/i.test(im.src) ? im.src : cdnImage(im.src, w)) : '');

export default function Tools({ s, lang }: { s: Data; lang: 'ar' | 'en' }) {
  const items = (s.items ?? []).filter((t) => t && (t.name || t.en) && t.image?.src);
  const dlg = useRef<HTMLDialogElement>(null);
  const [cur, setCur] = useState<Tool | null>(null);
  if (!items.length) return null;
  const close = lang === 'ar' ? 'إغلاق' : 'Close';
  return (
    <section className="tools tools--x section" id="tools">
      <div className="wrap">
        <SectionHead index={s.index} eyebrow={s.eyebrow} title={s.title} lead={s.lead} />
        <ul className="tools__grid">
          {items.map((t, i) => (
            <li key={t._key ?? i} data-reveal>
              <button type="button" className="tool" onClick={() => { setCur(t); dlg.current?.showModal(); }}
                aria-label={(lang === 'ar' ? 'كبّر: ' : 'Enlarge: ') + (t.name || t.en)}>
                <span className="tool__pic">
                  <span className="tool__i" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span className="tool__zoom" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6" /></svg>
                  </span>
                  <img src={src(t.image, 640)} alt={t.image?.alt || ''} width={400} height={260} loading="lazy" decoding="async" />
                </span>
                <span className="tool__txt">
                  <b className="tool__name">{t.name || t.en}</b>
                  {t.en && t.name && t.en !== t.name && <bdi className="tool__en" dir="ltr">{t.en}</bdi>}
                  {t.desc && <span className="tool__desc">{t.desc}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <dialog ref={dlg} className="tool__dlg" onClose={() => setCur(null)} onClick={(e) => { if (e.target === e.currentTarget) dlg.current?.close(); }}
        aria-label={cur ? String(cur.name || cur.en) : undefined}>
        {cur && (
          <figure>
            <img src={src(cur.image, 1400)} alt={cur.image?.alt || ''} width={1200} height={780} decoding="async" />
            <figcaption><b>{cur.name || cur.en}</b>{cur.en && cur.name && cur.en !== cur.name && <bdi dir="ltr"> · {cur.en}</bdi>}{cur.desc && <span>{cur.desc}</span>}</figcaption>
          </figure>
        )}
        <form method="dialog"><button className="tool__x" aria-label={close}>×</button></form>
      </dialog>
    </section>
  );
}
