'use client';
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import type { BotView } from '@/lib/chatbot';
import type { PanelProps } from './ChatPanel';

/* The floating chat button. Tiny on purpose: the conversation panel (and the matcher) is a separate
   chunk, fetched when the visitor shows intent (hover / focus / touch) or clicks — so the page itself
   stays as fast as before. Fixed position → no layout shift. In the admin preview it's controlled by
   the editor (`preview`) and every part of it is tagged for inspect-style editing. */

export type PreviewState = { open: boolean; focus: string | null };

let panelPromise: Promise<{ default: ComponentType<PanelProps> }> | null = null;
const loadPanel = () => (panelPromise ??= import('./ChatPanel'));

export default function ChatLauncher({ bot, preview }: { bot: BotView; preview?: PreviewState }) {
  const [open, setOpen] = useState(false);
  const [Panel, setPanel] = useState<ComponentType<PanelProps> | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const ar = bot.lang === 'ar';
  const shown = preview ? preview.open : open;

  const warm = useCallback(() => { loadPanel().then((m) => setPanel(() => m.default)).catch(() => {}); }, []);
  useEffect(() => { if (preview?.open) warm(); }, [preview?.open, warm]);

  const close = useCallback(() => { setOpen(false); requestAnimationFrame(() => btn.current?.focus()); }, []);
  if (!bot.enabled && !preview) return null;

  return (
    <div className={`cbw cbw--${bot.side}${bot.enabled ? '' : ' cbw--off'}`} data-cu-chat="" dir={ar ? 'rtl' : 'ltr'} lang={bot.lang}>
      {shown && Panel && <Panel bot={bot} onClose={preview ? () => {} : close} preview={preview} />}
      <button
        ref={btn}
        type="button"
        className="cbw__btn"
        aria-haspopup="dialog"
        aria-expanded={shown}
        aria-controls="cbw-panel"
        aria-label={shown ? (ar ? 'إغلاق المحادثة' : 'Close chat') : (ar ? `افتح المحادثة مع ${bot.name}` : `Open chat with ${bot.name}`)}
        data-f="chatbot"
        onPointerEnter={warm}
        onFocus={warm}
        onTouchStart={warm}
        onClick={() => { if (preview) return; if (open) { close(); return; } warm(); setOpen(true); }}
      >
        {shown ? (
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" fill="currentColor" /><circle cx="8.6" cy="9.6" r="1.25" fill="var(--purple, #5B2096)" /><circle cx="12" cy="9.6" r="1.25" fill="var(--purple, #5B2096)" /><circle cx="15.4" cy="9.6" r="1.25" fill="var(--purple, #5B2096)" /></svg>
        )}
      </button>
    </div>
  );
}
