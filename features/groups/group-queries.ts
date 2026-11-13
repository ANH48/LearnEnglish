import "server-only";
import { db } from "@/lib/db";

/** Permission groups by name, for the group checkboxes of the staff form. */
export function listGroups() {
  return db.permissionGroup.findMany({ orderBy: { name: "asc" } });
}

/** Permission groups with how many permissions and staff each has. */
export function listGroupsWithCounts() {
  return db.permissionGroup.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { permissions: true, staff: true } } },
  });
}

export function findGroupWithPermissions(id: string) {
  return db.permissionGroup.findUnique({ where: { id }, include: { permissions: true } });
}
