import "server-only";
import type { CurrentStaff } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { canSeeAllCourses } from "@/lib/permissions/check-permission";

/** Category and teacher choices for the course form, limited to what the actor may set. */
export async function loadCourseFormOptions(actor: CurrentStaff, courseId?: string) {
  const [categories, teachers] = await Promise.all([
    db.category.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    canSeeAllCourses(actor)
      ? db.staff.findMany({
          // Keep already-assigned teachers listed even while locked, so saving the
          // form for an unrelated change does not silently unassign them.
          where: {
            deletedAt: null,
            OR: [{ status: "active" }, ...(courseId ? [{ courseTeachers: { some: { courseId } } }] : [])],
          },
          orderBy: { fullName: "asc" },
          select: { id: true, fullName: true, email: true },
        })
      : null,
  ]);
  return { categories, teacherOptions: teachers };
}
