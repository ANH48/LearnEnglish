import "server-only";
import { db } from "@/lib/db";
import type { PermissionHolder } from "@/lib/permissions/check-permission";
import { courseScopeWhere } from "@/lib/permissions/course-scope";
import { visible } from "@/lib/visible-content-filter";

/** A learner's requests in published courses, with teachers and the lessons they have finished. */
export function listMyEnrollments(customerId: string) {
  return db.enrollment.findMany({
    where: { customerId, course: visible },
    orderBy: { updatedAt: "desc" },
    include: {
      course: {
        select: {
          slug: true,
          title: true,
          categories: { where: { category: { deletedAt: null } }, select: { category: { select: { name: true } } } },
          teachers: { where: { staff: { deletedAt: null } }, select: { staff: { select: { fullName: true } } } },
          lessons: {
            where: visible,
            select: { progress: { where: { customerId }, select: { lessonId: true } } },
          },
        },
      },
    },
  });
}

/** Status and note of one learner's request for one course, or null when they never asked. */
export function findEnrollmentStatus(courseId: string, customerId: string) {
  return db.enrollment.findUnique({ where: { courseId_customerId: { courseId, customerId } }, select: { status: true, note: true } });
}

export async function isApprovedLearner(courseId: string, customerId: string): Promise<boolean> {
  const found = await db.enrollment.findFirst({ where: { courseId, customerId, status: "approved" }, select: { id: true } });
  return found !== null;
}

/** Requests waiting for review and learners already in a course, limited to the actor's courses. */
export function listReviewableEnrollments(staff: PermissionHolder) {
  return db.enrollment.findMany({
    where: {
      status: { in: ["pending", "approved"] },
      course: courseScopeWhere(staff),
      customer: { deletedAt: null },
    },
    orderBy: { updatedAt: "asc" },
    include: { course: { select: { title: true } }, customer: { select: { fullName: true, email: true } } },
  });
}

/** Approved learners of a course by name: the rows of the gradebook. */
export function listApprovedLearners(courseId: string) {
  return db.enrollment.findMany({
    where: { courseId, status: "approved", customer: { deletedAt: null } },
    orderBy: { customer: { fullName: "asc" } },
    select: { customer: { select: { id: true, fullName: true, email: true } } },
  });
}
