"use server";

import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth/current-customer";
import { db } from "@/lib/db";
import { gradeExercise, parseResponse, scoreFor } from "@/lib/grading/grade-exercise";
import { solutionText } from "./learner-exercise";

export type SubmitResult =
  | { ok: true; score: number; points: number; parts: boolean[]; solution: string }
  | { ok: false; error: string };

const uuid = z.uuid();

/**
 * Grades one practice exercise inside a lesson and stores the learner's latest answer.
 * The exercise, its lesson and its course must all be published, and the
 * learner's enrollment approved; otherwise it behaves as if it does not exist.
 */
export async function submitExerciseAnswerAction(exerciseId: string, response: unknown): Promise<SubmitResult> {
  const customer = await requireCustomer();
  const notFound: SubmitResult = { ok: false, error: "Không tìm thấy bài tập." };
  if (!uuid.safeParse(exerciseId).success) return notFound;

  const exercise = await db.exercise.findFirst({
    where: {
      id: exerciseId,
      deletedAt: null,
      status: "published",
      lesson: { deletedAt: null, status: "published" },
      course: {
        deletedAt: null,
        status: "published",
        enrollments: { some: { customerId: customer.id, status: "approved" } },
      },
    },
  });
  if (!exercise) return notFound;

  // Only the validated shape is graded and stored, never the raw request body.
  const cleaned = parseResponse(exercise.type, response);
  const graded = cleaned && gradeExercise(exercise.type, exercise.answerKey, cleaned);
  if (!cleaned || !graded) return { ok: false, error: "Câu trả lời chưa hợp lệ." };
  const score = scoreFor(graded.ratio, exercise.points);

  // Practice answers have no attempt; one row per learner and exercise holds the
  // latest. The advisory lock makes two submits at once take turns, so they
  // cannot both insert a row.
  const data = { response: cleaned as Prisma.InputJsonObject, autoScore: score };
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${customer.id}:${exerciseId}`}))`;
    const previous = await tx.answer.findFirst({
      where: { customerId: customer.id, exerciseId, attemptId: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (previous) {
      await tx.answer.update({ where: { id: previous.id }, data });
    } else {
      await tx.answer.create({ data: { ...data, customerId: customer.id, exerciseId } });
    }
  });

  return { ok: true, score, points: exercise.points, parts: graded.parts, solution: solutionText(exercise) };
}
