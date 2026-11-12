import { eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';

// Images stored in the database (when Cloudinary isn't set up). Each file is immutable, so the CDN keeps
// it for a year — visitors don't reach the database.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  const { id } = await params;
  const [m] = await db().select().from(schema.media).where(eq(schema.media.id, id)).limit(1);
  if (!m || !m.bytes) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(m.bytes), {
    headers: {
      'Content-Type': m.mime,
      'Content-Length': String(m.bytes.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ...(m.mime === 'image/svg+xml' ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" } : {}),
    },
  });
}
