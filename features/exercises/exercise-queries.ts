import "server-only";
import { db } from "@/lib/db";

/** One exercise of a course, for the admin edit page. */
export function findExerciseForEdit(courseId: string, exerciseId: string) {
  return db.exercise.findFirst({ where: { id: exerciseId, courseId, deletedAt: null } });
}

/** Every exercise of a course in lesson order, for picking the questions of an assessment. */
export function listCourseExercisesForPicker(courseId: string) {
  return db.exercise.findMany({
    where: { courseId, deletedAt: null },
    orderBy: [{ lesson: { position: "asc" } }, { position: "asc" }, { createdAt: "asc" }],
    select: { id: true, prompt: true, type: true, points: true, lesson: { select: { title: true } } },
  });
}
