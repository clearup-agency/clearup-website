'use client';
import { useRef } from 'react';
import { Arrow } from './Mark';

/* «القصة كاملة» on a testimonial card (Nov 8, 2026 — Mohamed: the card shows one short line; the whole story opens
   on demand). A native <dialog>: Esc, the × and a tap outside the panel close it; focus returns to the button. */
type Props = {
  label: string; labelField?: string; labelFid?: string; close: string; client: string; who?: string;
  parts: { h: string; p: string; sol?: boolean }[];
  page?: { href: string; label: string } | null;
};
export default function StoryMore({ label, labelField, labelFid, close, client, who, parts, page }: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  const shut = () => dlg.current?.close();
  return (
    <>
      <button type="button" className="link tvcard__go" data-f={labelField} data-fid={labelField ? labelFid : undefined} onClick={() => dlg.current?.showModal()} aria-haspopup="dialog">{label}<Arrow /></button>
      <dialog ref={dlg} className="tstory" aria-label={label + ' — ' + client}
        onClick={(e) => { if (e.target === e.currentTarget) shut(); }}>
        <div className="tstory__in">
          <header className="tstory__head">
            <p><b>{client}</b>{who && <span>{who}</span>}</p>
            <button type="button" className="tstory__x" onClick={shut} aria-label={close}>×</button>
          </header>
          {parts.map((x, i) => (
            <div key={i} className={'tstory__part' + (x.sol ? ' tstory__part--sol' : '')}><h3>{x.h}</h3><p>{x.p}</p></div>
          ))}
          {page && <a className="btn tstory__page" href={page.href}>{page.label}<span className="btn__ic"><Arrow /></span></a>}
        </div>
      </dialog>
    </>
  );
}
