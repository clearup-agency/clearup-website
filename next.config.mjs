import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

// Two build modes:
//  • default (npm run build / start): full Next.js server build — content from Postgres with on-demand
//    revalidation and the Arabic admin panel at /admin. Host on Vercel / Netlify / any Node host.
//  • STATIC_EXPORT=1 (npm run build:static, build:preview): plain static HTML in out/ — homepage only, no admin,
//    content baked in at build time (from the database if DATABASE_URL is set, else seed/content.json).
const STATIC = process.env.STATIC_EXPORT === '1';
// Thmanyah Sans files are git-ignored (licence: no redistribution) — record which ones this build has
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const THMANYAH_FILES = ['Regular', 'Medium', 'Bold', 'Black']
  .filter((w) => existsSync(path.join(ROOT, 'public/fonts/thmanyah', `thmanyahsans-${w}.woff2`))).join(',');
// the live site must ship Thmanyah (deployed from a local tree that has the files): say so loudly if a
// production build doesn't have them, instead of quietly falling back to IBM Plex Sans Arabic
if (!THMANYAH_FILES && process.env.VERCEL_ENV === 'production') {
  console.warn('\n⚠  Thmanyah Sans files are missing from public/fonts/thmanyah/ — this production build will use the fallback font (IBM Plex Sans Arabic).\n');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(STATIC ? { output: 'export' } : process.env.STANDALONE === '1' ? { output: 'standalone' } : {}),
  ...(STATIC ? { typescript: { tsconfigPath: 'tsconfig.static.json' } } : {}),
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  // files named *.dyn.ts(x) are server-only routes (the admin and its API): left out of the static export
  // files named *.static.tsx are their static-export-only counterparts
  pageExtensions: STATIC ? ['tsx', 'ts', 'static.tsx'] : ['tsx', 'ts', 'dyn.tsx', 'dyn.ts'],
  ...(STATIC ? {} : {
    redirects: async () => [{ source: '/', destination: '/ar/', permanent: false }],
    // the admin: never framed (clickjacking), never cached, never indexed
    headers: async () => [...['/admin/:path*', '/api/admin/:path*'].map((source) => ({
      source,
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'same-origin' },
        { key: 'Cache-Control', value: 'no-store' },
        { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      ],
    })),
    // the live editor's preview: framed only by our own /admin page
    {
      source: '/preview/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'same-origin' },
        { key: 'Cache-Control', value: 'no-store' },
        { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      ],
    }],
  }),
  // the site's own 404 for addresses outside /ar/ and /en/ (src/app/global-not-found.tsx)
  ...(STATIC ? {} : { experimental: { globalNotFound: true } }),
  env: { STATIC_EXPORT: STATIC ? '1' : '', THMANYAH_FILES },
};
export default nextConfig;
