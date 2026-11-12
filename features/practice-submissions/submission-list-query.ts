import "server-only";
import type { CurrentStaff } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { courseScopeWhere } from "@/lib/permissions/course-scope";
import { type Mistake, submissionMistakes } from "./submission-mistakes";

export const SUBMISSION_PAGE_SIZE = 200;

export type SubmissionRow = {
  id: string;
  createdAt: Date;
  learner: { id: string; fullName: string; email: string };
  lessonTitle: string;
  exercisePrompt: string;
  score: number | null;
  maxPoints: number;
  recording: boolean;
  mistakes: Mistake[];
};

/** Courses the actor may follow, and the learners who submitted anything in the chosen one. */
export async function submissionFilters(staff: CurrentStaff, requestedCourse: string | undefined) {
  const courses = await db.course.findMany({ where: courseScopeWhere(staff), orderBy: { title: "asc" }, select: { id: true, title: true } });
  // An id outside the actor's scope simply does not match and falls back to the first course.
  const course = courses.find((c) => c.id === requestedCourse) ?? courses[0] ?? null;
  const learners = course
    ? await db.customer.findMany({
        where: { deletedAt: null, submissions: { some: { courseId: course.id } } },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true, email: true },
      })
    : [];
  return { courses, course, learners };
}

/** Newest practice submissions of one course, optionally of one learner, with what was wrong in each. */
export async function listSubmissions(courseId: string, customerId: string | null): Promise<SubmissionRow[]> {
  const rows = await db.practiceSubmission.findMany({
    where: { courseId, ...(customerId ? { customerId } : {}), customer: { deletedAt: null } },
    orderBy: { createdAt: "desc" },
    take: SUBMISSION_PAGE_SIZE,
    include: {
      customer: { select: { id: true, fullName: true, email: true } },
      lesson: { select: { title: true } },
      exercise: { select: { id: true, type: true, prompt: true, points: true, data: true, answerKey: true } },
    },
  });
  return rows.map((row) => {
    const score = row.score === null ? null : Number(row.score);
    // Grade against the points at submit time, so a later change of the exercise's points does not shift old rows.
    const exercise = { ...row.exercise, points: row.maxPoints };
    return {
      id: row.id,
      createdAt: row.createdAt,
      learner: row.customer,
      lessonTitle: row.lesson?.title ?? "",
      exercisePrompt: row.exercise.prompt,
      score,
      maxPoints: row.maxPoints,
      recording: (row.response as { recording?: unknown } | null)?.recording === true,
      mistakes: submissionMistakes(exercise, row.response, row.parts, score),
    };
  });
}
