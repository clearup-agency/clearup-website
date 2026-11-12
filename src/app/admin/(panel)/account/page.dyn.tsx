import { requireAdmin } from '@/admin/auth';
import AccountPanel from '@/admin/ui/AccountPanel';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const admin = await requireAdmin();
  return <AccountPanel email={admin.email} />;
}
