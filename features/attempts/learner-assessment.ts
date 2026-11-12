import "server-only";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { requireApprovedCourse } from "@/lib/auth/current-customer";
import { db } from "@/lib/db";
import { requireUuid } from "@/lib/forms/require-uuid";
import { finalizeExpiredAttempts } from "./finalize-attempt";

/** Limits a query to assessments this learner may take: published, in a published course they are approved for. */
export const takeableBy = (customerId: string): Prisma.AssessmentWhereInput => ({
  deletedAt: null,
  status: "published",
  course: { deletedAt: null, status: "published", enrollments: { some: { customerId, status: "approved" } } },
});

/**
 * The gate for every learner page about one assessment: approved course,
 * published assessment. Also closes this learner's attempts that ran out of
 * time, so every page below sees settled data.
 */
export async function requireLearnerAssessment(courseSlug: string, assessmentId: string) {
  const { customer, course } = await requireApprovedCourse(courseSlug);
  requireUuid(assessmentId);
  const assessment = await db.assessment.findFirst({
    where: { id: assessmentId, courseId: course.id, deletedAt: null, status: "published" },
  });
  if (!assessment) notFound();
  // One server clock reading for the whole request: expiry, time left, what may be shown.
  const now = new Date();
  await finalizeExpiredAttempts({ assessmentId, customerId: customer.id }, now);
  return { customer, course, assessment, now };
}

/**
 * The questions of an assessment in the teacher's order. An exercise deleted
 * after learners started stays a question here, so earlier scores keep their total.
 */
export function loadAssessmentQuestions(assessmentId: string) {
  return db.assessmentExercise.findMany({
    where: { assessmentId },
    orderBy: [{ position: "asc" }, { exerciseId: "asc" }],
    include: { exercise: true },
  });
}
