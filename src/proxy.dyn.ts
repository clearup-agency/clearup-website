import { NextResponse, type NextRequest } from 'next/server';

/* Nov 15, 2026: an address that is not under /ar/ or /en/ (e.g. /test-123/) matched the [lang] segment, whose
   layout calls notFound() — and a layout's notFound() has no boundary above it, so Next.js showed its plain black
   «404 This page could not be found». Here such an address is rewritten (same URL in the bar) to an unknown page
   under /ar/, which renders the site's own 404 (src/app/[lang]/not-found.tsx, Arabic + English) with status 404.
   Server build only (*.dyn.ts). Known prefixes, files (a dot in the path) and Next.js internals never get here. */
export function proxy(req: NextRequest) {
  return NextResponse.rewrite(new URL('/ar/__not-found__/', req.url));
}

export const config = {
  matcher: ['/((?!(?:ar|en|admin|api|preview|media-db|_next|\\.netlify)(?:/|$))(?![^?]*\\.)[^/?]+.*)'],
};
