import { Fragment } from 'react';

// Rich text stored as simple blocks (the same shape the old CMS used): paragraphs, sub-headings,
// quotes and bullet/number lists, with bold / italic / links inside a line.
type Span = { _key?: string; text?: string; marks?: string[] };
export type Block = {
  _key?: string; _type?: string; style?: string; listItem?: 'bullet' | 'number';
  children?: Span[]; markDefs?: { _key: string; _type?: string; href?: string }[];
};

function Line({ b }: { b: Block }) {
  return (
    <>
      {(b.children ?? []).map((sp, i) => {
        let el: React.ReactNode = sp.text ?? '';
        for (const m of sp.marks ?? []) {
          if (m === 'strong') el = <strong>{el}</strong>;
          else if (m === 'em') el = <em>{el}</em>;
          else {
            const def = b.markDefs?.find((d) => d._key === m);
            if (def?.href) el = <a href={def.href}>{el}</a>;
          }
        }
        return <Fragment key={sp._key ?? i}>{el}</Fragment>;
      })}
    </>
  );
}

export default function RichText({ blocks }: { blocks: Block[] }) {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.listItem) {
      const kind = b.listItem;
      const items: Block[] = [];
      while (i < blocks.length && blocks[i].listItem === kind) items.push(blocks[i++]);
      i--;
      const Tag = kind === 'number' ? 'ol' : 'ul';
      out.push(<Tag key={b._key ?? i}>{items.map((it, j) => <li key={it._key ?? j}><Line b={it} /></li>)}</Tag>);
    } else if (b.style === 'h3') out.push(<h3 key={b._key ?? i}><Line b={b} /></h3>);
    else if (b.style === 'blockquote') out.push(<blockquote key={b._key ?? i}><Line b={b} /></blockquote>);
    else out.push(<p key={b._key ?? i}><Line b={b} /></p>);
  }
  return <>{out}</>;
}
