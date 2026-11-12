import { redirect } from 'next/navigation';
import { requireAdmin } from '@/admin/auth';

export const dynamic = 'force-dynamic';

// Sections are edited in the live editor now; old links open it with that section selected.
export default async function SectionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  redirect(`/admin/?s=${encodeURIComponent(id)}`);
}
