'use client';
import { useEffect, useRef, useState } from 'react';
import type { Dict } from '@/lib/dict';
import { FORM_DEFAULTS, FORM_TEXT, validateContact, type ContactInput, type FieldError } from '@/lib/contact';
import { Arrow } from './Mark';
import { waWithText } from '@/lib/rules';

type Mode = 'ask' | 'yes' | 'no' | 'sending' | 'sent' | 'error';
type Errors = Partial<Record<keyof ContactInput, FieldError>>;

/** Which state the admin's live preview shows while a field of this form is being edited (inspect). */
export function previewMode(focus?: string | null): Mode | null {
  if (!focus) return null;
  if (/^success(\.|$)/.test(focus)) return 'sent';
  if (/^(error|errorWhatsapp)(\.|$)/.test(focus)) return 'error';
  if (/^(yes|fields|submit|promise|sending)(\.|$)/.test(focus) || focus === 's:contactTo') return 'yes';
  if (/^notYetMsg(\.|$)/.test(focus)) return 'no';
  return null;
}

/** The courageous gate: one bold question, then the form — its message goes straight to the admin's email. */
/** `startOpen`: the Contact page shows the form straight away (the question is already answered by coming here). */
export default function Final({ d, focus, startOpen }: { d: Dict; focus?: string | null; startOpen?: boolean }) {
  const f = d.final; // texts added after the content was first saved may be missing → the defaults below
  const lang = d.lang === 'en' ? 'en' : 'ar';
  const def = FORM_DEFAULTS[lang];
  const tx = FORM_TEXT[lang];
  const [state, setMode] = useState<Mode>(startOpen ? 'yes' : 'ask');
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState<ContactInput | null>(null);
  const opened = useRef(0);
  const form = useRef<HTMLFormElement>(null);
  const mode = previewMode(focus) ?? state;
  const gated = useRef(false); // only after a click on the gate (never on page load / in the admin preview)
  const noMsg = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!gated.current) return;
    gated.current = false;
    if (state === 'yes') form.current?.querySelector<HTMLElement>('input[name="name"]')?.focus();
    else if (state === 'no') noMsg.current?.focus();
  }, [state]);
  const showForm = mode === 'yes' || mode === 'sending' || mode === 'error';

  const read = (): Record<string, string> => Object.fromEntries(new FormData(form.current!).entries()) as Record<string, string>;
  const open = () => { opened.current = Date.now(); gated.current = true; setMode('yes'); };
  // the Contact page opens the form straight away: start the "time to fill" clock when it appears (and, at the
  // latest, on the first field a person touches) — otherwise every real message there looked like a bot's
  // (time 0 < 1.5 s) and was dropped with a fake «تم الإرسال»
  useEffect(() => { if (startOpen && !opened.current) opened.current = Date.now(); }, [startOpen]);
  const touched = () => { if (!opened.current) opened.current = Date.now(); };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mode === 'sending') return;
    const data = read();
    const c = validateContact(data);
    if (!c.ok) {
      setErrors(c.errors);
      form.current?.querySelector<HTMLElement>(`[name="${Object.keys(c.errors)[0]}"]`)?.focus();
      return;
    }
    setErrors({});
    setMode('sending');
    try {
      const r = await fetch('/api/contact/', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...c.value, website: data.website ?? '', lang, page: location.pathname, t: Date.now() - (opened.current || Date.now()) }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.ok) { setSent(c.value); setMode('sent'); return; }
      if (j?.reason === 'invalid' && j.errors) { setErrors(j.errors); setMode('yes'); return; }
      setSent(c.value);
      setMode('error');
    } catch {
      setSent(c.value);
      setMode('error');
    }
  }

  // the WhatsApp fallback carries what they typed, so nothing they wrote is lost
  const waText = sent ? [sent.name, sent.company, sent.phone, sent.email, sent.message].filter(Boolean).join('\n') : '';
  const waHref = d.site.whatsapp ? d.site.whatsapp + (waText ? '?text=' + encodeURIComponent(waText) : '') : '';
  const err = (k: keyof ContactInput) => errors[k] ? <span className="book__err" id={`book-${k}-err`}>{tx[errors[k]!]}</span> : null;
  const field = (k: keyof ContactInput, label: string, props: React.InputHTMLAttributes<HTMLInputElement>, optional = false) => (
    <label>
      <span data-f={`fields.${k}`}>{label}{optional && <em className="book__opt"> · {tx.optional}</em>}</span>
      <input name={k} data-f={`fields.${k}`} maxLength={k === 'email' ? 200 : k === 'phone' ? 30 : 120} aria-invalid={errors[k] ? true : undefined}
        aria-describedby={errors[k] ? `book-${k}-err` : undefined} {...props} />
      {err(k)}
    </label>
  );

  return (
    <section className="final" id="book">
      <div className="wrap">
      <div className="final__card final__grid">
        {/* the headline next to the form, on Home and on Contact alike (Mohamed, Nov 8: «جاهز تغيّر طريقة شغلك؟»
            belongs beside the form on the Contact page too) */}
        {f.title?.length > 0 && <h2 className="final__title" data-reveal>{f.title[0] && <span>{f.title[0]}</span>}{f.title[1] && <span>{f.title[1]}</span>}</h2>}
        <div className="final__act" data-reveal>
          {mode === 'ask' && (
            <div className="gate">
              <button className="btn btn--lg btn--light" onClick={open}>{f.yes}<span className="btn__ic"><Arrow /></span></button>
              <button className="btn btn--lg btn--line" onClick={() => { gated.current = true; setMode('no'); }}>{f.notYet}</button>
              {f.promise && <p className={'book__promise gate__promise' + (f.promise.includes('[') ? ' ph-inline' : '')}>{f.promise}</p>}
            </div>
          )}
          {mode === 'no' && (
            <p className="gate__no" ref={noMsg} tabIndex={-1}>{f.notYetMsg} <a className="link link--light" href={d.site.instagram} target="_blank" rel="noopener">@clearup.agency<Arrow /></a></p>
          )}
          {showForm && (
            <form className="book" ref={form} onSubmit={submit} onFocusCapture={touched} noValidate data-f="s:contactTo" aria-busy={mode === 'sending' || undefined}>
              {field('name', f.fields.name, { autoComplete: 'name', required: true })}
              {field('phone', f.fields.phone, { type: 'tel', inputMode: 'tel', autoComplete: 'tel', dir: 'ltr', required: true })}
              {field('email', f.fields.email || def.email, { type: 'email', inputMode: 'email', autoComplete: 'email', dir: 'ltr' }, true)}
              {field('company', f.fields.company, { autoComplete: 'organization' }, true)}
              <label>
                <span data-f="fields.message">{f.fields.message || def.message}<em className="book__opt"> · {tx.optional}</em></span>
                <textarea name="message" data-f="fields.message" rows={3} maxLength={2000} aria-invalid={errors.message ? true : undefined} />
                {err('message')}
              </label>
              {/* people never see this; form-filling bots do */}
              <div className="book__hp" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
              <button className="btn btn--lg btn--light" type="submit" disabled={mode === 'sending'}>
                {mode === 'sending' ? <span data-f="sending">{f.sending || def.sending}</span> : f.submit}<span className="btn__ic"><Arrow /></span>
              </button>
              {f.promise && <p className={'book__promise' + (f.promise.includes('[') ? ' ph-inline' : '')}>{f.promise}</p>}
              <div role="status" aria-live="polite" className="book__live">
                {mode === 'error' && (
                  <div className="book__fail">
                    <p data-f="error">{f.error || def.error}</p>
                    {waHref && <a className="btn btn--light book__wa" href={waHref} target="_blank" rel="noopener" data-f="errorWhatsapp">{f.errorWhatsapp || def.errorWhatsapp}<span className="btn__ic"><Arrow /></span></a>}
                  </div>
                )}
              </div>
            </form>
          )}
          {mode === 'sent' && (
            <div className="book__ok" role="status" aria-live="polite">
              <span className="book__tick" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
              <p data-f="success">{f.success || def.success}</p>
            </div>
          )}
          {d.site.whatsapp && f.whatsapp && <a className="link link--light final__wa" href={waWithText(d.site.whatsapp, lang)} target="_blank" rel="noopener">{f.whatsapp}<Arrow /></a>}
        </div>
      </div>
      </div>
    </section>
  );
}
