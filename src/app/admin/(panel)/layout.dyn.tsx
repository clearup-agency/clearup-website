import Link from 'next/link';
import { requireAdmin } from '@/admin/auth';
import { logoutAction } from '@/admin/actions';
import { IcEye, IcHistory, IcImage, IcLayers, IcOut, IcUser, MarkLight } from '@/admin/ui/icons';
import NavLinks from '@/admin/ui/NavLinks';

export const dynamic = 'force-dynamic';

export default async function Panel({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <header className="bar">
        <div className="bar__in">
          <Link href="/admin/" className="brand"><MarkLight /> CLEAR UP <small>لوحة التحكم</small></Link>
          <NavLinks className="nav" />
          <div className="bar__end">
            <Link className="btn btn--ghost" href="/admin/"><IcEye /> <span className="hide-sm">تعديل الموقع</span></Link>
            <form action={logoutAction}>
              <button className="btn btn--ghost" title="تسجيل الخروج"><IcOut /> <span className="hide-sm">خروج</span></button>
            </form>
          </div>
        </div>
      </header>
      {children}
      <NavLinks className="tabsnav" icons={{ sections: <IcLayers />, stories: <IcImage />, backup: <IcHistory />, account: <IcUser /> }} />
    </>
  );
}
