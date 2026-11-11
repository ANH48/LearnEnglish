import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { type PermissionHolder, canSeeAllCourses } from "./check-permission";

/** Prisma filter limiting a course query to what this staff member may touch. */
export function courseScopeWhere(staff: PermissionHolder): Prisma.CourseWhereInput {
  const notDeleted = { deletedAt: null };
  if (canSeeAllCourses(staff)) return notDeleted;
  return { ...notDeleted, teachers: { some: { staffId: staff.id } } };
}

export async function canAccessCourse(staff: PermissionHolder, courseId: string): Promise<boolean> {
  const found = await db.course.findFirst({
    where: { id: courseId, ...courseScopeWhere(staff) },
    select: { id: true },
  });
  return found !== null;
}
