import NotFoundView from '@/components/NotFoundView';

// /ar/… or /en/… that doesn't exist (an unknown client page, a mistyped address): the site's own 404 in both
// languages, inside the site's layout (html lang/dir from the address; on /en/ the English block comes first — CSS)
export default function NotFound() {
  return <NotFoundView first="ar" />;
}
