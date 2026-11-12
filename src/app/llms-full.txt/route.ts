import { fetchRaw } from '@/lib/cms';
import { llmsFullTxt } from '@/lib/llms';
import { isIndexable } from '@/lib/seo';

// /llms-full.txt — generated from the published content (src/lib/llms.ts); refreshed on «نشر» and at most hourly.
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  const body = llmsFullTxt(await fetchRaw());
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // a preview copy stays out of every index, like the pages (SEO_INDEXABLE, src/lib/seo.ts)
      ...(isIndexable() ? {} : { 'X-Robots-Tag': 'noindex' }),
    },
  });
}
