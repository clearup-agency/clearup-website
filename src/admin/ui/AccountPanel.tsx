'use client';
import { useActionState, useEffect, useRef } from 'react';
import { changePasswordAction } from '@/admin/actions';

export default function AccountPanel({ email }: { email: string }) {
  const [state, action, pending] = useActionState(changePasswordAction, {} as { error?: string; ok?: boolean });
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) form.current?.reset(); }, [state]);
  return (
    <main className="page">
      <div className="ph"><div><h1>الحساب</h1><p>أنت داخل بـ <bdi dir="ltr">{email}</bdi></p></div></div>
      <form className="card" action={action} ref={form} style={{ maxWidth: 520 }}>
        <h2>تغيير كلمة المرور</h2>
        {state?.error && <div className="alert alert--bad" role="alert">{state.error}</div>}
        {state?.ok && <div className="alert alert--ok" role="status">تم تغيير كلمة المرور ✓ (أي جهاز آخر داخل للوحة خرج تلقائياً)</div>}
        <div className="fld"><label htmlFor="cur">كلمة المرور الحالية</label><input id="cur" name="current" type="password" className="inp" dir="ltr" autoComplete="current-password" required /></div>
        <div className="fld"><label htmlFor="nw">كلمة المرور الجديدة<span className="desc">10 أحرف على الأقل — جملة طويلة أسهل للحفظ وأقوى</span></label><input id="nw" name="next" type="password" className="inp" dir="ltr" autoComplete="new-password" minLength={10} required /></div>
        <div className="fld"><label htmlFor="ag">أعد كتابة الجديدة</label><input id="ag" name="again" type="password" className="inp" dir="ltr" autoComplete="new-password" minLength={10} required /></div>
        <button className="btn btn--lg" disabled={pending}>{pending ? 'جارٍ الحفظ…' : 'تغيير كلمة المرور'}</button>
      </form>
    </main>
  );
}
