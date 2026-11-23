'use client';
import { useEffect, useRef, useState } from 'react';
import SectionHead from '../SectionHead';
import { Ph } from './Blocks';

/* A form from the content document (the diagnosis session booking, the accelerator application). In this preview
   it does not send anything: «إرسال» shows the confirmation line, so the client sees the whole flow. Wiring it to
   the site's /api/contact (and the team's inbox) is part of building it for real. `prefill`: a query parameter
   (e.g. ?focus=المالية from «حوّل هذا القسم») that pre-selects the matching option. */

type Field = { name: string; label: string; type?: 'text' | 'email' | 'tel' | 'select' | 'radio' | 'checks' | 'textarea'; options?: string[]; required?: boolean; prefill?: string; wide?: boolean };
type Data = { anchor?: string; eyebrow?: string; title?: string; lead?: string; aside?: { t?: string; items?: string[]; fit?: string }; fields?: Field[]; submit?: string; success?: string; previewNote?: string };

export default function PreviewForm({ s }: { s: Data }) {
  const [sent, setSent] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const fields = (s.fields ?? []).filter((f) => f && f.name);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    for (const f of fields) {
      const v = f.prefill ? q.get(f.prefill) : null;
      if (!v || !form.current) continue;
      const el = form.current.querySelector<HTMLInputElement>(`[name="${f.name}"][value="${CSS.escape(v)}"]`);
      if (el) el.checked = true;
      const sel = form.current.querySelector<HTMLSelectElement>(`select[name="${f.name}"]`);
      if (sel && f.options?.includes(v)) sel.value = v;
    }
  }, [fields]);

  return (
    <section className="vform section" id={s.anchor || 'book'}>
      <div className="wrap vform__grid">
        <div className="vform__side">
          <SectionHead eyebrow={s.eyebrow} title={s.title} lead={s.lead} />
          {s.aside?.items?.length ? (
            <div className="vform__aside">
              {s.aside.t && <h3>{s.aside.t}</h3>}
              <ul>{s.aside.items.map((x, i) => <li key={i}><span aria-hidden="true">✓</span><Ph t={x} /></li>)}</ul>
              {s.aside.fit && <p className="vform__fit">{s.aside.fit}</p>}
            </div>
          ) : null}
        </div>
        <div className="vform__card">
          {sent ? (
            <div className="vform__ok" role="status">
              <span aria-hidden="true">✓</span>
              <p>{s.success}</p>
              <button type="button" className="link" onClick={() => setSent(false)}>↺</button>
            </div>
          ) : (
            <form ref={form} onSubmit={(e) => { e.preventDefault(); setSent(true); }} noValidate>
              {fields.map((f) => {
                const t = f.type ?? 'text';
                if (t === 'radio' || t === 'checks') {
                  return (
                    <fieldset key={f.name} className="vform__f vform__f--wide">
                      <legend>{f.label}</legend>
                      <div className="vform__opts">
                        {(f.options ?? []).map((o) => (
                          <label key={o} className="vform__chip"><input type={t === 'radio' ? 'radio' : 'checkbox'} name={f.name} value={o} /><span>{o}</span></label>
                        ))}
                      </div>
                    </fieldset>
                  );
                }
                return (
                  <label key={f.name} className={'vform__f' + (f.wide || t === 'textarea' ? ' vform__f--wide' : '')}>
                    <span>{f.label}</span>
                    {t === 'textarea' ? <textarea name={f.name} rows={3} />
                      : t === 'select' ? <select name={f.name} defaultValue=""><option value="" disabled>—</option>{(f.options ?? []).map((o) => <option key={o}>{o}</option>)}</select>
                      : <input name={f.name} type={t} dir={t === 'email' || t === 'tel' ? 'ltr' : undefined} />}
                  </label>
                );
              })}
              <button type="submit" className="btn btn--lg vform__go">{s.submit}</button>
              {s.previewNote && <p className="vform__note">{s.previewNote}</p>}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
