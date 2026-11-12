import type { Dict } from '@/lib/dict';
// Marks where a figure comes from: their current site (needs confirming), their Instagram, or a placeholder.
// Shown in the admin's preview only: visitors never see these working notes.
export default function SrcTag({ src, d }: { src: string; d: Dict }) {
  if (!d.preview) return null;
  if (src === 'site') return <sup className="src src--site" title={d.results.srcSite}>{d.lang === 'ar' ? 'من موقعهم*' : 'their site*'}</sup>;
  if (src === 'ig') return <sup className="src src--ig" title={d.results.srcIg}>IG</sup>;
  if (src === 'ph') return <sup className="src src--ph" title={d.results.ph}>{d.lang === 'ar' ? 'فارغ' : 'blank'}</sup>;
  return null;
}
