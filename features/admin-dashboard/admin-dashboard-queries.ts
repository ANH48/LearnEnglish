import "server-only";
import { manualAnswerWhere } from "@/features/manual-grading/grading-queue";
import type { CurrentStaff } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions/check-permission";
import { courseScopeWhere } from "@/lib/permissions/course-scope";

/** Counts for the admin home, within the actor's courses. A count the actor has no permission for is null. */
export async function loadDashboardCounts(staff: CurrentStaff) {
  const scope = courseScopeWhere(staff);
  const [courses, lessons, customers, pendingEnrollments, toGrade] = await Promise.all([
    db.course.count({ where: scope }),
    db.lesson.count({ where: { deletedAt: null, course: scope } }),
    hasPermission(staff, "customer.manage") ? db.customer.count({ where: { deletedAt: null } }) : null,
    hasPermission(staff, "enrollment.review")
      ? db.enrollment.count({ where: { status: "pending", course: scope, customer: { deletedAt: null } } })
      : null,
    hasPermission(staff, "grading.manual") ? db.answer.count({ where: { ...manualAnswerWhere(staff), gradedAt: null } }) : null,
  ]);
  return { courses, lessons, customers, pendingEnrollments, toGrade };
}
