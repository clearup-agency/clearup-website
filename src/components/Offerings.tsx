import VideoPlayer from './VideoPlayer';
import { Arrow } from './Mark';
import SectionHead from './SectionHead';
import { ServicesScroll } from './System';

/* «خدماتنا» — the five services from ClearUp's own content file (Nov 8, 2026: «شركة تطوير أعمال وتسويق ابتكاري»,
   marketing is one service of five). One source: the Services page's section; Home shows the same services as
   short cards (compact) linking to each one. Per service: what it is, what it includes, who it fits, and the
   videos pinned to it (opened in the same story viewer; nothing loads until tapped). */
type Vid = { _key?: string; video?: string | null; link?: string | null; poster?: { src: string } | null; label?: string; name?: string };
type Item = { _key?: string; id?: string; title?: string; en?: string; desc?: string; includes?: string[]; fits?: string; videos?: Vid[]; more?: string; moreHref?: string };
type Data = { scroll?: boolean; index?: string; eyebrow?: string; title?: string; lead?: string; items?: Item[]; compact?: boolean; all?: string; incl?: string; fit?: string; proof?: string; anchor?: string };

const T = { ar: { incl: 'تشمل', fit: 'تناسب', proof: 'من شغلنا', all: 'كل الخدمات' }, en: { incl: 'Includes', fit: 'Best for', proof: 'Proof', all: 'All services' } };
const slug = (it: Item, i: number) => (it.id && /^[a-z0-9-]+$/.test(it.id) ? it.id : 'service-' + (i + 1));

export default function Offerings({ s, lang, servicesHref }: { s: Data; lang: 'ar' | 'en'; servicesHref?: string }) {
  const t = T[lang];
  const items = (s.items ?? []).filter((it) => it && it.title);
  if (!items.length) return null;
  if (s.compact) {
    return (
      <section className="offer offer--compact offer--steps section" id="our-services">
        <div className="wrap">
          <SectionHead index={s.index} eyebrow={s.eyebrow} title={s.title} lead={s.lead} />
          <ol className="offer__grid">
            {items.map((it, i) => (
              <li key={it._key ?? i} data-reveal>
                <a className="ocard" href={(servicesHref || '') + '#' + slug(it, i)}>
                  {/* Nov 11, 2026 (Mohamed: «نظام واحد، ست مراحل» merges into the five services): the cards read as one
                      system that climbs, each with its number and its step */}
                  <span className="ocard__top" aria-hidden="true">
                    <span className="ocard__i">{String(i + 1).padStart(2, '0')}</span>
                    <span className="ocard__steps">{items.map((_, k) => <i key={k} className={k <= i ? 'is-on' : ''} style={{ ['--h' as any]: (k + 1) / items.length }} />)}</span>
                  </span>
                  <h3 className="ocard__t">{it.title}</h3>
                  {it.en && <bdi className="ocard__en" dir="ltr" data-f={`items.${(s.items ?? []).indexOf(it)}.en`}>{it.en}</bdi>}
                  {it.desc && <p className="ocard__d">{it.desc}</p>}
                  <span className="ocard__go" aria-hidden="true"><Arrow /></span>
                </a>
              </li>
            ))}
          </ol>
          {servicesHref && <p className="proof__all" data-reveal><a className="btn btn--ghost" href={servicesHref}>{s.all || t.all}<Arrow /></a></p>}
        </div>
      </section>
    );
  }
  // Nov 11, 2026 (Mohamed): the Services page shows the five services in the sticky scroll (the six stages' scroll)
  if (s.scroll) return <ServicesScroll head={{ index: s.index, eyebrow: s.eyebrow, title: s.title, lead: s.lead }} items={items} lang={lang} labels={{ incl: s.incl || t.incl, fit: s.fit || t.fit, proof: s.proof || t.proof }} />;
  return (
    <section className="offer section" id="our-services">
      <div className="wrap">
        <SectionHead index={s.index} eyebrow={s.eyebrow} title={s.title} lead={s.lead} />
        <div className="offer__list">
          {items.map((it, i) => {
            const vids = (it.videos ?? []).filter((v) => v && (v.video || v.link));
            const incl = (it.includes ?? []).filter(Boolean);
            return (
              <article key={it._key ?? i} className={'oserv' + (vids.length ? '' : ' oserv--novid')} id={slug(it, i)} data-reveal>
                <header className="oserv__h">
                  <h3 className="oserv__t">{it.title}</h3>
                  {it.en && <bdi className="oserv__en" dir="ltr" data-f={`items.${(s.items ?? []).indexOf(it)}.en`}>{it.en}</bdi>}
                </header>
                <div className="oserv__body">
                  {it.desc && <p className="oserv__d">{it.desc}</p>}
                  {incl.length > 0 && <div className="oserv__part"><h4>{s.incl || t.incl}</h4><ul className="oserv__incl">{incl.map((x, k) => <li key={k}>{x}</li>)}</ul></div>}
                  {it.fits && <div className="oserv__part"><h4>{s.fit || t.fit}</h4><p>{it.fits}</p></div>}
                  {it.more && it.moreHref && <a className="link" href={it.moreHref}>{it.more}<Arrow /></a>}
                </div>
                {vids.length > 0 && (
                  <div className="oserv__vids">
                    <p className="oserv__vh">{s.proof || t.proof}</p>
                    <div className="oserv__vrow">
                      {vids.map((v, k) => (
                        <VideoPlayer key={v._key ?? k} item={{ video: v.video ?? null, link: v.link ?? null, image: v.poster?.src ? v.poster : null }} name={v.name || it.title} lang={lang === 'en' ? 'en' : 'ar'} label={v.label || it.title || ''} className="oserv__vid" />
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
