/** The one section header used by every section (Nov 8, 2026 — one component per job): the small number + eyebrow
 *  line, the title and the lead, each only when it has text. `dark` = on a dark section (lavender meta, yellow number). */
export default function SectionHead({ index, eyebrow, title, lead, dark = false, id }: { index?: string; eyebrow?: string; title?: string; lead?: string; dark?: boolean; id?: string }) {
  if (!index && !eyebrow && !title && !lead) return null;
  return (
    <header className={'shead' + (dark ? ' shead--dark' : '')} data-reveal>
      {(index || eyebrow) && <p className="shead__meta">{index && <span className="shead__idx">{index}</span>}{eyebrow && <bdi>{eyebrow}</bdi>}</p>}
      {title && <h2 className="h2" id={id}>{title}</h2>}
      {lead && <p className="shead__lead">{lead}</p>}
    </header>
  );
}
