import SectionHead from './SectionHead';

/* «كلير أب لا تناسبك إذا… / وتناسبك إذا…» (from their content file, Nov 8, 2026): two facing columns right before
   the closing «book a call» — it filters out the wrong clients and reassures the right ones. Text from the admin. */
type Data = { index?: string; eyebrow?: string; title?: string; lead?: string; noTitle?: string; no?: string[]; yesTitle?: string; yes?: string[]; anchor?: string };

export default function Fit({ s }: { s: Data }) {
  const no = (s.no ?? []).filter(Boolean);
  const yes = (s.yes ?? []).filter(Boolean);
  if (!no.length && !yes.length) return null;
  return (
    <section className="fit section" id="fit">
      <div className="wrap">
        <SectionHead index={s.index} eyebrow={s.eyebrow} title={s.title} lead={s.lead} />
        <div className="fit__cols">
          {no.length > 0 && (
            <div className="fit__col fit__col--no" data-reveal>
              {s.noTitle && <h3>{s.noTitle}</h3>}
              <ul>{no.map((x, i) => <li key={i}><span className="fit__ic" aria-hidden="true">×</span>{x}</li>)}</ul>
            </div>
          )}
          {yes.length > 0 && (
            <div className="fit__col fit__col--yes" data-reveal>
              {s.yesTitle && <h3>{s.yesTitle}</h3>}
              <ul>{yes.map((x, i) => <li key={i}><span className="fit__ic" aria-hidden="true">✓</span>{x}</li>)}</ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
