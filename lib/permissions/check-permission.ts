import { type PermissionKey, SUPERADMIN_ONLY, isPermissionKey } from "./permission-keys";

/** The part of a staff account that permission checks need. */
export type PermissionHolder = {
  id: string;
  isSuperadmin: boolean;
  permissions: ReadonlySet<PermissionKey>;
};

export function hasPermission(staff: PermissionHolder, key: PermissionKey): boolean {
  if (staff.isSuperadmin) return true;
  if (SUPERADMIN_ONLY.includes(key)) return false;
  return staff.permissions.has(key);
}

/** Staff without this only see courses they are assigned to in course_teachers. */
export function canSeeAllCourses(staff: PermissionHolder): boolean {
  return hasPermission(staff, "course.view_all");
}

/** Union of the permissions of every group, ignoring keys no longer in the code. */
export function mergeGroupPermissions(groupKeys: string[][]): Set<PermissionKey> {
  const merged = new Set<PermissionKey>();
  for (const keys of groupKeys) {
    for (const key of keys) if (isPermissionKey(key)) merged.add(key);
  }
  return merged;
}
