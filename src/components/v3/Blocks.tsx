import type { Raw } from '@/lib/view';
import { Arrow } from '../Mark';
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

/** A table that becomes one card per row on a phone (each cell keeps its column name). */
export function TableSection({ s, lang, page }: { s: Raw; lang: L; page: string }) {
  const cols = list<string>(s.columns);
  const rows = list(s.rows);
  if (!rows.length) return null;
  const hasCta = rows.some((r) => str(r.cta));
  return (
    <section className={'vtab section' + (s.compact ? ' section--tight' : '')} id={str(s.anchor) || undefined}>
      <div className="wrap">
        <SectionHead eyebrow={str(s.eyebrow)} title={str(s.title)} lead={str(s.lead)} />
        <div className="vt" data-reveal style={{ ['--cols' as string]: cols.length + (hasCta ? 1 : 0) }}>
          <div className="vt__row vt__row--head" role="row">
            {cols.map((c, i) => <span key={i} role="columnheader">{c}</span>)}
            {hasCta && <span aria-hidden="true" />}
          </div>
          {rows.map((r, i) => (
            <div key={i} className={'vt__row' + (r.feature ? ' vt__row--feature' : '')} role="row">
              {list<string>(r.cells).map((c, j) => (
                <div key={j} className={'vt__c' + (j === 0 ? ' vt__c--k' : '')} role="cell">
                  {j > 0 && cols[j] && <em className="vt__lbl">{cols[j]}</em>}
                  <span><Ph t={c} /></span>
                </div>
              ))}
              {hasCta && (
                <div className="vt__c vt__c--cta" role="cell">
                  {str(r.cta) && <a className="link" href={vhref(r.href, lang, page)}>{r.cta}<Arrow /></a>}
                </div>
              )}
            </div>
          ))}
        </div>
        {str(s.note) && <p className="vtab__note"><Ph t={s.note} /></p>}
        {s.foot && str(s.foot.label) && (
          <p className="vtab__foot"><a className="link" href={vhref(s.foot.href, lang, page)}>{s.foot.label}<Arrow /></a></p>
        )}
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
              {str(it.tag) && <p className="vcard__tag"><Ph t={it.tag} /></p>}
              {str(it.t) && <h3 className="vcard__t"><Ph t={it.t} /></h3>}
              {str(it.quote) && <p className="vcard__quote"><Ph t={it.quote} /></p>}
              {str(it.d) && <p className="vcard__d"><Ph t={it.d} /></p>}
              {list(it.rows).length > 0 && (
                <dl className="vcard__rows">
                  {list(it.rows).map((r, j) => <div key={j}><dt>{r.k}</dt><dd><Ph t={r.v} /></dd></div>)}
                </dl>
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

/** The programmes, each in the same template: the promise, what it includes, the role of AI and the expected impact. */
export function ProgramsSection({ s, lang, page }: { s: Raw; lang: L; page: string }) {
  const items = list(s.items);
  const lb = (s.labels ?? {}) as Raw;
  return (
    <section className="vprog section" id={str(s.anchor) || 'programs'}>
      <div className="wrap">
        <SectionHead eyebrow={str(s.eyebrow)} title={str(s.title)} lead={str(s.lead)} />
        <ol className="vprog__list">
          {items.map((it, i) => (
            <li key={i} className={'vprog__item' + (it.feature ? ' vprog__item--feature' : '')} id={str(it.id) || undefined} data-reveal>
              <header className="vprog__head">
                {str(it.n) && <span className="vprog__n">{it.n}</span>}
                <div>
                  {str(it.tag) && <p className="vprog__tag">{it.tag}</p>}
                  <h3 className="vprog__t">{it.t}</h3>
                  {str(it.promise) && <p className="vprog__promise"><Ph t={it.promise} /></p>}
                </div>
              </header>
              <div className="vprog__body">
                {str(it.cycle) && <p className="vprog__cycle">{it.cycle}</p>}
                {str(it.text) && <p className="vprog__text"><Ph t={it.text} /></p>}
                {list<string>(it.includes).length > 0 && (
                  <div className="vprog__blk"><h4>{lb.includes}</h4><ul>{list<string>(it.includes).map((x, j) => <li key={j}><Ph t={x} /></li>)}</ul></div>
                )}
                {str(it.choices) && <div className="vprog__blk"><h4>{lb.choices}</h4><p><Ph t={it.choices} /></p></div>}
                {str(it.ai) && <div className="vprog__blk vprog__blk--ai"><h4>{lb.ai}</h4><p><Ph t={it.ai} /></p></div>}
                {list<string>(it.impact).length > 0 && (
                  <div className="vprog__blk vprog__blk--impact"><h4>{lb.impact}</h4><ul>{list<string>(it.impact).map((x, j) => <li key={j}><Ph t={x} /></li>)}</ul></div>
                )}
                {list(it.rows).length > 0 && (
                  <dl className="vprog__rows">{list(it.rows).map((r, j) => <div key={j}><dt>{r.k}</dt><dd><Ph t={r.v} /></dd></div>)}</dl>
                )}
                {str(it.proof) && <p className="vprog__proof"><Ph t={it.proof} /></p>}
                {it.cta && str(it.cta.label) && <div className="cta-row"><Btn b={it.cta} lang={lang} page={page} /></div>}
              </div>
            </li>
          ))}
        </ol>
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
