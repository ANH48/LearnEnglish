import "server-only";
import type { Prisma } from "@prisma/client";
import type { CurrentStaff } from "@/lib/auth/current-staff";
import { courseScopeWhere } from "@/lib/permissions/course-scope";

/**
 * Answers a teacher grades by hand, limited to the actor's courses: written
 * answers from lessons, and from attempts once they are handed in.
 */
export function manualAnswerWhere(staff: CurrentStaff): Prisma.AnswerWhereInput {
  return {
    exercise: { type: { in: ["writing", "speaking"] }, course: courseScopeWhere(staff) },
    customer: { deletedAt: null },
    OR: [{ attemptId: null }, { attempt: { status: { not: "in_progress" } } }],
  };
}

/** Everything the grading page and the grade action need about one answer. */
export const gradingAnswerInclude = {
  customer: { select: { fullName: true, email: true } },
  exercise: { include: { course: { select: { title: true } }, lesson: { select: { title: true } } } },
  attempt: { select: { assessment: { select: { title: true, exercises: true } } } },
} satisfies Prisma.AnswerInclude;

type GradingAnswer = Prisma.AnswerGetPayload<{ include: typeof gradingAnswerInclude }>;

/** The most this answer can earn: the assessment's points for the question, or the exercise's own in a lesson. */
export function maxPointsFor(answer: GradingAnswer): number {
  const link = answer.attempt?.assessment.exercises.find((l) => l.exerciseId === answer.exerciseId);
  return link?.points ?? answer.exercise.points;
}
