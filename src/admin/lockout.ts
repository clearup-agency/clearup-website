// Lockout rule, kept pure so it can be tested: after `max` wrong passwords within 15 minutes,
// sign-in is blocked for 15 minutes (per email: 5 tries; per IP address: 20).
export type AttemptState = { fails: number; firstFailAt: number; lockedUntil: number | null };
export const WINDOW_MS = 15 * 60 * 1000;
export const LOCK_MS = 15 * 60 * 1000;

export function lockoutAfterFailure(prev: AttemptState | null, now: number, max = 5): AttemptState {
  const fresh = !prev || now - prev.firstFailAt > WINDOW_MS || (prev.lockedUntil !== null && prev.lockedUntil <= now);
  const fails = fresh ? 1 : prev!.fails + 1;
  const firstFailAt = fresh ? now : prev!.firstFailAt;
  return { fails, firstFailAt, lockedUntil: fails >= max ? now + LOCK_MS : null };
}
