'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastMsg = { text: string; kind?: 'ok' | 'bad' | 'info' } | null;

/** One small message at the bottom ("تم الحفظ والنشر ✓"), gone after a few seconds. */
export function useToast() {
  const [msg, setMsg] = useState<ToastMsg>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((text: string, kind: 'ok' | 'bad' | 'info' = 'ok') => {
    setMsg({ text, kind });
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(null), kind === 'bad' ? 6000 : 3200);
  }, []);
  useEffect(() => () => { if (t.current) clearTimeout(t.current); }, []);
  const node = msg ? (
    <div className="toast" role="status" aria-live="polite"><div className={msg.kind}>{msg.text}</div></div>
  ) : <div className="sr" role="status" aria-live="polite" />;
  return { show, node };
}

export function Confirm({ title, text, okLabel, danger, onOk, onCancel }: { title: string; text?: string; okLabel: string; danger?: boolean; onOk: () => void; onCancel: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onCancel]);
  return (
    <div className="modal" onClick={onCancel}>
      <div className="modal__box" role="alertdialog" aria-modal="true" aria-labelledby="cf-t" onClick={(e) => e.stopPropagation()}>
        <h2 id="cf-t">{title}</h2>
        {text && <p>{text}</p>}
        <div className="modal__acts">
          <button className={'btn ' + (danger ? 'btn--danger' : '')} onClick={onOk} autoFocus>{okLabel}</button>
          <button className="btn btn--ghost" onClick={onCancel}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}
