import type { Metadata } from 'next';
import { LANGS, type Lang } from '@/content';
import type { Raw } from '@/lib/cms';

/* Technical SEO in one place. Everything is keyed off two env vars, so going live on the official
   domain = change them in the host's settings and redeploy (README → «Going live on the official domain»):
     NEXT_PUBLIC_SITE_URL  the public address, e.g. https://clearupagency.com (no trailing slash)
     SEO_INDEXABLE         "true" only on the official domain. Anything else → robots.txt "Disallow: /"
                           and <meta name="robots" content="noindex"> on every page, so a preview copy
                           (*.vercel.app, *.netlify.app, *.sites.tab.bot) never gets indexed as a duplicate. */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

const PREVIEW_HOST = /(\.vercel\.app|\.netlify\.app|\.pages\.dev|\.sites\.tab\.bot)$/i;

/** true only when SEO_INDEXABLE=true AND the site URL is not a preview host (and not a Vercel preview build). */
export function isIndexable(): boolean {
  if (process.env.SEO_INDEXABLE !== 'true') return false;
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') return false;
  try {
    return !PREVIEW_HOST.test(new URL(SITE_URL).hostname);
  } catch {
    return false;
  }
}

export const abs = (path: string) => (/^https?:\/\//.test(path) ? path : SITE_URL + (path.startsWith('/') ? path : '/' + path));

/** "/ar/" style path for a language + optional page slug (the site uses trailing slashes). */
export const langPath = (lang: Lang, slug?: string) => `/${lang}/${slug && slug !== 'home' ? slug + '/' : ''}`;

/** hreflang map for a page: ar, en and x-default (Arabic is the main language). */
export const languageAlternates = (slug?: string) => ({
  ...Object.fromEntries(LANGS.map((l) => [l, langPath(l, slug)])),
  'x-default': langPath('ar', slug),
});

export const OG_LOCALE: Record<Lang, string> = { ar: 'ar_AR', en: 'en_US' };
/** Default branded share images (1200×630), used when the admin hasn't uploaded one in «محركات البحث». */
export const defaultOgImage = (lang: Lang) => `/brand/og-${lang}.jpg`;

const FALLBACK = {
  title: { ar: 'ClearUp — للرؤساء التنفيذيين الشجعان فقط', en: 'ClearUp — For Courageous CEOs Only' },
  description: {
    ar: 'كلير أب شركة تطوير أعمال وتسويق ابتكاري. نساعد الشركات الصغيرة والمتوسطة والمؤسسات التنموية على تحويل الأفكار والتمويل إلى نمو حقيقي قابل للقياس.',
    en: 'Clear Up is an innovative marketing and business development company. We help SMEs and development organizations turn ideas and funding into real, measurable growth.',
  },
};

/** Full metadata for one page in one language (title, description, canonical, hreflang, Open Graph, Twitter). */
export function pageMetadata(lang: Lang, s: Raw, opts: { slug?: string; title?: string; description?: string } = {}): Metadata {
  const siteTitle: string = s.metaTitle || FALLBACK.title[lang];
  const title = opts.title ? `${opts.title} — ClearUp` : siteTitle;
  const description: string = opts.description || s.metaDescription || FALLBACK.description[lang];
  const path = langPath(lang, opts.slug);
  const image = s.ogImage?.src || defaultOgImage(lang);
  const imageAlt = s.ogImage?.alt || siteTitle;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path, languages: languageAlternates(opts.slug) },
    openGraph: {
      type: 'website',
      siteName: 'ClearUp',
      url: path,
      title,
      description,
      locale: OG_LOCALE[lang],
      alternateLocale: LANGS.filter((l) => l !== lang).map((l) => OG_LOCALE[l]),
      images: [{ url: image, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [{ url: image, alt: imageAlt }] },
  };
}

/** Organization + WebSite structured data — only facts the admin entered in «إعدادات الموقع». */
export function jsonLd(lang: Lang, s: Raw) {
  const org = SITE_URL + '/#organization';
  const sameAs = Array.from(
    new Set([...(s.socials ?? []).map((x: Raw) => x?.url), s.instagram].filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u))),
  );
  const wa = typeof s.whatsapp === 'string' && /^[0-9]{8,15}$/.test(s.whatsapp) ? s.whatsapp : '';
  const city = typeof s.city === 'string' ? s.city.split(/[،,]/).map((x: string) => x.trim()).filter(Boolean) : [];
  const logo = s.logo?.src ? abs(s.logo.src) : abs('/brand/logo-512.png');
  const contactPoint = wa || s.email
    ? [{
        '@type': 'ContactPoint',
        contactType: 'customer service',
        ...(wa ? { telephone: '+' + wa, url: 'https://wa.me/' + wa } : {}),
        ...(s.email ? { email: s.email } : {}),
        availableLanguage: ['ar', 'en'],
      }]
    : undefined;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Organization', 'ProfessionalService'],
        '@id': org,
        name: 'ClearUp',
        alternateName: s.brandName && s.brandName !== 'ClearUp' ? s.brandName : undefined,
        url: abs(langPath(lang)),
        logo: { '@type': 'ImageObject', url: logo },
        image: abs(s.ogImage?.src || defaultOgImage(lang)),
        description: s.metaDescription || FALLBACK.description[lang],
        ...(s.email ? { email: s.email } : {}),
        ...(wa ? { telephone: '+' + wa } : {}),
        ...(city.length ? { address: { '@type': 'PostalAddress', addressLocality: city[0], ...(city[1] ? { addressCountry: city[city.length - 1] } : {}) } } : {}),
        ...(sameAs.length ? { sameAs } : {}),
        ...(contactPoint ? { contactPoint } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': SITE_URL + '/#website',
        url: abs(langPath(lang)),
        name: 'ClearUp',
        inLanguage: lang,
        publisher: { '@id': org },
      },
    ],
  };
}
