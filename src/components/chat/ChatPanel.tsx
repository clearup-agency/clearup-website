'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { answer, buildIndex, resolveHref, type BotQA, type BotView } from '@/lib/chatbot';
import type { PreviewState } from './ChatLauncher';
import Mark from '../Mark';

/* The conversation: greeting, suggested questions, free text. Answers come from the knowledge base
   (matched here in the browser — no server, no cost). With the AI mode on (a free key on the server),
   a question the knowledge base can't answer goes to /api/chat, which answers only from the site. */

export type PanelProps = { bot: BotView; onClose: () => void; preview?: PreviewState };
type Msg = { id: number; from: 'bot' | 'me'; text: string; link?: { label: string; href: string }; fallback?: boolean; suggest?: BotQA[]; f?: string; lf?: string; ai?: boolean };

const T = {
  ar: { sub: 'يرد فوراً', ph: 'اكتب سؤالك…', send: 'إرسال', close: 'إغلاق المحادثة', wa: 'تحدث معنا على واتساب', contact: 'احجز مكالمة', more: 'أسئلة أخرى', mean: 'ربما تقصد:', typing: 'يكتب…', log: 'المحادثة', ai: 'إجابة آلية من محتوى الموقع' },
  en: { sub: 'Replies instantly', ph: 'Type your question…', send: 'Send', close: 'Close chat', wa: 'Chat on WhatsApp', contact: 'Book a call', more: 'More questions', mean: 'Did you mean:', typing: 'Typing…', log: 'Conversation', ai: 'Automatic answer from the site’s content' },
};

let seq = 1;
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function ChatPanel({ bot, onClose, preview }: PanelProps) {
  const t = T[bot.lang];
  const index = useMemo(() => buildIndex(bot.faq), [bot.faq]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [asked, setAsked] = useState<string[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const history = useRef<{ role: 'user' | 'bot'; text: string }[]>([]);

  // focus moves into the dialog (not in the admin preview); Esc closes; Tab stays inside
  useEffect(() => {
    if (preview) return;
    const fine = window.matchMedia?.('(pointer: fine)').matches;
    (fine ? input.current : closeBtn.current)?.focus();
    document.documentElement.classList.add('cbw-open');
    return () => document.documentElement.classList.remove('cbw-open');
  }, [preview]);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab' || !box.current) return;
    const els = Array.from(box.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])')).filter((x) => x.offsetParent !== null);
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced() ? 'auto' : 'smooth' });
  }, [msgs, typing]);

  const push = (m: Omit<Msg, 'id'>) => setMsgs((p) => [...p, { ...m, id: seq++ }]);
  const reply = (m: Omit<Msg, 'id'>) => {
    history.current.push({ role: 'bot', text: m.text });
    setTyping(true);
    setTimeout(() => { setTyping(false); push(m); }, reduced() ? 0 : 420);
  };
  const fallback = (suggest: BotQA[] = []) => reply({ from: 'bot', text: bot.fallback, fallback: true, suggest: suggest.length ? suggest : undefined });

  async function ask(q: string) {
    const query = q.trim().slice(0, 300);
    if (!query || typing) return;
    push({ from: 'me', text: query });
    setAsked((a) => [...a, query]);
    history.current.push({ role: 'user', text: query });
    const a = answer(index, query, bot.lang);
    if (a.kind === 'qa') return reply({ from: 'bot', text: a.qa.a, link: a.qa.link });
    if (a.kind === 'smalltalk') return reply({ from: 'bot', text: a.text });
    if (!bot.ai || preview) return fallback(a.suggestions);
    // AI mode: grounded on the site only; any problem (no key, quota, network) → the normal fallback
    setTyping(true);
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 15000);
      const r = await fetch('/api/chat/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: query, lang: bot.lang, history: history.current.slice(-7, -1) }), signal: ctl.signal });
      clearTimeout(timer);
      const d = r.ok ? await r.json() : null;
      setTyping(false);
      if (d?.ok && typeof d.answer === 'string' && d.answer.trim()) {
        history.current.push({ role: 'bot', text: d.answer });
        push({ from: 'bot', text: d.answer.trim(), ai: true, link: d.handoff ? { label: t.wa, href: '#whatsapp' } : undefined });
      } else fallback(a.suggestions);
    } catch {
      setTyping(false);
      fallback(a.suggestions);
    }
  }

  // the admin preview shows what the field being edited looks like in a conversation
  const demo = useMemo<Msg[] | null>(() => {
    const f = preview?.focus ?? '';
    const m = /^s:chatbot\.faq\.(\d+)/.exec(f);
    if (m) {
      const qa = bot.faq.find((x) => x.i === Number(m[1]));
      if (!qa) return [];
      const p = `chatbot.faq.${qa.i}`;
      return [{ id: -2, from: 'me', text: qa.q, f: `${p}.q` }, { id: -3, from: 'bot', text: qa.a, link: qa.link, f: `${p}.a`, lf: `${p}.linkLabel` }];
    }
    if (f.startsWith('s:chatbot.fallback')) return [{ id: -2, from: 'me', text: bot.lang === 'ar' ? 'عندكم وظائف؟' : 'Are you hiring?' }, { id: -3, from: 'bot', text: bot.fallback, fallback: true, f: 'chatbot.fallback' }];
    return null;
  }, [preview?.focus, bot]);
  const shown = demo ?? msgs;
  const chips = bot.chips.filter((c) => !asked.includes(c));
  const go = (href: string) => resolveHref(href, bot);
  const ext = (href: string) => /^https?:/.test(go(href));

  return (
    <div ref={box} id="cbw-panel" className="cbw__panel" role="dialog" aria-modal={preview ? undefined : true} aria-labelledby="cbw-title" onKeyDown={onKey}>
      <div className="cbw__head">
        <span className="cbw__av" data-f="chatbot.avatar" aria-hidden="true">
          {bot.avatar ? <img src={bot.avatar} alt="" width={40} height={40} /> : (
            <Mark size={26} />
          )}
        </span>
        <div className="cbw__who">
          <strong id="cbw-title" data-f="chatbot.name">{bot.name}</strong>
          <span><i className="cbw__dot" aria-hidden="true" />{t.sub}</span>
        </div>
        <button ref={closeBtn} type="button" className="cbw__x" onClick={onClose} aria-label={t.close}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </button>
      </div>

      <div ref={log} className="cbw__log" role="log" aria-live="polite" aria-label={t.log}>
        {bot.greeting && <p className="cbw__msg cbw__msg--bot" data-f="chatbot.greeting">{bot.greeting}</p>}
        {!demo && msgs.length === 0 && chips.length > 0 && (
          <div className="cbw__chips">
            {bot.chips.map((c, i) => <button type="button" key={c + i} className="cbw__chip" data-f={`chatbot.chips.${i}`} onClick={() => ask(c)}>{c}</button>)}
          </div>
        )}
        {shown.map((m) => (
          <div key={m.id} className={`cbw__row cbw__row--${m.from}`}>
            <p className={`cbw__msg cbw__msg--${m.from}${m.fallback ? ' cbw__msg--fb' : ''}`} data-f={m.f}>
              {m.text}
              {m.ai && <span className="cbw__ai">{t.ai}</span>}
            </p>
            {m.link && (
              <a className="cbw__cta" href={go(m.link.href)} data-f={m.lf} {...(ext(m.link.href) ? { target: '_blank', rel: 'noopener' } : {})} onClick={() => { if (!ext(m.link!.href) && window.innerWidth < 560) onClose(); }}>
                {m.link.label}
              </a>
            )}
            {m.fallback && (
              <div className="cbw__acts">
                {bot.whatsapp && <a className="cbw__cta cbw__cta--wa" href={bot.whatsapp} target="_blank" rel="noopener">{t.wa}</a>}
                <a className="cbw__cta cbw__cta--line" href={bot.bookHref} onClick={() => { if (window.innerWidth < 560) onClose(); }}>{t.contact}</a>
              </div>
            )}
            {m.suggest && (
              <div className="cbw__chips cbw__chips--s">
                <span className="cbw__lbl">{t.mean}</span>
                {m.suggest.map((s) => <button type="button" key={s.id} className="cbw__chip" onClick={() => ask(s.q)}>{s.q}</button>)}
              </div>
            )}
          </div>
        ))}
        {typing && <p className="cbw__msg cbw__msg--bot cbw__typing" aria-label={t.typing}><i /><i /><i /></p>}
        {!demo && msgs.length > 0 && !typing && chips.length > 0 && (
          <div className="cbw__chips cbw__chips--s">
            <span className="cbw__lbl">{t.more}</span>
            {chips.slice(0, 3).map((c) => <button type="button" key={c} className="cbw__chip" onClick={() => ask(c)}>{c}</button>)}
          </div>
        )}
      </div>

      <form className="cbw__form" onSubmit={(e) => { e.preventDefault(); const q = text; setText(''); ask(q); }}>
        <input ref={input} className="cbw__in" value={text} onChange={(e) => setText(e.target.value)} placeholder={t.ph} aria-label={t.ph} maxLength={300} enterKeyHint="send" autoComplete="off" />
        <button type="submit" className="cbw__send" aria-label={t.send} disabled={!text.trim() || typing}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="cbw__sendic"><path d="M5 19 19 5M8 5h11v11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" /></svg>
        </button>
      </form>
    </div>
  );
}
