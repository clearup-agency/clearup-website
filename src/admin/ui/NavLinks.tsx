'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { key: 'sections', href: '/admin/', label: 'تعديل الموقع', match: (p: string) => p === '/admin/' },
  { key: 'stories', href: '/admin/stories/', label: 'العملاء', match: (p: string) => p.startsWith('/admin/stories') },
  { key: 'backup', href: '/admin/backup/', label: 'نسخة احتياطية', match: (p: string) => p.startsWith('/admin/backup') },
  { key: 'account', href: '/admin/account/', label: 'الحساب', match: (p: string) => p.startsWith('/admin/account') },
] as const;

export default function NavLinks({ className, icons }: { className: string; icons?: Record<string, React.ReactNode> }) {
  const p = usePathname() || '/admin/';
  const path = p.endsWith('/') ? p : p + '/';
  return (
    <nav className={className} aria-label="أقسام اللوحة">
      {LINKS.map((l) => (
        <Link key={l.key} href={l.href} aria-current={l.match(path) ? 'page' : undefined}>
          {icons?.[l.key]}{l.label}
        </Link>
      ))}
    </nav>
  );
}
