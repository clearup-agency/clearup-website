import { editorState } from '@/admin/store';
import LiveEditor from '@/admin/ui/LiveEditor';

export const dynamic = 'force-dynamic';

// The admin's one main screen: the site live on the left, sections + site settings on the right.
export default async function EditorPage({ searchParams }: { searchParams: Promise<{ s?: string; tab?: string }> }) {
  const { s, tab } = await searchParams;
  const st = await editorState(); // checks the session first (else → login)
  const sel = typeof s === 'string' && (st.draft ?? st.published).sections.some((x) => x.id === s) ? s : null;
  return <LiveEditor published={st.published} draft={st.draft} initialSelected={sel} initialTab={tab === 'settings' ? 'settings' : tab === 'history' ? 'history' : 'sections'} version={st.version} />;
}
