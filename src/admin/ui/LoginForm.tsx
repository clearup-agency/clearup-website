'use client';
import { useActionState, useState } from 'react';
import { loginAction } from '@/admin/actions';

export default function LoginForm({ setupError }: { setupError?: string }) {
  const [state, action, pending] = useActionState(loginAction, {} as { error?: string });
  const [show, setShow] = useState(false);
  return (
    <main className="login">
      <form className="login__box" action={action}>
        <div className="login__logo"><img src="/brand/clearup-logo.svg" alt="Clear Up" width={237} height={40} /></div>
        <h1>تسجيل الدخول</h1>
        <p className="sub">لوحة تحكم موقع ClearUp</p>
        {setupError && <div className="alert alert--bad" role="alert">{setupError}</div>}
        {state?.error && <div className="alert alert--bad" role="alert">{state.error}</div>}
        <div className="fld">
          <label htmlFor="email">الإيميل</label>
          <input id="email" name="email" type="email" className="inp" dir="ltr" autoComplete="username" required autoFocus />
        </div>
        <div className="fld">
          <label htmlFor="password">كلمة المرور</label>
          <div className="pw">
            <input id="password" name="password" type={show ? 'text' : 'password'} className="inp" dir="ltr" autoComplete="current-password" required />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>{show ? 'إخفاء' : 'إظهار'}</button>
          </div>
        </div>
        <button className="btn btn--lg btn--block" disabled={pending}>{pending ? 'جارٍ الدخول…' : 'دخول'}</button>
      </form>
    </main>
  );
}
