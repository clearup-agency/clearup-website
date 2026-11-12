import type { Dict } from '@/lib/dict';
import type { Raw } from '@/lib/view';
import { waWithText } from '@/lib/rules';

/** Contact page: the direct lines (WhatsApp, email, city, socials — all from «إعدادات الموقع»). */
export default function ContactInfo({ s, d }: { s: Raw; d: Dict }) {
  const f = d.footer;
  return (
    <section className="cinfo section section--tight">
      <div className="wrap">
        {s.title && <h2 className="cinfo__t" data-reveal>{s.title}</h2>}
        <ul className="cinfo__grid">
          {d.site.whatsapp && <li data-reveal><span>{s.whatsapp}</span><a href={waWithText(d.site.whatsapp, d.lang)} target="_blank" rel="noopener" data-f="whatsapp"><bdi dir="ltr">+{d.site.whatsapp.replace(/\D/g, '')}</bdi></a></li>}
          {f.email && <li data-reveal><span>{s.email}</span><a href={'mailto:' + f.email} data-f="email"><bdi dir="ltr">{f.email}</bdi></a></li>}
          {f.city && <li data-reveal><span>{s.city}</span><b data-f="city">{f.city}</b></li>}
          {d.site.socials.length > 0 && (
            <li data-reveal><span>{s.social}</span>
              <p className="cinfo__soc">{d.site.socials.map((x, i) => <a key={x.url} href={x.url} target="_blank" rel="noopener" data-f={`socials.${i}.url`}>{x.label}</a>)}</p>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
