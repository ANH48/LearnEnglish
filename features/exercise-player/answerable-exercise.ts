import "server-only";
import { z } from "zod";
import { takeableBy } from "@/features/attempts/learner-assessment";
import { canStillSave } from "@/lib/assessments/attempt-rules";
import type { CurrentCustomer } from "@/lib/auth/current-customer";
import { db } from "@/lib/db";

const uuid = z.uuid();
const isUuid = (value: unknown): value is string => uuid.safeParse(value).success;

/**
 * A question of this type the learner may answer now: inside a running attempt (`attemptId`),
 * or as practice in a published lesson of a course they are approved for (`attemptId` null).
 * Used before accepting a file (voice take, photo) for that question.
 */
export async function canAnswerNow(
  customer: CurrentCustomer,
  attemptId: unknown,
  exerciseId: unknown,
  type: "speaking" | "writing",
): Promise<boolean> {
  if (!isUuid(exerciseId)) return false;
  if (attemptId === null) {
    const exercise = await db.exercise.findFirst({
      where: {
        id: exerciseId,
        type,
        deletedAt: null,
        status: "published",
        lesson: { deletedAt: null, status: "published" },
        course: { deletedAt: null, status: "published", enrollments: { some: { customerId: customer.id, status: "approved" } } },
      },
      select: { id: true },
    });
    return exercise !== null;
  }
  if (!isUuid(attemptId)) return false;
  const attempt = await db.attempt.findFirst({
    where: {
      id: attemptId,
      customerId: customer.id,
      status: "in_progress",
      assessment: { ...takeableBy(customer.id), exercises: { some: { exerciseId, exercise: { type } } } },
    },
    select: { deadlineAt: true },
  });
  return attempt !== null && canStillSave(attempt.deadlineAt, new Date());
}
