import type { Dict } from '@/lib/dict';
import { Arrow } from './Mark';
import Brand from './Brand';
export default function Nav({ d }: { d: Dict }) {
  const links = d.nav.links.slice(0, 5);
  const cur = d.nav.current;
  return (
    <header className="nav">
      <div className="wrap nav__in">
        <a className="brand" href={d.nav.home ?? '#top'} aria-label={d.lang === 'ar' ? 'Clear Up — الرئيسية' : 'Clear Up — home'} data-f="logo">
          <Brand site={d.site} size={30} />
        </a>
        {d.showConcept !== false && <span className="concept-chip" title={d.concept} data-f="showConcept">Concept</span>}
        <nav className="nav__links" aria-label={d.lang === 'ar' ? 'القائمة الرئيسية' : 'Primary'}>
          {links.map((l, i) => (<a key={i} href={l.href} aria-current={l.page && l.page === cur ? 'page' : undefined}>{l.label}</a>))}
        </nav>
        <a className="nav__lang" data-f="langSwitch" href={d.nav.switchHref} hrefLang={d.lang === 'ar' ? 'en' : 'ar'}>{d.nav.switchLabel}</a>
        <a className="btn btn--sm" href={d.nav.ctaHref || '#book'}><span className="nav__cta-l">{d.nav.cta}</span><span className="nav__cta-s">{d.nav.ctaShort}</span><span className="btn__ic"><Arrow /></span></a>
        {links.length > 0 && (
          // the phone menu: no JavaScript (a <details>), closes on navigation since every page is its own document
          <details className="nav__menu">
            <summary aria-label={d.lang === 'ar' ? 'القائمة' : 'Menu'}><span className="nav__burger" aria-hidden="true"><i /><i /></span></summary>
            <div className="nav__sheet">
              <nav aria-label={d.lang === 'ar' ? 'قائمة الجوال' : 'Mobile menu'}>
                {d.nav.home && <a href={d.nav.home} aria-current={cur === 'home' ? 'page' : undefined}>{d.lang === 'ar' ? 'الرئيسية' : 'Home'}</a>}
                {links.map((l, i) => (<a key={i} href={l.href} aria-current={l.page && l.page === cur ? 'page' : undefined}>{l.label}<Arrow /></a>))}
              </nav>
              <a className="btn btn--lg nav__sheet-cta" href={d.nav.ctaHref || '#book'}>{d.nav.cta}<span className="btn__ic"><Arrow /></span></a>
            </div>
          </details>
        )}
      </div>
    </header>
  );
}
