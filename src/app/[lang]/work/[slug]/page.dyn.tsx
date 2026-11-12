// Server build: every case study is pre-rendered at build time; one added later in the admin is rendered
// on its first visit and cached (ISR), and «نشر» refreshes them all. The page itself: components/CaseStudyRoute.tsx
export const revalidate = 3600;
export const dynamicParams = true;
export { default, generateStaticParams, generateMetadata } from '@/components/CaseStudyRoute';
