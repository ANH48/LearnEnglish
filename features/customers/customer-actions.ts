"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { accountFields, deletedEmail } from "@/features/accounts/account-schemas";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requirePermission } from "@/lib/auth/current-staff";
import { hashPassword } from "@/lib/auth/password-hashing";
import { db } from "@/lib/db";
import { requireUuid } from "@/lib/forms/require-uuid";
import { type ActionState, isUniqueViolation, validationFailed } from "@/lib/forms/action-state";

const customerSchema = z.object({
  email: accountFields.email,
  fullName: accountFields.fullName,
  status: accountFields.status,
  password: accountFields.optionalPassword,
});

/** Create (customerId = null) or update a learner account. Also how staff reset a learner's password. */
export async function saveCustomerAction(
  customerId: string | null,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("customer.manage");
  if (customerId !== null) requireUuid(customerId);
  const parsed = customerSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    status: formData.get("status"),
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;

  const target = customerId
    ? await db.customer.findFirst({ where: { id: customerId, deletedAt: null } })
    : null;
  if (customerId && !target) return { error: "Không tìm thấy học viên." };
  if (!customerId && input.password === "") {
    return { error: "Thiếu mật khẩu.", fieldErrors: { password: ["Bắt buộc khi tạo mới"] } };
  }

  const passwordHash = input.password ? await hashPassword(input.password) : undefined;
  const revokeTokens = Boolean(target) && (passwordHash !== undefined || input.status === "locked");
  const data = {
    email: input.email,
    fullName: input.fullName,
    status: input.status,
    ...(passwordHash ? { passwordHash } : {}),
  };

  try {
    const saved = target
      ? await db.customer.update({
          where: { id: target.id },
          data: { ...data, ...(revokeTokens ? { tokenVersion: { increment: 1 } } : {}) },
        })
      : await db.customer.create({ data: { ...data, passwordHash: passwordHash! } });
    await writeAuditLog(actor.id, target ? "customer.update" : "customer.create", "customer", saved.id, {
      status: input.status,
      passwordChanged: passwordHash !== undefined,
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "Email này đã được dùng." };
    throw error;
  }

  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}

export async function deleteCustomerAction(customerId: string): Promise<void> {
  const actor = await requirePermission("customer.manage");
  requireUuid(customerId);
  const target = await db.customer.findFirst({ where: { id: customerId, deletedAt: null } });
  if (!target) return;

  // Soft delete keeps the learner's past answers and scores.
  await db.customer.update({
    where: { id: customerId },
    data: {
      deletedAt: new Date(),
      email: deletedEmail(target.email, target.id),
      tokenVersion: { increment: 1 },
    },
  });
  await writeAuditLog(actor.id, "customer.delete", "customer", customerId);
  revalidatePath("/admin/customers");
}
