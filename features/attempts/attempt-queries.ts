import "server-only";
import { db } from "@/lib/db";

/** Every attempt of one learner at one assessment, first to last. */
export function listMyAttempts(assessmentId: string, customerId: string) {
  return db.attempt.findMany({ where: { assessmentId, customerId }, orderBy: { startedAt: "asc" } });
}

/** How many questions an assessment has and the points they add up to. */
export function sumAssessmentQuestions(assessmentId: string) {
  return db.assessmentExercise.aggregate({ where: { assessmentId }, _count: true, _sum: { points: true } });
}

/** The learner's running attempt with what they have saved so far, or null. */
export function findRunningAttempt(assessmentId: string, customerId: string) {
  return db.attempt.findFirst({
    where: { assessmentId, customerId, status: "in_progress" },
    include: { answers: { select: { id: true, exerciseId: true, response: true, mediaId: true } } },
  });
}

/** One attempt with its answers, only if it belongs to this learner and this assessment. */
export function findMyAttemptWithAnswers(attemptId: string, assessmentId: string, customerId: string) {
  return db.attempt.findFirst({ where: { id: attemptId, assessmentId, customerId }, include: { answers: true } });
}

/** Status and score of every attempt in a course: the cells of the gradebook. */
export function listCourseAttemptScores(courseId: string) {
  return db.attempt.findMany({ where: { assessment: { courseId } }, select: { assessmentId: true, customerId: true, status: true, score: true } });
}
