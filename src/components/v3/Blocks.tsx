import type { Raw } from '@/lib/view';
import { Arrow, MarkMono } from '../Mark';
import SectionHead from '../SectionHead';

/* The value-proposition content (Nov 22, 2026 content document «محتوى موقع Clear Up المطوّر: عرض القيمة»): the
   generic blocks its pages are built from — a table, cards, a limited-offer strip, an inner-page landing head,
   the programmes and a case spotlight. Text written in [square brackets] still needs confirming by the client and
   is shown striped, so nothing is quietly published as fact. */

type L = 'ar' | 'en';
/** "/contact/?focus=x#book" → "/ar/contact/?focus=x#book"; "#faq" and full URLs as written. */
export const vhref = (h: unknown, lang: string, _page?: string): string => {
  const s = typeof h === 'string' ? h.trim() : '';
  return s.startsWith('/') ? `/${lang}${s}` : s || '#';
};
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const list = <T = Raw>(v: unknown): T[] => (Array.isArray(v) ? (v.filter(Boolean) as T[]) : []);

/** «[التاريخ]» → a striped «needs confirming» chip inside the text. */
export function Ph({ t }: { t: unknown }) {
  const s = str(t);
  if (!s) return null;
  return <>{s.split(/(\[[^\]]+\])/).map((p, i) => (p.startsWith('[') ? <span key={i} className="ph-inline">{p}</span> : p))}</>;
}

function Btn({ b, lang, page, ghost, light }: { b: Raw | undefined; lang: L; page: string; ghost?: boolean; light?: boolean }) {
  if (!b || !str(b.label)) return null;
  const cls = 'btn btn--lg' + (ghost || b.ghost ? ' btn--ghost' : '') + (light ? ' btn--light' : '');
  return (
    <a className={cls} href={vhref(b.href, lang, page)}>
      {b.label}
      {!(ghost || b.ghost) && <span className="btn__ic"><Arrow /></span>}
    </a>
  );
}

/** The top of an inner page with buttons (the accelerator, the assessment, the diagnosis session, the sectors). */
export function LandingHead({ s, lang, page }: { s: Raw; lang: L; page: string }) {
  const buttons = list(s.buttons);
  const chips = list<string>(s.chips);
  return (
    <section className="lhead">
      <div className="wrap lhead__in">
        {str(s.kicker) && <p className="kicker"><span className="sq" aria-hidden="true" /><Ph t={s.kicker} /></p>}
        <h1 className="lhead__t"><Ph t={s.title} /></h1>
        {str(s.lead) && <p className="lhead__lead"><Ph t={s.lead} /></p>}
        {chips.length > 0 && <ul className="lhead__chips">{chips.map((c, i) => <li key={i}><Ph t={c} /></li>)}</ul>}
        {buttons.length > 0 && <div className="cta-row lhead__cta">{buttons.map((b, i) => <Btn key={i} b={b} lang={lang} page={page} ghost={i > 0} />)}</div>}
        {str(s.note) && <p className="lhead__note"><Ph t={s.note} /></p>}
      </div>
    </section>
  );
}

/** «كيف نختار» — the selection criteria as weight bars out of 100 (each bar's length is its weight), the total
 *  beside them, and the bonus points and the diversity rule as two short notes. */
export function WeightsSection({ s }: { s: Raw }) {
  const items = list(s.items);
  if (!items.length) return null;
  const total = items.reduce((n, it) => n + (Number(it.w) || 0), 0);
  const max = Math.max(...items.map((it) => Number(it.w) || 0), 1);
  const notes = list(s.notes);
  return (
    <section className="vw section" id={str(s.anchor) || undefined}>
      <div className="wrap">
        <SectionHead eyebrow={str(s.eyebrow)} title={str(s.title)} lead={str(s.lead)} />
        <div className="vw__grid">
          <ol className="vw__list" data-reveal>
            {items.map((it, i) => (
              <li key={i} className="vw__item">
                <span className="vw__name"><Ph t={it.t} /></span>
                <span className="vw__bar" aria-hidden="true"><b style={{ width: `${((Number(it.w) || 0) / max) * 100}%` }} /></span>
                <span className="vw__w num">{it.w}</span>
              </li>
            ))}
          </ol>
          <aside className="vw__side">
            <div className="vw__total" data-reveal><span className="num">{total}</span><em>{s.totalLabel}</em></div>
            {notes.map((n, i) => (
              <div key={i} className="vw__note" data-reveal>
                <h3>{n.t}</h3>
                {str(n.d) && <p><Ph t={n.d} /></p>}
                {list<string>(n.bullets).length > 0 && <ul>{list<string>(n.bullets).map((x, j) => <li key={j}><Ph t={x} /></li>)}</ul>}
              </div>
            ))}
          </aside>
        </div>
      </div>
    </section>
  );
}

/** Cards: plain grid, numbered steps, a check list, or detailed sector cards. */
export function CardsSection({ s, lang, page }: { s: Raw; lang: L; page: string }) {
  const items = list(s.items);
  if (!items.length) return null;
  const v = str(s.variant) || 'grid';
  const extra = list<string>(s.extra);
  return (
    <section className={`vcards vcards--${v} section` + (s.compact ? ' section--tight' : '')} id={str(s.anchor) || undefined}>
      <div className="wrap">
        <SectionHead eyebrow={str(s.eyebrow)} title={str(s.title)} lead={str(s.lead)} />
        <ol className="vcards__grid" style={{ ['--min' as string]: (s.min ?? (v === 'sector' ? 290 : 240)) + 'px' }}>
          {items.map((it, i) => (
            <li key={i} className={'vcard' + (it.feature ? ' vcard--feature' : '')} id={str(it.id) || undefined} data-reveal style={{ ['--i' as string]: i }}>
              {v === 'numbered' && <span className="vcard__n">{i + 1}</span>}
              {v === 'check' && <span className="vcard__ic" aria-hidden="true">✓</span>}
              {v === 'track' && <span className="vcard__lvl" aria-hidden="true">{items.map((_, j) => <i key={j} className={j <= i ? 'is-on' : ''} />)}</span>}
              {v === 'outcome' && <span className="vcard__big num">{String(i + 1).padStart(2, '0')}</span>}
              {str(it.tag) && <p className="vcard__tag"><Ph t={it.tag} /></p>}
              {str(it.t) && <h3 className="vcard__t"><Ph t={it.t} /></h3>}
              {str(it.quote) && <p className="vcard__quote"><Ph t={it.quote} /></p>}
              {str(it.d) && <p className="vcard__d"><Ph t={it.d} /></p>}
              {list(it.rows).length > 0 && (
                <dl className="vcard__rows">
                  {list(it.rows).map((r, j) => <div key={j}><dt>{r.k}</dt><dd><Ph t={r.v} /></dd></div>)}
                </dl>
              )}
              {list<string>(it.cycle).length > 0 && (
                <ol className="vcard__cycle">{list<string>(it.cycle).map((c, j) => <li key={j}>{c}</li>)}</ol>
              )}
              {list<string>(it.chips).length > 0 && (
                <p className="vcard__chips">{str(it.chipsLabel) && <em>{it.chipsLabel}</em>}{list<string>(it.chips).map((c, j) => <span key={j}>{c}</span>)}</p>
              )}
              {list<string>(it.bullets).length > 0 && <ul className="vcard__ul">{list<string>(it.bullets).map((b, j) => <li key={j}><Ph t={b} /></li>)}</ul>}
              {str(it.cta) && <a className="link vcard__cta" href={vhref(it.href, lang, page)}>{it.cta}<Arrow /></a>}
            </li>
          ))}
        </ol>
        {(str(s.footTitle) || extra.length > 0) && (
          <div className="vcards__extra" data-reveal>
            {str(s.footTitle) && <h3><Ph t={s.footTitle} /></h3>}
            {extra.length > 0 && <ul>{extra.map((x, i) => <li key={i}><Ph t={x} /></li>)}</ul>}
          </div>
        )}
        {str(s.foot) && <p className="vtab__note"><Ph t={s.foot} /></p>}
        {s.cta && str(s.cta.label) && <div className="cta-row vcards__cta"><Btn b={s.cta} lang={lang} page={page} /></div>}
      </div>
    </section>
  );
}

/** «أطلقنا المسرّعة الذكية…» — the limited offer, in a different colour so it stands out. */
export function OfferSection({ s, lang, page }: { s: Raw; lang: L; page: string }) {
  return (
    <section className="voffer section section--tight" id={str(s.anchor) || undefined}>
      <div className="wrap">
        <div className="voffer__card" data-reveal>
          {/* Nov 24, 2026 (Mohamed chose option A): the logo mark, faded, behind the text on the empty side */}
          <MarkMono size={340} className="voffer__wm" id="voffer-mark-cut" />
          {str(s.kicker) && <p className="voffer__k"><Ph t={s.kicker} /></p>}
          <h2 className="voffer__t"><Ph t={s.title} /></h2>
          {str(s.lead) && <p className="voffer__lead"><Ph t={s.lead} /></p>}
          <div className="voffer__row">
            <Btn b={s.cta} lang={lang} page={page} light />
            {str(s.note) && <p className="voffer__note"><Ph t={s.note} /></p>}
          </div>
        </div>
      </div>
    </section>
  );
}

/** One client story told by its value (Mashwar): the big number first, then the challenge, what we did, the result. */
export function CaseSpotlight({ s }: { s: Raw }) {
  const lb = (s.labels ?? {}) as Raw;
  const res = list<string>(s.results);
  const did = list<string>(s.did);
  return (
    <section className="vcase section" id={str(s.anchor) || undefined}>
      <div className="wrap">
        <SectionHead eyebrow={str(s.eyebrow)} title={str(s.heading)} />
        <article className="vcase__card" data-reveal>
          <div className="vcase__side">
            {str(s.tag) && <p className="vcase__tag">{s.tag}</p>}
            <p className="vcase__big"><span className="num">{s.big}</span><em>{s.bigLabel}</em></p>
            <p className="vcase__client">{s.client}</p>
          </div>
          <div className="vcase__main">
            <h3 className="vcase__t"><Ph t={s.title} /></h3>
            {str(s.challenge) && <div className="vcase__blk"><h4>{lb.challenge}</h4><p><Ph t={s.challenge} /></p></div>}
            {did.length > 0 && <div className="vcase__blk"><h4>{lb.did}</h4>{did.map((p, i) => <p key={i}><Ph t={p} /></p>)}</div>}
            {res.length > 0 && <div className="vcase__blk"><h4>{lb.result}</h4><ul>{res.map((x, i) => <li key={i}><Ph t={x} /></li>)}</ul></div>}
            {str(s.quote) && (
              <blockquote className="vcase__quote"><p><Ph t={s.quote} /></p>{str(s.by) && <cite>{s.by}</cite>}</blockquote>
            )}
            {str(s.lesson) && <p className="vcase__lesson"><Ph t={s.lesson} /></p>}
          </div>
        </article>
      </div>
    </section>
  );
}
