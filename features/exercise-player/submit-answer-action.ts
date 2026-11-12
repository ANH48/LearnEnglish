"use server";

import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth/current-customer";
import { db } from "@/lib/db";
import { gradeExercise, parseResponse, parseWritingResponse, scoreFor } from "@/lib/grading/grade-exercise";
import { solutionText } from "./learner-exercise";

export type SubmitResult =
  | { ok: true; waiting: false; score: number; points: number; parts: boolean[]; solution: string }
  /** Writing: stored and queued for the teacher. */
  | { ok: true; waiting: true }
  | { ok: false; error: string };

const uuid = z.uuid();

/**
 * Grades one practice exercise inside a lesson and stores the learner's latest answer.
 * A written answer is stored ungraded and waits for the teacher.
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

  const invalid: SubmitResult = { ok: false, error: "Câu trả lời chưa hợp lệ." };
  if (exercise.type === "writing") {
    const written = parseWritingResponse(response);
    if (!written || !written.text.trim()) return invalid;
    // Sending again replaces the text and puts it back in the teacher's queue.
    await saveLatestPracticeAnswer(customer.id, exerciseId, written, null);
    return { ok: true, waiting: true };
  }

  // Only the validated shape is graded and stored, never the raw request body.
  const cleaned = parseResponse(exercise.type, response);
  const graded = cleaned && gradeExercise(exercise.type, exercise.answerKey, cleaned);
  if (!cleaned || !graded) return invalid;
  const score = scoreFor(graded.ratio, exercise.points);

  await saveLatestPracticeAnswer(customer.id, exerciseId, cleaned as Prisma.InputJsonObject, score);
  return { ok: true, waiting: false, score, points: exercise.points, parts: graded.parts, solution: solutionText(exercise) };
}

/**
 * Practice answers have no attempt; one row per learner and exercise holds the
 * latest. The advisory lock makes two submits at once take turns, so they
 * cannot both insert a row.
 */
async function saveLatestPracticeAnswer(customerId: string, exerciseId: string, response: Prisma.InputJsonObject, autoScore: number | null) {
  // Any earlier teacher grade belonged to the previous text, so it is cleared.
  const data = { response, autoScore, manualScore: null, feedback: "", gradedBy: null, gradedAt: null };
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${customerId}:${exerciseId}`}))`;
    const previous = await tx.answer.findFirst({
      where: { customerId, exerciseId, attemptId: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (previous) {
      await tx.answer.update({ where: { id: previous.id }, data });
    } else {
      await tx.answer.create({ data: { ...data, customerId, exerciseId } });
    }
  });
}
