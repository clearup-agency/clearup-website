'use client';
import { useEffect, useMemo, useState } from 'react';
import { saveStories } from '@/admin/actions';
import { PAGE_INFO, isPageId } from '@/lib/pages';
import StoriesManager, { slugFor, type StoryClient } from './StoriesManager';
import { useToast } from './Toast';

type Sec = { id: string; page: string; idx: number; data: Record<string, unknown>; hidden: boolean };
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
const pageName = (p: string) => (isPageId(p) ? PAGE_INFO[p].title : p);

export default function StoriesPage({ sections: given, live: live0, primary, cases = [] }: { sections: Sec[]; live: Record<string, string>; primary?: string | null; cases?: StoryClient[] }) {
  // the older case studies no client claims yet are listed with the main section's clients (one list of clients);
  // unchanged, they cost nothing — saved with the list only when it is saved
  const [sections] = useState(() => given.map((x) => (x.id === primary && cases.length ? { ...x, data: { ...x.data, clients: [...((x.data.clients ?? []) as StoryClient[]), ...cases] } } : x)));
  const startCases = useMemo(() => {
    const p = sections.find((x) => x.id === primary);
    return ((p?.data.clients ?? []) as StoryClient[]).map((c) => c.caseKey).filter((k): k is string => !!k);
  }, [sections, primary]);
  const [secs, setSecs] = useState(sections);
  const [saved, setSaved] = useState(() => Object.fromEntries(sections.map((s) => [s.id, { clients: s.data.clients ?? [], mirror: !!s.data.mirror }])));
  const [live, setLive] = useState(live0);
  // the home page's section first; a «same clients as the first» (mirror) section has nothing of its own to edit
  const [cur, setCur] = useState(sections.find((s) => !s.data.mirror)?.id ?? sections[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const { show, node } = useToast();
  const s = secs.find((x) => x.id === cur);
  const clients = (s?.data.clients ?? []) as StoryClient[];
  const dirtyIds = useMemo(() => secs.filter((x) => !same(x.data.clients, saved[x.id]?.clients) || !!x.data.mirror !== saved[x.id]?.mirror).map((x) => x.id), [secs, saved]);
  const dirty = dirtyIds.length > 0;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const setData = (id: string, patch: Record<string, unknown>) => { setJustSaved(false); setSecs((xs) => xs.map((x) => (x.id === id ? { ...x, data: { ...x.data, ...patch } } : x))); };

  async function save(force = false) {
    setBusy(true); setConflict(false);
    try {
      for (const id of dirtyIds) {
        const x = secs.find((y) => y.id === id)!;
        // every client gets its page address once (from its English name), unique on the list
        const used = new Set<string>();
        const clients = ((x.data.clients ?? []) as StoryClient[]).map((c) => {
          const base = slugFor(c); let sl = base, n = 2;
          while (used.has(sl)) sl = `${base}-${n++}`;
          used.add(sl);
          return sl === c.slug ? c : { ...c, slug: sl };
        });
        // an older case study deleted from the list stops showing on the site
        let removed: string[] | undefined;
        if (x.id === primary) {
          const now = new Set(clients.map((c) => c.caseKey).filter(Boolean));
          const before = Array.isArray(x.data.removedCases) ? (x.data.removedCases as string[]) : [];
          removed = [...new Set([...before, ...startCases.filter((k) => !now.has(k))])].filter((k) => !now.has(k));
        }
        const r = await saveStories(x.id, x.page, x.idx, clients, !!x.data.mirror, live[x.id] ?? '', force, removed);
        if (r.conflict) { setConflict(true); setBusy(false); return; }
        if (!r.ok) { show(r.error || 'ما انحفظ، جرّب مرة ثانية', 'bad'); setBusy(false); return; }
        setLive((l) => ({ ...l, [x.id]: r.live ?? '' }));
        setSaved((sv) => ({ ...sv, [x.id]: { clients, mirror: !!x.data.mirror } }));
        setSecs((xs) => xs.map((y) => (y.id === x.id ? { ...y, data: { ...y.data, clients, ...(removed ? { removedCases: removed } : {}) } } : y)));
      }
      setJustSaved(true);
      show('تم الحفظ والنشر ✓ بيظهر على الموقع خلال ثوانٍ', 'ok');
    } catch { show('انقطع الاتصال. تأكد من الإنترنت وجرّب مرة ثانية.', 'bad'); }
    setBusy(false);
  }

  if (!secs.length) {
    return (
      <main className="sp">
        <div className="sp-top"><h1>العملاء</h1></div>
        <p className="sp-note">قسم الستوري مش موجود بالموقع. من «تعديل الموقع» اضغط «+ إضافة قسم» واختر «أعمال العملاء (ستوري)»، وبعدها ارجع هون.</p>
      </main>
    );
  }
  const others = secs.length > 1;
  return (
    <main className="sp">
      <div className="sp-top">
        <h1>العملاء</h1>
        <p>كل عميل إله 3 أجزاء: <b>الأعمال</b> (بتظهر بالستوري)، <b>رأي العميل</b> (فيديو + جملة قصيرة، بقسم «عملاؤنا يحكون»)، و<b>قصة المشروع</b> (بصفحته). عبّي اللي بدك، الفاضي ما بيظهر، وبعدين «حفظ ونشر».</p>
      </div>
      {others && (
        <div className="sp-pages" role="group" aria-label="في أي صفحة">
          {secs.map((x) => (
            <button key={x.id} type="button" aria-pressed={x.id === cur} onClick={() => setCur(x.id)}>
              صفحة {pageName(x.page)}{dirtyIds.includes(x.id) ? ' •' : ''}
            </button>
          ))}
        </div>
      )}
      {s?.hidden && <p className="sp-note">تنبيه: هذا القسم مخفي حالياً عن الزوار. أظهره من «تعديل الموقع».</p>}
      {s && s.idx > 0 && (
        <label className="sm-f" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="checkbox" checked={!!s.data.mirror} onChange={(e) => setData(s.id, { mirror: e.target.checked })} style={{ width: 22, height: 22 }} />
          <span>اعرض هنا نفس عملاء الصفحة الرئيسية (بدون ما تدخلهم مرتين)</span>
        </label>
      )}
      {s && (s.data.mirror && s.idx > 0
        ? <p className="sp-note">هذه الصفحة بتعرض نفس عملاء الصفحة الرئيسية. لتعديلهم اختر «صفحة {pageName(secs[0].page)}».</p>
        : <StoriesManager key={s.id} value={clients} onChange={(v) => setData(s.id, { clients: v })} />)}

      {conflict && (
        <div className="modal" onClick={() => setConflict(false)}>
          <div className="modal__box" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>في تعديل ثاني على الستوري</h2>
            <p>حدا عدّل أعمال العملاء من جهاز أو نافذة ثانية بعد ما فتحت هذه الصفحة. إذا نشرت الآن، تعديلك بيحل محل تعديله.</p>
            <div className="modal__acts">
              <button type="button" className="btn" onClick={() => location.reload()}>حدّث الصفحة وشوف التعديل الثاني</button>
              <button type="button" className="btn btn--danger" onClick={() => save(true)}>انشر تعديلي على كل حال</button>
            </div>
          </div>
        </div>
      )}
      <div className="sp-save">
        <div className="sp-save__in">
          <span className={'sp-save__st' + (dirty ? ' dirty' : justSaved ? ' ok' : '')} role="status" aria-live="polite">
            {busy ? 'جارٍ الحفظ والنشر…' : dirty ? 'في تغييرات غير منشورة' : justSaved ? 'منشور على الموقع ✓' : 'كل شي منشور'}
          </span>
          <button type="button" className="btn" onClick={() => save()} disabled={busy || !dirty}>{busy ? '…' : 'حفظ ونشر'}</button>
        </div>
      </div>
      {node}
    </main>
  );
}
