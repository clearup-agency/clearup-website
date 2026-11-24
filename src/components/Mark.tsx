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

/** The mark in one colour (Nov 24, 2026: the hero's eyebrow sign, «كلها باللون الموف»): both shapes in the
 *  current colour, the arrow cut out so the background shows through it. */
export function MarkMono({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={'logo-mark logo-mark--mono ' + className} width={size} height={size} viewBox="0 0 131 131" aria-hidden="true">
      <defs>
        <mask id="mark-mono-cut">
          <rect width="131" height="131" fill="#fff" />
          <path d={LOGO_ARROW} fill="#000" />
        </mask>
      </defs>
      <g mask="url(#mark-mono-cut)" fill="currentColor">
        <path d={LOGO_BACK} opacity=".72" />
        <path d={LOGO_FRONT} />
      </g>
    </svg>
  );
}
