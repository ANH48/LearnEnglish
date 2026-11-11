"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { accountFields, deletedEmail } from "@/features/accounts/account-schemas";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requirePermission } from "@/lib/auth/current-staff";
import { hashPassword } from "@/lib/auth/password-hashing";
import { startSession } from "@/lib/auth/session-cookies";
import { db } from "@/lib/db";
import { type ActionState, isUniqueViolation, validationFailed } from "@/lib/forms/action-state";
import { requireUuid, uniqueIds } from "@/lib/forms/require-uuid";

const staffSchema = z.object({
  email: accountFields.email,
  fullName: accountFields.fullName,
  status: accountFields.status,
  password: accountFields.optionalPassword,
  isSuperadmin: z.boolean(),
  groupIds: z.array(z.uuid()),
});

/**
 * Create (staffId = null) or update a staff account.
 * Only a superadmin may grant superadmin, assign groups, touch a superadmin
 * account, or change another account's email or password (which would let the
 * actor sign in as that person and borrow their permissions).
 */
export async function saveStaffAction(
  staffId: string | null,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission("staff.manage");
  if (staffId !== null) requireUuid(staffId);
  const parsed = staffSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    status: formData.get("status"),
    password: formData.get("password") ?? "",
    isSuperadmin: formData.get("isSuperadmin") === "on",
    groupIds: formData.getAll("groupIds"),
  });
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;

  const target = staffId ? await db.staff.findFirst({ where: { id: staffId, deletedAt: null } }) : null;
  if (staffId && !target) return { error: "Không tìm thấy tài khoản." };
  if (target?.isSuperadmin && !actor.isSuperadmin) {
    return { error: "Chỉ superadmin mới sửa được tài khoản superadmin." };
  }
  if (!target && input.password === "") {
    return { error: "Thiếu mật khẩu.", fieldErrors: { password: ["Bắt buộc khi tạo mới"] } };
  }

  const isSelf = target?.id === actor.id;
  if (isSelf && input.status === "locked") return { error: "Bạn không thể tự khóa tài khoản của mình." };
  if (isSelf && target.isSuperadmin && !input.isSuperadmin) {
    return { error: "Bạn không thể tự bỏ quyền superadmin của mình." };
  }
  const changesLogin = input.password !== "" || input.email !== target?.email;
  if (target && !isSelf && !actor.isSuperadmin && changesLogin) {
    return { error: "Chỉ superadmin mới đổi được email hoặc mật khẩu của tài khoản staff khác." };
  }

  const passwordHash = input.password ? await hashPassword(input.password) : undefined;
  // Old tokens stop working when the password changes or the account is locked.
  const revokeTokens = Boolean(target) && (passwordHash !== undefined || input.status === "locked");
  // Ignore group ids that no longer exist instead of failing on the foreign key.
  const groupIds = actor.isSuperadmin
    ? (await db.permissionGroup.findMany({ where: { id: { in: uniqueIds(input.groupIds) } }, select: { id: true } })).map((g) => g.id)
    : [];

  try {
    const saved = await db.$transaction(async (tx) => {
      const data = {
        email: input.email,
        fullName: input.fullName,
        status: input.status,
        ...(passwordHash ? { passwordHash } : {}),
        ...(actor.isSuperadmin ? { isSuperadmin: input.isSuperadmin } : {}),
      };
      const staff = target
        ? await tx.staff.update({
            where: { id: target.id },
            data: { ...data, ...(revokeTokens ? { tokenVersion: { increment: 1 } } : {}) },
          })
        : await tx.staff.create({ data: { ...data, passwordHash: passwordHash! } });

      if (actor.isSuperadmin) {
        await tx.staffGroup.deleteMany({ where: { staffId: staff.id } });
        await tx.staffGroup.createMany({ data: groupIds.map((groupId) => ({ staffId: staff.id, groupId })) });
      }
      return staff;
    });
    await writeAuditLog(actor.id, target ? "staff.update" : "staff.create", "staff", saved.id, {
      status: input.status,
      passwordChanged: passwordHash !== undefined,
      ...(actor.isSuperadmin ? { isSuperadmin: input.isSuperadmin, groupIds } : {}),
    });
    // Changing your own password must not sign you out of this browser.
    if (isSelf && revokeTokens) await startSession({ sub: saved.id, kind: "staff", tv: saved.tokenVersion });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "Email này đã được dùng." };
    throw error;
  }

  revalidatePath("/admin/staff");
  redirect("/admin/staff");
}

export async function deleteStaffAction(staffId: string): Promise<void> {
  const actor = await requirePermission("staff.manage");
  requireUuid(staffId);
  const target = await db.staff.findFirst({ where: { id: staffId, deletedAt: null } });
  if (!target || target.id === actor.id) return;
  if (target.isSuperadmin && !actor.isSuperadmin) redirect("/admin/forbidden");

  await db.$transaction([
    // A deleted account keeps no groups and teaches no courses.
    db.staffGroup.deleteMany({ where: { staffId } }),
    db.courseTeacher.deleteMany({ where: { staffId } }),
    db.staff.update({
      where: { id: staffId },
      data: {
        deletedAt: new Date(),
        email: deletedEmail(target.email, target.id),
        tokenVersion: { increment: 1 },
      },
    }),
  ]);
  await writeAuditLog(actor.id, "staff.delete", "staff", staffId);
  revalidatePath("/admin/staff");
}
