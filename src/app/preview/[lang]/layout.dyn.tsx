import type { Metadata } from 'next';
import '../../globals.css';
import ThmanyahHead from '@/components/ThmanyahHead';

// The live editor's preview (inside /admin): the real site components, fed the admin's draft from the editor
// window. Only for a signed-in admin, never indexed, framed only by our own /admin page.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'معاينة — ClearUp', robots: { index: false, follow: false } };

export default async function PreviewLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const lang = (await params).lang === 'en' ? 'en' : 'ar';
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <head>
        <ThmanyahHead />
      </head>
      <body className="cu-preview">{children}</body>
    </html>
  );
}
