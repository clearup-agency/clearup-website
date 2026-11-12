import { listVersions } from '@/admin/actions';
import BackupPanel from '@/admin/ui/BackupPanel';
import { cloudinary } from '@/admin/media';

export const dynamic = 'force-dynamic';

export default async function BackupPage() {
  const versions = (await listVersions(40)).map((v) => ({ ...v, at: v.at.toISOString() }));
  return <BackupPanel versions={versions} storage={cloudinary() ? 'cloudinary' : 'db'} />;
}
