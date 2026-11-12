'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

/** An internal link that is fetched ahead (prefetch, so the next page opens at once) and shows it was pressed:
 *  a pressed look on touch and a small spinner until the next page appears (phones can take a moment). */
export default function PressLink({ href, className = '', children, label }: { href: string; className?: string; children: React.ReactNode; label?: string }) {
  const [busy, setBusy] = useState(false);
  // back/forward cache: never come back to a spinning link
  useEffect(() => {
    const off = () => setBusy(false);
    window.addEventListener('pageshow', off);
    return () => window.removeEventListener('pageshow', off);
  }, []);
  return (
    <Link href={href} prefetch className={'plink ' + className + (busy ? ' is-busy' : '')} aria-label={label} aria-busy={busy || undefined}
      onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; setBusy(true); }}>
      {children}
      <span className="plink__spin" aria-hidden="true" />
    </Link>
  );
}
