import "server-only";
import { db } from "@/lib/db";
import type { PermissionHolder } from "@/lib/permissions/check-permission";
import { courseScopeWhere } from "@/lib/permissions/course-scope";
import { visible } from "@/lib/visible-content-filter";

/** Categories with at least one published course: the filter chips of the landing page. */
export function listCategoriesWithPublishedCourses() {
  return db.category.findMany({
    where: { deletedAt: null, courses: { some: { course: visible } } },
    orderBy: { name: "asc" },
  });
}

/** Published courses for the landing page, newest first, optionally of one category. */
export function listPublishedCourses(categorySlug?: string) {
  return db.course.findMany({
    where: {
      ...visible,
      ...(categorySlug ? { categories: { some: { category: { slug: categorySlug, deletedAt: null } } } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      categories: { include: { category: true } },
      teachers: { where: { staff: { deletedAt: null } }, select: { staff: { select: { fullName: true } } } },
      _count: { select: { lessons: { where: visible } } },
    },
  });
}

export function findPublishedCourseTitle(slug: string) {
  return db.course.findFirst({ where: { slug, ...visible }, select: { title: true } });
}

/** Admin course list: every course the actor may touch, newest first. */
export function listCoursesInScope(staff: PermissionHolder) {
  return db.course.findMany({
    where: courseScopeWhere(staff),
    orderBy: { createdAt: "desc" },
    include: {
      categories: { include: { category: true } },
      teachers: { include: { staff: true } },
      _count: { select: { lessons: { where: { deletedAt: null } } } },
    },
  });
}

/** Id and title of every course the actor may touch, for a course picker. */
export function listCourseTitlesInScope(staff: PermissionHolder) {
  return db.course.findMany({ where: courseScopeWhere(staff), orderBy: { title: "asc" }, select: { id: true, title: true } });
}

/** One course with its lessons and loose exercises for the admin edit page. The caller has checked course access. */
export function loadCourseForEdit(courseId: string) {
  return db.course.findUniqueOrThrow({
    where: { id: courseId },
    include: {
      categories: true,
      teachers: true,
      lessons: {
        where: { deletedAt: null },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: { _count: { select: { exercises: { where: { deletedAt: null } } } } },
      },
      // Exercises not tied to a lesson: only usable inside assessments.
      exercises: { where: { deletedAt: null, lessonId: null }, orderBy: { position: "asc" } },
    },
  });
}
