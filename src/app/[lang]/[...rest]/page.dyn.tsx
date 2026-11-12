import { notFound } from 'next/navigation';

// any other address under /ar/ or /en/ → the site's 404 (src/app/[lang]/not-found.tsx), inside the site's layout
export default function Unknown(): never {
  notFound();
}
