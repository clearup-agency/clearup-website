import type { Dict } from '@/lib/dict';
import Brand from './Brand';
import { Arrow } from './Mark';
import { waWithText } from '@/lib/rules';

export const CTA_TEXT = {
  ar: { book: 'احجز مكالمة مجانية', wa: 'تواصل على واتساب', waShort: 'واتساب' },
  en: { book: 'Book a free call', wa: 'Chat on WhatsApp', waShort: 'WhatsApp' },
};

type FootText = { book?: string; wa?: string; waShort?: string };
/** The «book» / WhatsApp words of the footer and the phone bar: the settings, else the defaults above. */
export function ctaText(d: Pick<Dict, 'lang' | 'footer'>) {
  const t = CTA_TEXT[d.lang === 'en' ? 'en' : 'ar'];
  const f = (d.footer ?? {}) as FootText;
  return { book: f.book?.trim() || t.book, wa: f.wa?.trim() || t.wa, waShort: f.waShort?.trim() || t.waShort };
}

export default function Footer({ d }: { d: Dict }) {
  const f = d.footer;
  // the buttons' words are settings since Nov 9, 2026 («أسفل الصفحة»); empty = these defaults
  const t = ctaText(d);
  const pages = d.nav.links.filter((l) => l.page);
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot__top">
          {f.line && <p className="foot__line">{f.line}</p>}
          {/* the last chance to act: book a free call, or WhatsApp */}
          <div className="foot__cta">
            <a className="btn btn--light" href={d.nav.ctaHref || d.links?.contact || '#book'} data-f="footerBook">{t.book}<span className="btn__ic"><Arrow /></span></a>
            {d.site.whatsapp && <a className="btn btn--line" href={waWithText(d.site.whatsapp, d.lang)} target="_blank" rel="noopener" data-f="footerWa">{t.wa}</a>}
          </div>
        </div>
        <div className="foot__grid">
          <div className="foot__brand" data-f="logo"><Brand site={d.site} size={56} xl />{(f as { tagline?: string }).tagline && <p className="foot__tag" data-f="tagline">{(f as { tagline?: string }).tagline}</p>}</div>
          {pages.length > 0 && (
            <ul className="foot__links foot__pages" aria-label="pages">
              {pages.map((l, i) => (<li key={i} data-f={`navLinks.${d.nav.links.indexOf(l)}.label`}><a href={l.href}>{l.label}</a></li>))}
            </ul>
          )}
          <ul className="foot__links">
            {f.city && <li>{f.city}</li>}
            {f.email && <li data-f="email"><a href={'mailto:' + f.email}>{f.email}</a></li>}
            {d.site.whatsapp && <li data-f="whatsapp"><a href={waWithText(d.site.whatsapp, d.lang)} target="_blank" rel="noopener" data-f="footerWaShort">{t.waShort}</a></li>}
            {d.site.socials.map((s, i) => (<li key={s.url} data-f={`socials.${i}.url`}><a href={s.url} target="_blank" rel="noopener">{s.label}</a></li>))}
          </ul>
        </div>
        <p className="foot__base"><span>{f.rights}</span>{f.concept && <span>{f.concept}</span>}</p>
      </div>
    </footer>
  );
}
