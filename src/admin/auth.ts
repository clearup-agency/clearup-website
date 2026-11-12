import 'server-only';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { lockoutAfterFailure, type AttemptState } from './lockout';
import { readSession, signSession } from './session';

export const COOKIE = 'cu_admin';
const SESSION_DAYS = 7;

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET || '';
  if (s.length < 32) throw new Error('ADMIN_SESSION_SECRET must be set (32+ random characters)');
  return s;
}
const SESSION_MS = SESSION_DAYS * 864e5;

export type Admin = { id: number; email: string; name: string | null };

/** The signed-in admin, or null. Checks the cookie AND that the user still exists with the same session version. */
export async function currentAdmin(): Promise<Admin | null> {
  let s: { uid: number; sv: number } | null = null;
  try {
    s = readSession((await cookies()).get(COOKIE)?.value, secret());
  } catch {
    return null;
  }
  if (!s) return null;
  const [u] = await db().select().from(schema.adminUsers).where(eq(schema.adminUsers.id, s.uid)).limit(1);
  if (!u || u.sessionVersion !== s.sv) return null;
  return { id: u.id, email: u.email, name: u.name };
}

/** For admin pages and actions: the admin, or a redirect to the login page. */
export async function requireAdmin(): Promise<Admin> {
  const a = await currentAdmin();
  if (!a) redirect('/admin/login/');
  return a;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'local').trim();
}

async function getAttempt(key: string): Promise<AttemptState | null> {
  const [r] = await db().select().from(schema.loginAttempts).where(eq(schema.loginAttempts.key, key)).limit(1);
  return r ? { fails: r.fails, firstFailAt: r.firstFailAt.getTime(), lockedUntil: r.lockedUntil?.getTime() ?? null } : null;
}
async function saveAttempt(key: string, st: AttemptState) {
  const v = { fails: st.fails, firstFailAt: new Date(st.firstFailAt), lockedUntil: st.lockedUntil ? new Date(st.lockedUntil) : null };
  await db().insert(schema.loginAttempts).values({ key, ...v }).onConflictDoUpdate({ target: schema.loginAttempts.key, set: v });
}

// a real bcrypt hash of a random string: unknown emails take as long to check as real ones
const DUMMY_HASH = '$2b$12$6SJgtCGohHQfw.coY9SU8Ok3ltNwmKWouGTXv7wLIXdAShiNJgg52';

export type LoginResult = { ok: true } | { ok: false; error: string; lockedMinutes?: number };

export async function login(emailRaw: string, password: string): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !password) return { ok: false, error: 'اكتب الإيميل وكلمة المرور.' };
  const keys = ['email:' + email, 'ip:' + (await clientIp())];
  const now = Date.now();
  for (const k of keys) {
    const a = await getAttempt(k);
    if (a?.lockedUntil && a.lockedUntil > now) {
      const m = Math.ceil((a.lockedUntil - now) / 60000);
      return { ok: false, error: `محاولات خاطئة كثيرة. الدخول مقفل مؤقتاً، جرّب بعد ${m} دقيقة.`, lockedMinutes: m };
    }
  }
  const [u] = await db().select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email)).limit(1);
  const good = await bcrypt.compare(password, u?.passwordHash ?? DUMMY_HASH);
  if (!u || !good) {
    let locked = 0;
    for (const k of keys) {
      const st = lockoutAfterFailure(await getAttempt(k), now, k.startsWith('ip:') ? 20 : 5);
      await saveAttempt(k, st);
      if (st.lockedUntil) locked = Math.max(locked, Math.ceil((st.lockedUntil - now) / 60000));
    }
    if (locked) return { ok: false, error: `محاولات خاطئة كثيرة. الدخول مقفل مؤقتاً، جرّب بعد ${locked} دقيقة.`, lockedMinutes: locked };
    return { ok: false, error: 'الإيميل أو كلمة المرور غير صحيحة.' };
  }
  await db().delete(schema.loginAttempts).where(sql`${schema.loginAttempts.key} = ${keys[0]}`);
  await db().update(schema.adminUsers).set({ lastLoginAt: new Date() }).where(eq(schema.adminUsers.id, u.id));
  (await cookies()).set(COOKIE, signSession(u.id, u.sessionVersion, secret(), SESSION_MS), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400,
  });
  return { ok: true };
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}

/** Change the signed-in admin's password: checks the current one, signs out every other session. */
export async function changePassword(current: string, next: string): Promise<{ ok?: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (next.length < 10) return { error: 'كلمة المرور الجديدة يجب أن تكون 10 أحرف على الأقل.' };
  if (next.length > 200) return { error: 'كلمة المرور طويلة جداً.' };
  const [u] = await db().select().from(schema.adminUsers).where(eq(schema.adminUsers.id, admin.id)).limit(1);
  if (!u || !(await bcrypt.compare(current, u.passwordHash))) return { error: 'كلمة المرور الحالية غير صحيحة.' };
  const sv = u.sessionVersion + 1;
  await db().update(schema.adminUsers).set({ passwordHash: await bcrypt.hash(next, 12), sessionVersion: sv }).where(eq(schema.adminUsers.id, u.id));
  (await cookies()).set(COOKIE, signSession(u.id, sv, secret(), SESSION_MS), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400,
  });
  return { ok: true };
}
