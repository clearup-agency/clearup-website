import './globals.css';
import type { Metadata } from 'next';
import ThmanyahHead from '@/components/ThmanyahHead';
import NotFoundView from '@/components/NotFoundView';

// Any address outside /ar/ and /en/ (e.g. /something): the same 404 as inside the site (next.config.mjs →
// experimental.globalNotFound; the server build only)
export const metadata: Metadata = { title: '404 — ClearUp', robots: { index: false, follow: false } };

export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <head><ThmanyahHead /></head>
      <body><NotFoundView first="ar" /></body>
    </html>
  );
}
