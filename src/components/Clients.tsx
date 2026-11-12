import type { Dict } from '@/lib/dict';
/* «شركات وثقت بنا» — an endless row (Mohamed, Nov 8, 2026: after the last name the first follows at once, no gap, no
   jump). Two identical groups side by side; each group repeats the names until it is wider than any screen, and the
   track slides exactly one group's width (−50 %) before it starts again, so the seam is invisible. Each group carries
   its own trailing gap, so the space between the last and the first name equals every other space. Arabic slides
   the other way. Paused on hover (mouse only) and still for reduced motion. */
const MIN_PER_GROUP = 10;
export default function Clients({ d }: { d: Dict }) {
  const list = (d.clients.names ?? []).filter((n) => typeof n === 'string' && n.trim());
  if (!list.length) return null;
  const reps = Math.max(1, Math.ceil(MIN_PER_GROUP / list.length));
  const group = Array.from({ length: reps }, () => list).flat();
  const secs = Math.max(20, group.length * 3.2);
  return (
    <section className="clients" aria-label={d.clients.label}>
      <div className="wrap clients__in">
        <p className="clients__label">{d.clients.label}{d.clients.note && <span className={d.clients.note.includes('[') ? 'ph-inline' : 'clients__note'}>{d.clients.note}</span>}</p>
        <div className="marquee">
          <div className="marquee__track" style={{ ['--dur' as string]: secs + 's' }}>
            {[0, 1].map((g) => (
              <ul key={g} className="marquee__group" aria-hidden={g === 1 ? true : undefined}>
                {group.map((n, i) => (<li key={i} aria-hidden={g === 1 || i >= list.length ? true : undefined}>{n}</li>))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
