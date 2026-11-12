import "server-only";
import type { Prisma } from "@prisma/client";
import { canStillSave, settleScore } from "@/lib/assessments/attempt-rules";
import { db } from "@/lib/db";
import { gradeExercise, needsManualGrading, scoreFor } from "@/lib/grading/grade-exercise";

/** Recomputes an attempt's score and status from its answers. Called after submit and after each manual grade. */
export async function settleAttempt(tx: Prisma.TransactionClient, attemptId: string, submittedAt?: Date): Promise<void> {
  // Two teachers grading two answers of one attempt at once must add up, not overwrite each other.
  await tx.$queryRaw`SELECT id FROM attempts WHERE id = ${attemptId}::uuid FOR UPDATE`;
  const answers = await tx.answer.findMany({
    where: { attemptId },
    select: { autoScore: true, manualScore: true, gradedAt: true, exercise: { select: { type: true } } },
  });
  const settled = settleScore(answers.map((a) => ({ ...a, needsManual: needsManualGrading(a.exercise.type) })));
  await tx.attempt.update({ where: { id: attemptId }, data: { ...settled, ...(submittedAt ? { submittedAt } : {}) } });
}

/**
 * Closes an attempt: auto-grades what can be auto-graded and leaves written
 * answers for the teacher. Safe to call twice or from two requests at once;
 * only the call that flips `in_progress` does the work.
 */
export async function finalizeAttempt(attemptId: string, now: Date = new Date()): Promise<void> {
  await db.$transaction(async (tx) => {
    const claimed = await tx.attempt.updateMany({
      where: { id: attemptId, status: "in_progress" },
      data: { status: "submitted" },
    });
    if (claimed.count === 0) return;

    const attempt = await tx.attempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: { answers: true, assessment: { include: { exercises: { include: { exercise: true } } } } },
    });
    const links = new Map(attempt.assessment.exercises.map((link) => [link.exerciseId, link]));

    for (const answer of attempt.answers) {
      const link = links.get(answer.exerciseId);
      if (!link || needsManualGrading(link.exercise.type)) continue;
      const graded = gradeExercise(link.exercise.type, link.exercise.answerKey, answer.response);
      await tx.answer.update({
        where: { id: answer.id },
        data: { autoScore: graded ? scoreFor(graded.ratio, link.points) : 0 },
      });
    }

    // An attempt closed after its deadline counts as handed in at the deadline.
    await settleAttempt(tx, attemptId, now < attempt.deadlineAt ? now : attempt.deadlineAt);
  });
}

/**
 * There is no cron: an attempt left open past its deadline is closed the next
 * time someone (the learner or a teacher) reads data it belongs to. It waits
 * out the save grace, so a last autosave is not cut off by another reader.
 */
export async function finalizeExpiredAttempts(where: Prisma.AttemptWhereInput, now: Date = new Date()): Promise<void> {
  const open = await db.attempt.findMany({ where: { ...where, status: "in_progress" }, select: { id: true, deadlineAt: true } });
  for (const attempt of open) {
    if (canStillSave(attempt.deadlineAt, now)) continue;
    try {
      await finalizeAttempt(attempt.id, now);
    } catch (error) {
      // One attempt that cannot be closed must not take the whole page down for everyone.
      console.error(`Could not finalize attempt ${attempt.id}`, error);
    }
  }
}
