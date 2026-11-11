import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUuid } from "@/lib/forms/require-uuid";
import { type PermissionHolder, hasPermission, mergeGroupPermissions } from "@/lib/permissions/check-permission";
import { canAccessCourse } from "@/lib/permissions/course-scope";
import type { PermissionKey } from "@/lib/permissions/permission-keys";
import { readSession } from "./session-cookies";

export type CurrentStaff = PermissionHolder & { email: string; fullName: string };

/**
 * Loads the signed-in staff member from the database on every request.
 * A locked, deleted or re-versioned account is treated as signed out,
 * which is what makes "lock account" and "reset password" take effect at once.
 */
export const getCurrentStaff = cache(async (): Promise<CurrentStaff | null> => {
  const session = await readSession("staff");
  if (!session) return null;

  const staff = await db.staff.findFirst({
    where: { id: session.sub, deletedAt: null, status: "active" },
    include: { groups: { include: { group: { include: { permissions: true } } } } },
  });
  if (!staff || staff.tokenVersion !== session.tv) return null;

  return {
    id: staff.id,
    email: staff.email,
    fullName: staff.fullName,
    isSuperadmin: staff.isSuperadmin,
    permissions: mergeGroupPermissions(
      staff.groups.map((link) => link.group.permissions.map((p) => p.permissionKey)),
    ),
  };
});

export async function requireStaff(): Promise<CurrentStaff> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/admin/login");
  return staff;
}

/** Use at the top of every admin page and server action that needs a permission. */
export async function requirePermission(key: PermissionKey): Promise<CurrentStaff> {
  const staff = await requireStaff();
  if (!hasPermission(staff, key)) redirect("/admin/forbidden");
  return staff;
}

export async function requireSuperadmin(): Promise<CurrentStaff> {
  const staff = await requireStaff();
  if (!staff.isSuperadmin) redirect("/admin/forbidden");
  return staff;
}

/** Permission plus course scope. A course outside the scope looks like it does not exist. */
export async function requireCourseAccess(key: PermissionKey, courseId: string): Promise<CurrentStaff> {
  const staff = await requirePermission(key);
  requireUuid(courseId);
  if (!(await canAccessCourse(staff, courseId))) notFound();
  return staff;
}
