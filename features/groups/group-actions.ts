"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requireSuperadmin } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { requireUuid } from "@/lib/forms/require-uuid";
import { type ActionState, isUniqueViolation, validationFailed } from "@/lib/forms/action-state";
import { SUPERADMIN_ONLY, isPermissionKey } from "@/lib/permissions/permission-keys";

const groupSchema = z.object({
  name: z.string().trim().min(1, "Bắt buộc").max(60),
  description: z.string().trim().max(300),
  // Unknown keys and superadmin-only keys are dropped rather than stored.
  permissions: z
    .array(z.string())
    .transform((keys) => keys.filter((key) => isPermissionKey(key) && !SUPERADMIN_ONLY.includes(key))),
});

/** Create (groupId = null) or update a permission group. Superadmin only. */
export async function saveGroupAction(
  groupId: string | null,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireSuperadmin();
  if (groupId !== null) requireUuid(groupId);
  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    permissions: formData.getAll("permissions"),
  });
  if (!parsed.success) return validationFailed(parsed.error);
  const { name, description } = parsed.data;
  const permissions = [...new Set(parsed.data.permissions)];
  if (groupId && !(await db.permissionGroup.findUnique({ where: { id: groupId } }))) {
    return { error: "Không tìm thấy group." };
  }

  try {
    const saved = await db.$transaction(async (tx) => {
      const group = groupId
        ? await tx.permissionGroup.update({ where: { id: groupId }, data: { name, description } })
        : await tx.permissionGroup.create({ data: { name, description } });
      await tx.groupPermission.deleteMany({ where: { groupId: group.id } });
      await tx.groupPermission.createMany({
        data: permissions.map((permissionKey) => ({ groupId: group.id, permissionKey })),
      });
      return group;
    });
    await writeAuditLog(staff.id, groupId ? "group.update" : "group.create", "permission_group", saved.id, {
      permissions,
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "Đã có group trùng tên này." };
    throw error;
  }

  revalidatePath("/admin/groups");
  redirect("/admin/groups");
}

export async function deleteGroupAction(groupId: string): Promise<void> {
  const staff = await requireSuperadmin();
  requireUuid(groupId);
  await db.permissionGroup.deleteMany({ where: { id: groupId } });
  await writeAuditLog(staff.id, "group.delete", "permission_group", groupId);
  revalidatePath("/admin/groups");
}
