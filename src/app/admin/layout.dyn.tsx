import type { Metadata, Viewport } from 'next';
import '@/admin/admin.css';
import ThmanyahHead from '@/components/ThmanyahHead';

// The admin panel's own page shell: Arabic, right-to-left, never indexed by search engines.
export const metadata: Metadata = {
  title: 'لوحة تحكم ClearUp',
  robots: { index: false, follow: false },
  icons: { icon: '/brand/mark.svg' },
};
export const viewport: Viewport = { themeColor: '#5B2096', width: 'device-width', initialScale: 1 };

export default async function AdminRoot({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <ThmanyahHead preload={['Regular', 'Bold']} />
      </head>
      <body className="adm">{children}</body>
    </html>
  );
}
