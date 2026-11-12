'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { restoreVersion } from '@/admin/actions';
import { Confirm, useToast } from './Toast';
import { IcDownload, IcUpload } from './icons';

type V = { id: number; at: string; userEmail: string | null; action: string; detail: string | null };
const ACTION: Record<string, string> = {
  edit: 'تعديل قسم', settings: 'تعديل الإعدادات', hide: 'إخفاء قسم', show: 'إظهار قسم', reorder: 'تغيير الترتيب', add: 'إضافة قسم',
  duplicate: 'نسخ قسم', delete: 'حذف قسم', import: 'استيراد نسخة', restore: 'استرجاع نسخة', seed: 'تحميل المحتوى الأولي', publish: 'نشر من المحرر',
};
const fmt = (s: string) => new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' }).format(new Date(s));

export default function BackupPanel({ versions, storage }: { versions: V[]; storage: 'cloudinary' | 'db' }) {
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ kind: 'import'; json: unknown; name: string } | { kind: 'restore'; v: V } | null>(null);
  const [busy, setBusy] = useState(false);
  const { show, node } = useToast();

  async function readFile(f?: File | null) {
    if (!f) return;
    try {
      const json = JSON.parse(await f.text());
      setPending({ kind: 'import', json, name: f.name });
    } catch {
      show('الملف ليس نسخة احتياطية صالحة (JSON)', 'bad');
    }
    if (file.current) file.current.value = '';
  }
  async function confirmIt() {
    if (!pending) return;
    const p = pending;
    setPending(null); setBusy(true);
    let r: { ok: boolean; error?: string };
    if (p.kind === 'import') {
      r = await fetch('/api/admin/backup/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p.json) })
        .then((x) => x.json()).catch(() => ({ ok: false, error: 'تعذّر الاتصال' }));
    } else r = await restoreVersion(p.v.id);
    setBusy(false);
    show(r.ok ? 'تمت الاستعادة ونُشر الموقع ✓' : r.error || 'لم تتم الاستعادة', r.ok ? 'ok' : 'bad');
    router.refresh();
  }

  return (
    <main className="page">
      <div className="ph"><div><h1>النسخ الاحتياطي</h1><p>احفظ نسخة من كل محتوى الموقع على جهازك، أو ارجع لأي نسخة سابقة.</p></div></div>
      <section className="card">
        <h2>نسخة على جهازك</h2>
        <p style={{ marginTop: 0, color: 'var(--mut)' }}>ملف واحد فيه كل النصوص والإعدادات وترتيب الأقسام{storage === 'db' ? ' والصور المرفوعة' : ' (الصور نفسها محفوظة على Cloudinary)'}. يُنصح بتنزيل نسخة قبل أي تغيير كبير، ومرة كل شهر.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a className="btn btn--lg" href="/api/admin/backup/" download><IcDownload /> تنزيل نسخة احتياطية</a>
          <button className="btn btn--lg btn--ghost" onClick={() => file.current?.click()} disabled={busy}><IcUpload /> {busy ? 'جارٍ الاستعادة…' : 'استعادة من ملف'}</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => readFile(e.target.files?.[0])} />
        </div>
      </section>
      <section className="card">
        <h2>سجل التغييرات</h2>
        <p style={{ marginTop: 0, color: 'var(--mut)' }}>كل تغيير يحفظ شكل الموقع <b>قبله</b>. «رجوع لما قبل هذا» يعيد الموقع كما كان قبل ذلك التغيير.</p>
        {versions.length ? (
          <ul className="vers">
            {versions.map((v) => (
              <li key={v.id}>
                <span className="v__t"><b>{ACTION[v.action] ?? v.action}</b><small>{fmt(v.at)} · {v.userEmail}</small></span>
                <button className="btn btn--ghost" onClick={() => setPending({ kind: 'restore', v })} disabled={busy}>رجوع لما قبل هذا</button>
              </li>
            ))}
          </ul>
        ) : <p className="empty">لا توجد تغييرات بعد.</p>}
      </section>
      {pending && (
        <Confirm title={pending.kind === 'import' ? 'استعادة الموقع من هذا الملف؟' : 'الرجوع لهذه النسخة؟'} okLabel="نعم، استعد"
          text={(pending.kind === 'import' ? `سيُستبدل كل محتوى الموقع بمحتوى «${pending.name}». ` : `سيعود الموقع كما كان قبل «${ACTION[pending.v.action] ?? pending.v.action}» (${fmt(pending.v.at)}). `) + 'المحتوى الحالي يُحفظ في السجل أولاً، فيمكنك التراجع.'}
          onOk={confirmIt} onCancel={() => setPending(null)} />
      )}
      {node}
    </main>
  );
}
