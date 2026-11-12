import type { SiteLinks } from '@/lib/dict';
/** The ClearUp logo. Uses the uploaded logo from «إعدادات الموقع» when there is one, else the company's own
 *  vector logo (mark + «CLEAR UP» wordmark, from their logo file, Nov 8, 2026): purple on light, white on the dark
 *  footer (`xl`). One small cached SVG file each — no wordmark typed in a font any more. */
export const LOGO_RATIO = 776 / 131;
export default function Brand({ site, size, xl = false }: { site: SiteLinks; size: number; xl?: boolean }) {
  if (site.logo?.src) {
    return (
      <>
        <img className="logo-mark logo-mark--img" src={site.logo.src} alt="" height={size} style={{ height: size, width: 'auto' }} />
        {site.brandName && <span className={'brand__word' + (xl ? ' brand__word--xl' : '')}>{site.brandName}</span>}
      </>
    );
  }
  return (
    <img className={'logo-full' + (xl ? ' logo-full--xl' : '')} src={xl ? '/brand/clearup-logo-white.svg' : '/brand/clearup-logo.svg'}
      alt="Clear Up" width={Math.round(size * LOGO_RATIO)} height={size} decoding="async" />
  );
}
