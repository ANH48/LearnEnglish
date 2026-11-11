// Login rate limit kept in the account row, so it works on serverless
// where in-memory counters do not survive between requests.

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

export function isLoginLocked(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil > now;
}

/**
 * Called with the counter value returned by an atomic `increment: 1` update,
 * so parallel wrong guesses each count. Returns when the lock ends, or null
 * while the account has tries left.
 */
export function lockUntilAfterFailure(failedLoginCount: number, now: Date): Date | null {
  if (failedLoginCount < MAX_FAILED_LOGINS) return null;
  return new Date(now.getTime() + LOCK_MINUTES * 60_000);
}
