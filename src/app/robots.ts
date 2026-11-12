import type { MetadataRoute } from 'next';
import { abs, isIndexable, SITE_URL } from '@/lib/seo';

// /robots.txt — closed («Disallow: /») for every crawler until SEO_INDEXABLE=true on the official domain
// (see src/lib/seo.ts). Once open: search engines and the AI assistants' crawlers are named and allowed
// explicitly (GEO: being read and cited by ChatGPT, Perplexity, Claude, Gemini, Bing/Copilot), the admin,
// API and editor preview stay closed to all.
export const dynamic = 'force-static';

export const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'Bingbot'];
const PRIVATE = ['/admin', '/admin/', '/api/', '/preview/'];

export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [
      { userAgent: AI_BOTS, allow: '/', disallow: PRIVATE },
      { userAgent: '*', allow: '/', disallow: PRIVATE },
    ],
    sitemap: abs('/sitemap.xml'),
    host: SITE_URL,
  };
}
