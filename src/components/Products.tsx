import { Arrow } from './Mark';
import SectionHead from './SectionHead';

/* «منتجاتنا» — ClearUp's own products, as their content file lists them (Nov 8, 2026). A product's button shows
   only when it has a link (set in the admin); a «قريباً» badge when it is not launched yet. */
type Item = { _key?: string; name?: string; badge?: string; desc?: string; cta?: string; href?: string };
type Data = { index?: string; eyebrow?: string; title?: string; lead?: string; items?: Item[] };

export default function Products({ s }: { s: Data }) {
  const items = (s.items ?? []).filter((x) => x && x.name);
  if (!items.length) return null;
  return (
    <section className="prods section" id="products">
      <div className="wrap">
        <SectionHead index={s.index} eyebrow={s.eyebrow} title={s.title} lead={s.lead} />
        <ul className="prods__grid">
          {items.map((p, i) => (
            <li key={p._key ?? i} className="prod" data-reveal>
              <p className="prod__top"><b className="prod__name">{p.name}</b>{p.badge && <span className="prod__badge">{p.badge}</span>}</p>
              {p.desc && <p className="prod__desc">{p.desc}</p>}
              {p.cta && p.href && <a className="link prod__cta" href={p.href}>{p.cta}<Arrow /></a>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
