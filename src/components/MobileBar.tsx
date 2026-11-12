import { waWithText } from '@/lib/rules';
import { CTA_TEXT } from './Footer';

type Words = { book?: string; wa?: string };

/** Phones only (CSS): a bar fixed at the bottom — «احجز مكالمة مجانية» + WhatsApp (with a ready message). The
 *  chat button sits inside it (on its side), so nothing floats over the page's own buttons. */
export default function MobileBar({ lang, book, whatsapp, chatSide, words }: { lang: string; book: string; whatsapp: string; chatSide?: 'left' | 'right' | null; words?: Words }) {
  // the same words as the footer's buttons (settings «أسفل الصفحة»; empty = the defaults)
  const d = CTA_TEXT[lang === 'en' ? 'en' : 'ar'];
  const t = { book: words?.book?.trim() || d.book, wa: words?.wa?.trim() || d.wa };
  return (
    <div className={'mbar' + (chatSide ? ' mbar--chat-' + chatSide : '')} role="region" aria-label={t.book}>
      <a className="btn mbar__book" href={book}>{t.book}</a>
      {whatsapp && (
        <a className="mbar__wa" href={waWithText(whatsapp, lang)} target="_blank" rel="noopener" aria-label={t.wa}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.9-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>
        </a>
      )}
    </div>
  );
}
