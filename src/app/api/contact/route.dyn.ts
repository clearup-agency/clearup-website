import { NextResponse } from 'next/server';
import { fetchRaw } from '@/lib/cms';
import { db, isDbConfigured, schema } from '@/db/client';
import { handleContact, makeLimiter } from '@/lib/contact';

/* POST /api/contact — the «احجز مكالمة» form → an email to the admin (see src/lib/contact.ts).
   The receiving address is read from the published site settings — one small query per message sent
   (never per page view), so a changed address applies to the very next message — else env CONTACT_TO. */

export const dynamic = 'force-dynamic';
const limiter = makeLimiter(5, 10, 90); // per visitor: 5 an hour, 10 a day; whole site: 90 a day (Resend free: 100/day)

function sameSite(req: Request) {
  const o = req.headers.get('origin');
  if (!o) return true;
  try { return new URL(o).host === (req.headers.get('x-forwarded-host') ?? req.headers.get('host')); } catch { return false; }
}

async function receivingAddress(): Promise<string | undefined> {
  const pick = (data: unknown) => {
    const v = (data as Record<string, unknown> | null | undefined)?.contactTo;
    return typeof v === 'string' ? v : undefined;
  };
  if (isDbConfigured()) {
    try {
      const rows = await db().select({ data: schema.siteSettings.data }).from(schema.siteSettings).limit(1);
      return pick(rows[0]?.data);
    } catch (err) {
      console.error('[contact] could not read site settings from the database:', (err as Error).message);
    }
  }
  try { return pick((await fetchRaw()).settings); } catch { return undefined; }
}

export async function POST(req: Request) {
  const headers = { 'cache-control': 'no-store' };
  if (!sameSite(req)) return NextResponse.json({ ok: false, reason: 'forbidden' }, { status: 403, headers });
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > 20_000) return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 413, headers });
  const body = await req.json().catch(() => null);
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'anon';
  const contactTo = await receivingAddress();
  const r = await handleContact(body, { ip, env: process.env, contactTo, limiter });
  return NextResponse.json(r.body, { status: r.status, headers });
}
