import { storiesState } from '@/admin/actions';
import StoriesPage from '@/admin/ui/StoriesPage';

export const dynamic = 'force-dynamic';

// «العملاء»: one screen per client — works (stories), «رأي العميل», «قصة المشروع» — with one «حفظ ونشر».
export default async function Stories() {
  const st = await storiesState(); // checks the session first (else → login)
  return <StoriesPage sections={st.sections} live={st.live} primary={st.primary} cases={st.cases as never} />;
}
