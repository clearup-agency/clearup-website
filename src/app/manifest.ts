import type { MetadataRoute } from 'next';

// /manifest.webmanifest — name, icons and the ClearUp purple for "Add to Home Screen".
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ClearUp',
    short_name: 'ClearUp',
    description: 'Clear Up — Business development & innovative marketing · شركة تطوير أعمال وتسويق ابتكاري',
    start_url: '/ar/',
    scope: '/',
    display: 'browser',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#F5F7FA',
    theme_color: '#5B2096',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/brand/mark.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
}
