import type { PageCtx, Raw } from '@/lib/view';
import { filled } from '@/lib/pages';
import SectionHead from '../SectionHead';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('');

/** About: the team. Hidden from visitors until it has at least one member with a name. */
export default function Team({ s, ctx }: { s: Raw; ctx: PageCtx }) {
  const members: Raw[] = (s.members ?? []).filter((m: Raw) => filled(m?.name));
  if (!members.length) {
    return ctx.preview ? <section className="team2 section"><div className="wrap"><p className="ph-admin">قسم الفريق مخفي عن الزوار حتى تضيف أول عضو.</p></div></section> : null;
  }
  return (
    <section className="team2 section" id="team">
      <div className="wrap">
        <SectionHead eyebrow={s.eyebrow} title={s.title} />
        <ul className="team2__grid">
          {members.map((m, i) => (
            <li key={i} className="team2__m" data-reveal>
              {m.photo?.src
                ? <img src={m.photo.src} alt={m.name} width={240} height={240} loading="lazy" decoding="async" />
                : <span className="team2__mono" aria-hidden="true" data-f={`members.${(s.members ?? []).indexOf(m)}.photo`}>{initials(m.name)}</span>}
              <b>{m.name}</b>
              {filled(m.role) && <span>{m.role}</span>}
            </li>
          ))}
        </ul>
        {filled(s.note) && <p className="team2__note">{s.note}</p>}
      </div>
    </section>
  );
}
