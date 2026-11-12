import { redirect } from 'next/navigation';
import { currentAdmin } from '@/admin/auth';
import LoginForm from '@/admin/ui/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  let setupError = '';
  try {
    if (await currentAdmin()) redirect('/admin/');
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e;
    setupError = !process.env.DATABASE_URL ? 'قاعدة البيانات غير مربوطة (DATABASE_URL).' : 'تعذّر الاتصال بقاعدة البيانات. جرّب بعد لحظات.';
  }
  if (!process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.length < 32) setupError ||= 'إعداد ناقص على السيرفر: ADMIN_SESSION_SECRET.';
  return <LoginForm setupError={setupError} />;
}
