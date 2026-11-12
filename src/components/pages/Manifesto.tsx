import type { Raw } from '@/lib/view';
import { filled } from '@/lib/pages';

/** About: «للرؤساء التنفيذيين الشجعان فقط» and the lines ClearUp stands by — a dark (near-black) band since Nov 8, 2026
 *  (Mohamed), the kicker in the yellow accent (yellow lives only on dark sections). */
export default function Manifesto({ s }: { s: Raw }) {
  const lines: string[] = (s.lines ?? []).filter(filled);
  if (!filled(s.kicker) && !lines.length) return null;
  return (
    <section className="mani mani--dark section">
      <div className="wrap">
        {filled(s.kicker) && <p className="mani__k" data-reveal>{s.kicker}</p>}
        <ol className="mani__lines">{lines.map((l, i) => <li key={i} data-reveal>{l}</li>)}</ol>
      </div>
    </section>
  );
}
