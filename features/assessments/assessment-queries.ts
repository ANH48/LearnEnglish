import "server-only";
import { db } from "@/lib/db";
import type { PermissionHolder } from "@/lib/permissions/check-permission";
import { courseScopeWhere } from "@/lib/permissions/course-scope";
import { visible } from "@/lib/visible-content-filter";

/** Published assessments of a course, oldest first, as a learner sees them listed. */
export function listPublishedAssessments(courseId: string) {
  return db.assessment.findMany({
    where: { courseId, ...visible },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, kind: true, durationMinutes: true },
  });
}

/** Every course the actor may touch with its assessments and their question and attempt counts. */
export function listAssessmentsByCourse(staff: PermissionHolder) {
  return db.course.findMany({
    where: courseScopeWhere(staff),
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      assessments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { exercises: true, attempts: true } } },
      },
    },
  });
}

/** One assessment of a course with its picked questions, for the admin edit page. */
export function findAssessmentForEdit(courseId: string, assessmentId: string) {
  return db.assessment.findFirst({
    where: { id: assessmentId, courseId, deletedAt: null },
    include: { exercises: true, _count: { select: { attempts: true } } },
  });
}

/** Assessments of a course with the points of each question: the columns of the gradebook. */
export function listGradebookAssessments(courseId: string) {
  return db.assessment.findMany({
    where: { courseId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, exercises: { select: { points: true } } },
  });
}
