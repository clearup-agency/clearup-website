import { editorState } from '@/admin/store';
import PreviewFrame from '@/admin/ui/PreviewFrame';

export const dynamic = 'force-dynamic';

export default async function PreviewPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang === 'en' ? 'en' : 'ar';
  const s = await editorState(); // also checks the admin session (else → login)
  return <PreviewFrame lang={lang} initial={s.draft ?? s.published} />;
}
