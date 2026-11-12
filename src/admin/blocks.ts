// Rich text ↔ plain text for the admin's simple text box.
// Blank line = new paragraph · "## " sub-heading · "> " quote · "- " bullet · "1. " numbered item.
import type { Block } from '@/components/RichText';

const key = () => 'k' + Math.random().toString(16).slice(2, 12);

export function textToBlocks(text: string): Block[] {
  const out: Block[] = [];
  const mk = (t: string, extra: Partial<Block> = {}): Block => ({ _type: 'block', _key: key(), style: 'normal', markDefs: [], children: [{ _key: key(), text: t, marks: [] }], ...extra });
  for (const para of text.replace(/\r/g, '').split(/\n\s*\n/)) {
    const lines = para.split('\n').filter((l) => l.trim());
    if (!lines.length) continue;
    if (lines.every((l) => /^\s*[-•]\s+/.test(l))) lines.forEach((l) => out.push(mk(l.replace(/^\s*[-•]\s+/, ''), { listItem: 'bullet', level: 1 } as Partial<Block>)));
    else if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) lines.forEach((l) => out.push(mk(l.replace(/^\s*\d+[.)]\s+/, ''), { listItem: 'number', level: 1 } as Partial<Block>)));
    else if (/^##\s+/.test(lines[0]) && lines.length === 1) out.push(mk(lines[0].replace(/^##\s+/, ''), { style: 'h3' }));
    else if (lines.every((l) => /^>\s?/.test(l))) out.push(mk(lines.map((l) => l.replace(/^>\s?/, '')).join('\n'), { style: 'blockquote' }));
    else out.push(mk(lines.join('\n')));
  }
  return out;
}

export function blocksToText(blocks: Block[] | undefined): string {
  if (!Array.isArray(blocks)) return '';
  const parts: string[] = [];
  let n = 0;
  blocks.forEach((b, i) => {
    const t = (b.children ?? []).map((c) => c.text ?? '').join('');
    const prev = blocks[i - 1];
    const sameList = prev && prev.listItem && prev.listItem === b.listItem;
    if (b.listItem === 'bullet') { parts.push((sameList ? '\n' : '\n\n') + '- ' + t); return; }
    if (b.listItem === 'number') { n = sameList ? n + 1 : 1; parts.push((sameList ? '\n' : '\n\n') + n + '. ' + t); return; }
    const p = b.style === 'h3' ? '## ' + t : b.style === 'blockquote' ? t.split('\n').map((l) => '> ' + l).join('\n') : t;
    parts.push('\n\n' + p);
  });
  return parts.join('').trim();
}
