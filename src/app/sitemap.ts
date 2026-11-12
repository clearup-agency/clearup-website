import type { MetadataRoute } from 'next';
import { LANGS } from '@/content';
import { fetchSitemapData } from '@/lib/cms';
import { abs, langPath } from '@/lib/seo';

// /sitemap.xml — every page in Arabic and English, each with its hreflang twins (ar, en, x-default).
// Refreshed with the content (the admin's «حفظ ونشر» clears the "content" cache tag) and at most hourly.
export const revalidate = 3600;
export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { settingsUpdated, pages } = await fetchSitemapData();
  const ordered = [...pages].sort((a, b) => (a.slug === 'home' ? -1 : b.slug === 'home' ? 1 : a.slug.localeCompare(b.slug)));
  return ordered.flatMap((p) => {
    const times = [p.updated, settingsUpdated].filter(Boolean).map((t) => new Date(t as string).getTime());
    const lastModified = times.length ? new Date(Math.max(...times)) : new Date();
    const languages = {
      ...Object.fromEntries(LANGS.map((l) => [l, abs(langPath(l, p.slug))])),
      'x-default': abs(langPath('ar', p.slug)),
    };
    return LANGS.map((lang) => ({
      url: abs(langPath(lang, p.slug)),
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: p.slug === 'home' ? 1 : 0.7,
      alternates: { languages },
    }));
  });
}
