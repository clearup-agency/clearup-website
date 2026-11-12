import type { Metadata } from 'next';
import SitePage, { asLang, siteMetadata } from '@/components/SitePage';

// Pre-rendered; refreshed the moment the admin presses «نشر» (revalidateTag), and at most hourly otherwise.
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return siteMetadata(asLang((await params).lang), 'work');
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <SitePage lang={asLang((await params).lang)} page="work" />;
}
