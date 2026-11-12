import { redirect } from 'next/navigation';
import { requireAdmin } from '@/admin/auth';

export const dynamic = 'force-dynamic';

// Site settings live in the editor's right panel now («إعدادات الموقع»).
export default async function SettingsPage() {
  await requireAdmin();
  redirect('/admin/?tab=settings');
}
