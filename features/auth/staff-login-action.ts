"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { isLoginLocked, lockUntilAfterFailure } from "@/lib/auth/login-throttle";
import { hashPassword, verifyPassword } from "@/lib/auth/password-hashing";
import { readSession, startSession } from "@/lib/auth/session-cookies";
import type { ActionState } from "@/lib/forms/action-state";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
});

// One message for "no such account", "wrong password" and "temporarily locked",
// so the form cannot be used to find out which emails are staff accounts.
const WRONG_CREDENTIALS: ActionState = {
  error: "Email hoặc mật khẩu không đúng, hoặc tài khoản đang tạm khóa do nhập sai nhiều lần. Hãy thử lại sau 15 phút.",
};

export async function staffLoginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return WRONG_CREDENTIALS;
  const { email, password } = parsed.data;

  // One browser holds one session: a learner must sign out before using /admin.
  if (await readSession("customer")) {
    return { error: "Bạn đang đăng nhập bằng tài khoản học viên. Hãy đăng xuất trước." };
  }

  const staff = await db.staff.findFirst({ where: { email, deletedAt: null } });
  if (!staff) {
    await hashPassword(password); // spend the same time as a real check
    return WRONG_CREDENTIALS;
  }

  const now = new Date();
  if (isLoginLocked(staff.lockedUntil, now)) {
    await hashPassword(password); // same timing as the other failure paths
    return WRONG_CREDENTIALS;
  }

  if (!(await verifyPassword(staff.passwordHash, password))) {
    // Atomic increment: parallel wrong guesses cannot all read the same count.
    const { failedLoginCount } = await db.staff.update({
      where: { id: staff.id },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });
    const lockedUntil = lockUntilAfterFailure(failedLoginCount, now);
    if (lockedUntil) {
      await db.staff.update({ where: { id: staff.id }, data: { failedLoginCount: 0, lockedUntil } });
    }
    return WRONG_CREDENTIALS;
  }

  if (staff.status !== "active") return { error: "Tài khoản đã bị khóa." };

  await db.staff.update({
    where: { id: staff.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });
  await startSession({ sub: staff.id, kind: "staff", tv: staff.tokenVersion });
  redirect("/admin");
}
