/* The words the site shows when a field was never written (Nov 9, 2026 — Mohamed: «بدي تعديل لكل اشي حرفياً»).
   The components keep these same words as their fallback; the live editor opens with them filled in (store.ts
   withDefaults), so every one of them shows in the panel, is found by a click on the preview, and reaches the
   database on the next «نشر» — the site looks exactly the same until someone changes one. */

import { NEW_COPY } from '@/lib/pages';

type L = { ar: string; en: string };
const ls = (ar: string, en: string) => ({ _type: 'localeString', ar, en });
const lt = (ar: string, en: string) => ({ _type: 'localeText', ar, en });

export const SETTINGS_DEFAULTS: Record<string, unknown> = {
  footerBook: ls('احجز مكالمة مجانية', 'Book a free call'),
  footerWa: ls('تواصل على واتساب', 'Chat on WhatsApp'),
  footerWaShort: ls('واتساب', 'WhatsApp'),
  langSwitch: ls('EN', 'عربي'),
  homeLabel: ls('الرئيسية', 'Home'),
  // the client page's headings («قصة عميل», «التحدي»…)
  ...Object.fromEntries(Object.entries(NEW_COPY.caseLabels).map(([k, v]) => ['caseLabels.' + k, v])),
};

/** Per section type: field path (dots for nested objects) → its default. */
export const SECTION_DEFAULTS: Record<string, Record<string, unknown>> = {
  proofSection: {
    fullStory: ls('القصة كاملة', 'The full story'),
    lblChallenge: ls('التحدي', 'The challenge'),
    lblSolution: ls('الحل', 'What we did'),
    lblResult: ls('النتيجة', 'The result'),
    lblPage: ls('صفحة العميل', 'Client page'),
    lblClose: ls('إغلاق', 'Close'),
    allTestimonials: ls('شوف كل الآراء', 'See all testimonials'),
  },
  offeringsSection: {
    incl: ls('تشمل', 'Includes'),
    fit: ls('تناسب', 'Best for'),
    proof: ls('من شغلنا', 'Proof'),
  },
  finalCtaSection: {
    'fields.email': ls('الإيميل', 'Email'),
    'fields.message': ls('رسالتك', 'Your message'),
    sending: ls('جاري الإرسال…', 'Sending…'),
    success: lt('وصل طلبك، رح نتواصل معك قريباً', 'Got it — we’ll be in touch soon.'),
    error: lt('تعذّر إرسال رسالتك الآن. راسلنا مباشرة على واتساب وسنرد عليك.', 'We couldn’t send your message right now. Message us on WhatsApp instead and we’ll reply.'),
    errorWhatsapp: ls('أرسلها على واتساب', 'Send it on WhatsApp'),
  },
};

const empty = (v: unknown) => v === undefined || v === null || v === '' ||
  (typeof v === 'object' && !Array.isArray(v) && ('ar' in (v as object) || 'en' in (v as object)) && !String((v as L).ar ?? '').trim() && !String((v as L).en ?? '').trim());

/** `data` with every missing default filled in (a copy; what is written is never replaced). */
export function fillDefaults(data: Record<string, unknown>, defs: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!defs) return data;
  let out = data;
  for (const [path, def] of Object.entries(defs)) {
    const keys = path.split('.');
    let cur: any = out;
    for (const k of keys.slice(0, -1)) cur = cur && typeof cur === 'object' ? cur[k] : undefined;
    const last = keys[keys.length - 1];
    if (!empty(cur?.[last])) continue;
    if (out === data) out = structuredClone(data);
    let at: any = out;
    for (const k of keys.slice(0, -1)) { if (!at[k] || typeof at[k] !== 'object') at[k] = {}; at = at[k]; }
    at[last] = structuredClone(def);
  }
  return out;
}
