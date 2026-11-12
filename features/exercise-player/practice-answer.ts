import "server-only";
import type { Prisma } from "@prisma/client";
import { markLessonDoneWhenAllAnswered } from "@/features/progress/lesson-exercise-completion";
import { db } from "@/lib/db";

type PracticeAnswer = {
  response: Prisma.InputJsonObject;
  autoScore: number | null;
  mediaId?: string | null;
  /** Right/wrong per blank or pair from auto-grading, kept in the submission history. */
  parts?: boolean[];
};

/**
 * Practice answers have no attempt; one row per learner and exercise holds the
 * latest, and every submit is also appended to practice_submissions so the
 * teacher can follow each learner's tries. The advisory lock makes two submits
 * at once take turns, so they cannot both insert an answer row. Once every
 * exercise of the lesson has an answer, the lesson is marked done. Returns the
 * recording the new answer replaced, if any.
 */
export async function saveLatestPracticeAnswer(customerId: string, exerciseId: string, answer: PracticeAnswer): Promise<string | null> {
  const { parts = [], ...answerFields } = answer;
  // Any earlier teacher grade belonged to the previous answer, so it is cleared.
  const data = { ...answerFields, mediaId: answer.mediaId ?? null, manualScore: null, feedback: "", gradedBy: null, gradedAt: null };
  const saved = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${customerId}:${exerciseId}`}))`;
    const previous = await tx.answer.findFirst({
      where: { customerId, exerciseId, attemptId: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true, mediaId: true },
    });
    if (previous) {
      await tx.answer.update({ where: { id: previous.id }, data });
    } else {
      await tx.answer.create({ data: { ...data, customerId, exerciseId } });
    }

    const exercise = await tx.exercise.findUniqueOrThrow({ where: { id: exerciseId }, select: { courseId: true, lessonId: true, points: true } });
    await tx.practiceSubmission.create({
      data: {
        customerId,
        exerciseId,
        courseId: exercise.courseId,
        lessonId: exercise.lessonId,
        // Recordings are replaced and deleted on a new take, so history only notes that one was sent.
        response: answer.mediaId ? { recording: true } : answer.response,
        score: answer.autoScore,
        maxPoints: exercise.points,
        parts,
      },
    });
    return { replacedMediaId: previous?.mediaId ?? null, lessonId: exercise.lessonId };
  });
  // Outside the transaction: a failure here must not lose the answer just saved.
  await markLessonDoneWhenAllAnswered(customerId, saved.lessonId).catch((error) => console.error("lesson completion", error));
  return saved.replacedMediaId;
}
