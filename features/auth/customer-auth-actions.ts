"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { accountFields } from "@/features/accounts/account-schemas";
import { passwordLogin } from "@/lib/auth/password-login";
import { hashPassword } from "@/lib/auth/password-hashing";
import { readSession, startSession } from "@/lib/auth/session-cookies";
import { db } from "@/lib/db";
import { type ActionState, isUniqueViolation, validationFailed } from "@/lib/forms/action-state";
import { safeNextPath } from "@/lib/forms/safe-next-path";
import { loginSchema } from "./login-schema";


export async function customerLoginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Hãy nhập email và mật khẩu." };

  const error = await passwordLogin("customer", parsed.data.email, parsed.data.password);
  if (error) return { error };
  redirect(safeNextPath(formData.get("next")));
}

const registerSchema = z.object({
  email: accountFields.email,
  fullName: accountFields.fullName,
  password: accountFields.password,
});

/** Learner self sign-up. Joining a course still needs a teacher's approval. */
export async function registerCustomerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    password: formData.get("password"),
  });
  if (!parsed.success) return validationFailed(parsed.error);
  if (await readSession("staff")) {
    return { error: "Bạn đang đăng nhập bằng tài khoản quản trị. Hãy đăng xuất trước." };
  }

  let customer;
  try {
    customer = await db.customer.create({
      data: {
        email: parsed.data.email,
        fullName: parsed.data.fullName,
        passwordHash: await hashPassword(parsed.data.password),
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "Email này đã có tài khoản. Hãy đăng nhập." };
    throw error;
  }

  await startSession({ sub: customer.id, kind: "customer", tv: customer.tokenVersion });
  redirect(safeNextPath(formData.get("next")));
}
