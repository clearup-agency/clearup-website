import crypto from 'node:crypto';

// The admin's sign-in cookie: base64url(JSON {uid, sv, exp}) + "." + HMAC-SHA256 with ADMIN_SESSION_SECRET.
// `sv` (session version) changes when the password is reset, which signs out every old cookie.
const hmac = (data: string, secret: string) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

export function signSession(uid: number, sv: number, secret: string, ttlMs: number, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ uid, sv, exp: now + ttlMs })).toString('base64url');
  return body + '.' + hmac(body, secret);
}

export function readSession(value: string | undefined, secret: string, now = Date.now()): { uid: number; sv: number } | null {
  if (!value) return null;
  const [body, sig, extra] = value.split('.');
  if (!body || !sig || extra !== undefined) return null;
  const want = hmac(body, secret);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof p.uid !== 'number' || typeof p.exp !== 'number' || p.exp < now) return null;
    return { uid: p.uid, sv: typeof p.sv === 'number' ? p.sv : 1 };
  } catch {
    return null;
  }
}
