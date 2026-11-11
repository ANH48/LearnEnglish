"use server";

import { redirect } from "next/navigation";
import { passwordLogin } from "@/lib/auth/password-login";
import type { ActionState } from "@/lib/forms/action-state";
import { loginSchema } from "./login-schema";

export async function staffLoginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Hãy nhập email và mật khẩu." };

  const error = await passwordLogin("staff", parsed.data.email, parsed.data.password);
  if (error) return { error };
  redirect("/admin");
}
