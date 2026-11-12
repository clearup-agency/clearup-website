import { isPlaceholder } from '@/lib/pages';

/** A text that may still be a [placeholder]: visitors never see a placeholder (nothing renders); the admin's
 *  preview shows it striped with «يظهر للزوار بعد التعبئة». */
export function Ph({ v, preview, as: Tag = 'span', className }: { v: unknown; preview: boolean; as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'li' | 'blockquote' | 'strong'; className?: string }) {
  const s = typeof v === 'string' ? v : '';
  if (!isPlaceholder(s)) return <Tag className={className}>{s}</Tag>;
  if (!preview || !s.trim()) return null;
  return <Tag className={(className ? className + ' ' : '') + 'ph-admin'} title="يظهر للزوار بعد التعبئة">{s}</Tag>;
}
export const show = (v: unknown, preview: boolean) => (typeof v === 'string' && v.trim() && (!isPlaceholder(v) || preview));
