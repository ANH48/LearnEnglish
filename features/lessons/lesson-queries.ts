import "server-only";
import { db } from "@/lib/db";
import type { PermissionHolder } from "@/lib/permissions/check-permission";
import { courseScopeWhere } from "@/lib/permissions/course-scope";
import { visible } from "@/lib/visible-content-filter";

const lessonOrder = [{ position: "asc" }, { createdAt: "asc" }] as const;

/** Published lessons of a course in order, each with this learner's "done" mark. */
export function listLearnerLessons(courseId: string, customerId: string) {
  return db.lesson.findMany({
    where: { courseId, ...visible },
    orderBy: [...lessonOrder],
    select: {
      id: true,
      title: true,
      progress: { where: { customerId }, select: { lessonId: true } },
    },
  });
}

/** Ids of the published lessons of a course in order, to find the next lesson. */
export function listPublishedLessonIds(courseId: string) {
  return db.lesson.findMany({ where: { courseId, ...visible }, orderBy: [...lessonOrder], select: { id: true } });
}

/** One published lesson with its published exercises, this learner's latest practice answer to each, and their "done" mark. */
export function loadLearnerLesson(courseId: string, lessonId: string, customerId: string) {
  return db.lesson.findFirst({
    where: { id: lessonId, courseId, ...visible },
    include: {
      exercises: {
        where: visible,
        orderBy: [...lessonOrder],
        include: {
          answers: {
            where: { customerId, attemptId: null },
            orderBy: { updatedAt: "desc" },
            select: { id: true, autoScore: true, manualScore: true, feedback: true, response: true, mediaId: true },
            take: 1,
          },
        },
      },
      progress: { where: { customerId }, select: { lessonId: true } },
    },
  });
}

/** Id and title of a course's lessons, for the lesson picker of the exercise form. */
export function listCourseLessonOptions(courseId: string) {
  return db.lesson.findMany({ where: { courseId, deletedAt: null }, orderBy: { position: "asc" }, select: { id: true, title: true } });
}

/** One lesson of a course with its exercises, for the admin edit page. */
export function findLessonForEdit(courseId: string, lessonId: string) {
  return db.lesson.findFirst({
    where: { id: lessonId, courseId, deletedAt: null },
    include: { exercises: { where: { deletedAt: null }, orderBy: { position: "asc" } } },
  });
}

/** Lessons with at least one block, in the actor's courses: where lesson audio can live. */
export function listLessonsWithBlocks(staff: PermissionHolder) {
  return db.lesson.findMany({
    where: { deletedAt: null, course: courseScopeWhere(staff), NOT: { blocks: { equals: [] } } },
    orderBy: [{ course: { title: "asc" } }, { position: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, status: true, blocks: true, courseId: true, course: { select: { title: true } } },
  });
}

/** What the audio route needs to decide who may hear a lesson's audio. Draft lessons are included: staff may listen. */
export function findLessonAudioSource(lessonId: string) {
  return db.lesson.findFirst({
    where: { id: lessonId, deletedAt: null, course: { deletedAt: null } },
    select: { blocks: true, status: true, courseId: true, course: { select: { status: true } } },
  });
}

export function listMediaFileSizes(mediaIds: string[]) {
  return db.mediaFile.findMany({ where: { id: { in: mediaIds } }, select: { id: true, sizeBytes: true, createdAt: true } });
}

export function findAudioFile(mediaId: string) {
  return db.mediaFile.findFirst({ where: { id: mediaId, kind: "audio" }, select: { storageKey: true } });
}
