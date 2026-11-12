import { LOGO_ARROW, LOGO_BACK, LOGO_FRONT } from '@/lib/logo';
// The ClearUp mark as inline SVG (crisp, 0 requests). Never mirrored in RTL.
// Logo colours are fixed on purpose (brand asset): the CMS colour tokens change buttons/accents, not the logo.
// To change the logo, upload one in «إعدادات الموقع» → الشعار.
export default function Mark({ size = 28, className = '', title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg className={'logo-mark ' + className} width={size} height={size} viewBox="0 0 131 131" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path d={LOGO_BACK} fill="#8750A5" />
      <path d={LOGO_FRONT} fill="#5C2096" />
      <path d={LOGO_ARROW} fill="#fff" />
    </svg>
  );
}
export function Arrow({ className = '' }: { className?: string }) {
  // the up-right arrow — the site's one motion word
  return (
    <svg className={'arrow ' + className} width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M3 11 L11 3 M5 3 H11 V9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
    </svg>
  );
}
