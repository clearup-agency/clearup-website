import Link from 'next/link';

/** The 404 page, in the site's style, in Arabic and English (whichever language the visitor came from). */
export default function NotFoundView({ first = 'ar' }: { first?: 'ar' | 'en' }) {
  const ar = (
    <div className="nf__block" lang="ar" dir="rtl" key="ar">
      {first === 'ar' ? <h1>هذه الصفحة غير موجودة.</h1> : <h2>هذه الصفحة غير موجودة.</h2>}
      <p>ربما تغيّر الرابط أو حُذفت الصفحة. ابدأ من هنا:</p>
      <p className="nf__links">
        <Link className="btn" href="/ar/">الرئيسية</Link>
        <Link className="btn btn--ghost" href="/ar/work/">أعمالنا</Link>
        <Link className="btn btn--ghost" href="/ar/contact/">احجز مكالمة مجانية</Link>
      </p>
    </div>
  );
  const en = (
    <div className="nf__block nf__block--en" lang="en" dir="ltr" key="en">
      {first === 'en' ? <h1>This page doesn’t exist.</h1> : <h2>This page doesn’t exist.</h2>}
      <p>The link may have changed or the page was removed. Start here:</p>
      <p className="nf__links">
        <Link className="btn" href="/en/">Home</Link>
        <Link className="btn btn--ghost" href="/en/work/">Our work</Link>
        <Link className="btn btn--ghost" href="/en/contact/">Book a free call</Link>
      </p>
    </div>
  );
  return (
    <main className="nf">
      <title>{first === 'en' ? '404 — Page not found · ClearUp' : '404 — الصفحة غير موجودة · ClearUp'}</title>
      <div className="nf__card">
        <a className="nf__brand brand" href={'/' + first + '/'} aria-label="ClearUp"><img className="logo-full" src="/brand/clearup-logo.svg" alt="Clear Up" width={237} height={40} /></a>
        <p className="nf__code" aria-hidden="true">404</p>
        {first === 'ar' ? [ar, en] : [en, ar]}
      </div>
    </main>
  );
}
