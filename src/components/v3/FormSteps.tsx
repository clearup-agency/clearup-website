'use client';
import { useEffect, useRef, useState } from 'react';
import { Arrow } from '../Mark';
import { Ph } from './Blocks';

/* The site's ONE form for the value-proposition pages (Mohamed, Nov 23, 2026: «بدنا نوحد الفورم… شغل كومبوننت»):
   the diagnosis session booking and the accelerator application are the same component, the same look, only
   their fields differ. Short steps instead of one long form: a progress line, a few fields per step, «التالي»
   checks the step's required fields. Beside it, what the visitor gets (and who it is for).
   In this preview it sends nothing: the last step shows the confirmation. Wiring it to /api/contact (the team's
   inbox, as the current booking form does) is part of building it for real. `prefill`: a query parameter
   (?focus=المالية from «حوّل هذا القسم») pre-selects the matching option. */

type Field = { name: string; label: string; type?: 'text' | 'email' | 'tel' | 'select' | 'radio' | 'checks' | 'textarea'; options?: string[]; required?: boolean; prefill?: string; half?: boolean };
type Step = { t: string; fields: Field[] };
type Data = {
  anchor?: string; kicker?: string; title?: string; lead?: string; heading?: 'h1' | 'h2';
  aside?: { t?: string; items?: string[]; fit?: string; fitTitle?: string };
  steps?: Step[]; labels?: { next?: string; back?: string; step?: string; of?: string; required?: string };
  submit?: string; success?: string; successLink?: { label?: string; href?: string }; previewNote?: string;
};

export default function FormSteps({ s, lang }: { s: Data; lang: 'ar' | 'en' }) {
  const steps = (s.steps ?? []).filter((x) => x && x.fields?.length);
  const [at, setAt] = useState(0);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const lb = s.labels ?? {};
  const H = s.heading === 'h1' ? 'h1' : 'h2';

  // pre-select from the address (?focus=…: «حوّل هذا القسم», a sector page). A value that is not one of the field's
  // choices (a department, a sector) is added to them as an extra, already chosen, choice
  const [extra, setExtra] = useState<Record<string, string>>({});
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const add: Record<string, string> = {};
    for (const st of steps) for (const f of st.fields) {
      const v = f.prefill ? q.get(f.prefill) : null;
      if (v && !(f.options ?? []).includes(v)) add[f.name] = v;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the address once, after hydration
    if (Object.keys(add).length) setExtra(add);
  }, [steps]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    for (const st of steps) for (const f of st.fields) {
      const v = f.prefill ? q.get(f.prefill) : null;
      if (!v || !form.current) continue;
      const el = form.current.querySelector<HTMLInputElement>(`[name="${f.name}"][value="${CSS.escape(v)}"]`);
      if (el) el.checked = true;
    }
  }, [steps, extra]);

  const stepOk = () => {
    const root = form.current?.querySelector<HTMLElement>(`[data-step="${at}"]`);
    if (!root) return true;
    for (const f of steps[at].fields) {
      if (!f.required) continue;
      const els = Array.from(root.querySelectorAll<HTMLInputElement>(`[name="${f.name}"]`));
      const ok = els.some((e) => (e.type === 'radio' || e.type === 'checkbox' ? e.checked : !!e.value.trim()));
      if (!ok) return false;
    }
    return true;
  };
  const next = () => {
    if (!stepOk()) { setErr(true); return; }
    setErr(false);
    if (at + 1 < steps.length) setAt(at + 1);
    else setSent(true);
  };

  return (
    <section className="vfs section" id={s.anchor || 'book'}>
      <div className="wrap vfs__grid">
        <div className="vfs__side">
          {s.kicker && <p className="kicker"><span className="sq" aria-hidden="true" /><Ph t={s.kicker} /></p>}
          <H className="vfs__t"><Ph t={s.title} /></H>
          {s.lead && <p className="vfs__lead"><Ph t={s.lead} /></p>}
          {s.aside?.items?.length ? (
            <div className="vfs__aside">
              {s.aside.t && <h3>{s.aside.t}</h3>}
              <ul>{s.aside.items.map((x, i) => <li key={i}><span aria-hidden="true">✓</span><p><Ph t={x} /></p></li>)}</ul>
              {s.aside.fit && <div className="vfs__fit">{s.aside.fitTitle && <h4>{s.aside.fitTitle}</h4>}<p>{s.aside.fit}</p></div>}
            </div>
          ) : null}
        </div>
        <div className="vfs__card">
          {sent ? (
            <div className="vfs__ok" role="status">
              <span className="vfs__tick" aria-hidden="true">✓</span>
              <p>{s.success}</p>
              {s.successLink?.label && <a className="link link--light" href={s.successLink.href ? `/${lang}${s.successLink.href}` : '#'}>{s.successLink.label}<Arrow /></a>}
            </div>
          ) : (
            <form ref={form} onSubmit={(e) => { e.preventDefault(); next(); }} noValidate>
              <div className="vfs__prog">
                <p>{lb.step} {at + 1} {lb.of} {steps.length} · <b>{steps[at]?.t}</b></p>
                <ol aria-hidden="true">{steps.map((_, i) => <li key={i} className={i <= at ? 'is-on' : ''} />)}</ol>
              </div>
              {steps.map((st, i) => (
                <div key={i} data-step={i} className="vfs__step" hidden={i !== at}>
                  {st.fields.map((f) => {
                    const t = f.type ?? 'text';
                    const req = f.required ? <i aria-hidden="true">*</i> : null;
                    if (t === 'radio' || t === 'checks') {
                      return (
                        <fieldset key={f.name} className="vfs__f">
                          <legend>{f.label}{req}</legend>
                          <div className="vfs__opts">
                            {[...(f.options ?? []), ...(extra[f.name] ? [extra[f.name]] : [])].map((o) => (
                              <label key={o} className="vfs__chip"><input type={t === 'radio' ? 'radio' : 'checkbox'} name={f.name} value={o} /><span>{o}</span></label>
                            ))}
                          </div>
                        </fieldset>
                      );
                    }
                    return (
                      <label key={f.name} className={'vfs__f' + (f.half ? ' vfs__f--half' : '')}>
                        <span>{f.label}{req}</span>
                        {t === 'textarea' ? <textarea name={f.name} rows={3} />
                          : t === 'select' ? <select name={f.name} defaultValue=""><option value="" disabled>—</option>{(f.options ?? []).map((o) => <option key={o}>{o}</option>)}</select>
                          : <input name={f.name} type={t} dir={t === 'email' || t === 'tel' ? 'ltr' : undefined} />}
                      </label>
                    );
                  })}
                </div>
              ))}
              {err && <p className="vfs__err" role="alert">{lb.required}</p>}
              <div className="vfs__nav">
                <button type="submit" className="btn btn--light btn--lg">{at + 1 < steps.length ? lb.next : s.submit}<span className="btn__ic"><Arrow /></span></button>
                {at > 0 && <button type="button" className="vfs__back" onClick={() => { setErr(false); setAt(at - 1); }}>{lb.back}</button>}
              </div>
              {s.previewNote && <p className="vfs__note">{s.previewNote}</p>}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
