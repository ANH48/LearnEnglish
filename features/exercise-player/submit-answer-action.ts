"use server";

import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth/current-customer";
import { db } from "@/lib/db";
import { BLANK } from "@/features/exercises/exercise-content";
import { gradeExercise, isTeacherGradedFillBlank, parseResponse, parseWritingResponse, scoreFor } from "@/lib/grading/grade-exercise";
import { solutionText } from "./learner-exercise";
import { saveLatestPracticeAnswer } from "./practice-answer";

export type SubmitResult =
  | { ok: true; waiting: false; score: number; points: number; parts: boolean[]; solution: string }
  /** Writing, or a fill-in exercise the teacher grades: stored and queued for the teacher. */
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
    await saveLatestPracticeAnswer(customer.id, exerciseId, { response: written, autoScore: null });
    return { ok: true, waiting: true };
  }

  // Only the validated shape is graded and stored, never the raw request body.
  const cleaned = parseResponse(exercise.type, response);
  if (isTeacherGradedFillBlank(exercise.type, exercise.data)) {
    const answers = (cleaned as { answers: string[] } | null)?.answers;
    const blanks = String((exercise.data as { text?: unknown }).text ?? "").split(BLANK).length - 1;
    if (!answers || answers.length !== blanks || answers.some((answer) => !answer.trim())) return invalid;
    // Stored ungraded; sending again puts it back in the teacher's queue.
    await saveLatestPracticeAnswer(customer.id, exerciseId, { response: { answers }, autoScore: null });
    return { ok: true, waiting: true };
  }
  const graded = cleaned && gradeExercise(exercise.type, exercise.answerKey, cleaned);
  if (!cleaned || !graded) return invalid;
  const score = scoreFor(graded.ratio, exercise.points);

  await saveLatestPracticeAnswer(customer.id, exerciseId, { response: cleaned as Prisma.InputJsonObject, autoScore: score });
  return { ok: true, waiting: false, score, points: exercise.points, parts: graded.parts, solution: solutionText(exercise) };
}

