'use client';
import { useEffect } from 'react';

/* Google Analytics 4 (Nov 15, 2026). Public pages only — the admin (/admin) and its live preview have their own
   layouts and are never counted. The ID is NEXT_PUBLIC_GA_ID (netlify.toml, production only: deploy previews and
   local copies send nothing), and the script runs only on the official domain.
   Besides page views (and GA's own scroll / outbound-link / video counts), it records the actions that matter:
   a WhatsApp, e-mail or phone link pressed (whatsapp_click, email_click, phone_click) and a sent contact form
   (generate_lead, from Final.tsx through track()). */
export const GA_ID = (process.env.NEXT_PUBLIC_GA_ID || '').trim();
const VALID = /^G-[A-Z0-9]{4,20}$/.test(GA_ID);
const OFFICIAL = /(^|\.)clearupagency\.com$/;

type Gtag = (...a: unknown[]) => void;
/** Records one event (no-op when Analytics is off). */
export function track(name: string, params: Record<string, unknown> = {}) {
  const g = (globalThis as { gtag?: Gtag }).gtag;
  if (typeof g === 'function') g('event', name, { page_path: location.pathname, ...params });
}

export default function Analytics() {
  useEffect(() => {
    if (!VALID || !OFFICIAL.test(location.hostname)) return;
    // Google's tag, added once after the page is up (the same as gtag.js's own snippet)
    const w = window as unknown as { dataLayer: unknown[]; gtag?: Gtag };
    if (!w.gtag) {
      w.dataLayer = w.dataLayer || [];
      // eslint-disable-next-line prefer-rest-params
      w.gtag = function gtag() { w.dataLayer.push(arguments); };
      w.gtag('js', new Date());
      w.gtag('config', GA_ID);
      const sc = document.createElement('script');
      sc.async = true;
      sc.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      document.head.appendChild(sc);
    }
    const click = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(href)) track('whatsapp_click', { link_text: a.textContent?.trim().slice(0, 60) || a.getAttribute('aria-label') || '' });
      else if (href.startsWith('mailto:')) track('email_click');
      else if (href.startsWith('tel:')) track('phone_click');
    };
    document.addEventListener('click', click, { capture: true });
    return () => document.removeEventListener('click', click, { capture: true });
  }, []);
  return null;
}
