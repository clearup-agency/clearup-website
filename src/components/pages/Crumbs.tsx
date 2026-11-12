import type { Crumb } from '@/lib/view';

/** Breadcrumbs on inner pages (their BreadcrumbList structured data is in the page's graph, src/lib/geo.ts). */
export default function Crumbs({ items }: { items: Crumb[] }) {
  if (!items.length) return null;
  return (
    <nav className="crumbs wrap" aria-label="breadcrumb">
      <ol>
        {items.map((c, i) => (
          <li key={i} data-f={c.f} data-rec-story={c.rec} data-rec-case={c.rec}>{c.href ? <a href={c.href}>{c.label}</a> : <span aria-current="page">{c.label}</span>}</li>
        ))}
      </ol>
    </nav>
  );
}
