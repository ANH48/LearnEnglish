import "server-only";
import { db } from "@/lib/db";
import { isLoginLocked, lockUntilAfterFailure } from "./login-throttle";
import { hashPassword, verifyPassword } from "./password-hashing";
import { readSession, startSession } from "./session-cookies";
import { type AccountKind, otherKind } from "./session-constants";

type LoginAccount = {
  id: string;
  passwordHash: string;
  status: "active" | "locked";
  tokenVersion: number;
  lockedUntil: Date | null;
};

const SELECT = { id: true, passwordHash: true, status: true, tokenVersion: true, lockedUntil: true } as const;

// The staff and learner tables have the same login columns; these adapters let
// one sign-in routine serve both without ever mixing the two tables.
const ACCOUNTS: Record<
  AccountKind,
  {
    find(email: string): Promise<LoginAccount | null>;
    countFailure(id: string): Promise<number>;
    setThrottle(id: string, failedLoginCount: number, lockedUntil: Date | null): Promise<unknown>;
  }
> = {
  staff: {
    find: (email) => db.staff.findFirst({ where: { email, deletedAt: null }, select: SELECT }),
    countFailure: async (id) =>
      (await db.staff.update({ where: { id }, data: { failedLoginCount: { increment: 1 } }, select: { failedLoginCount: true } })).failedLoginCount,
    setThrottle: (id, failedLoginCount, lockedUntil) => db.staff.update({ where: { id }, data: { failedLoginCount, lockedUntil } }),
  },
  customer: {
    find: (email) => db.customer.findFirst({ where: { email, deletedAt: null }, select: SELECT }),
    countFailure: async (id) =>
      (await db.customer.update({ where: { id }, data: { failedLoginCount: { increment: 1 } }, select: { failedLoginCount: true } })).failedLoginCount,
    setThrottle: (id, failedLoginCount, lockedUntil) => db.customer.update({ where: { id }, data: { failedLoginCount, lockedUntil } }),
  },
};

// One message for "no such account", "wrong password" and "temporarily locked",
// so the form cannot be used to find out which emails have accounts.
const WRONG_CREDENTIALS =
  "Email hoặc mật khẩu không đúng, hoặc tài khoản đang tạm khóa do nhập sai nhiều lần. Hãy thử lại sau 15 phút.";

const OTHER_SESSION: Record<AccountKind, string> = {
  staff: "Bạn đang đăng nhập bằng tài khoản học viên. Hãy đăng xuất trước.",
  customer: "Bạn đang đăng nhập bằng tài khoản quản trị. Hãy đăng xuất trước.",
};

/** Checks the password and starts a session. Returns an error message, or null on success. */
export async function passwordLogin(kind: AccountKind, email: string, password: string): Promise<string | null> {
  // One browser holds one session: sign out of the other area first.
  if (await readSession(otherKind(kind))) return OTHER_SESSION[kind];

  const accounts = ACCOUNTS[kind];
  const account = await accounts.find(email);
  const now = new Date();
  if (!account || isLoginLocked(account.lockedUntil, now)) {
    await hashPassword(password); // spend the same time as a real check
    return WRONG_CREDENTIALS;
  }

  if (!(await verifyPassword(account.passwordHash, password))) {
    // Atomic increment: parallel wrong guesses cannot all read the same count.
    const lockedUntil = lockUntilAfterFailure(await accounts.countFailure(account.id), now);
    if (lockedUntil) await accounts.setThrottle(account.id, 0, lockedUntil);
    return WRONG_CREDENTIALS;
  }

  if (account.status !== "active") return "Tài khoản đã bị khóa.";

  await accounts.setThrottle(account.id, 0, null);
  await startSession({ sub: account.id, kind, tv: account.tokenVersion });
  return null;
}
