import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type PracticeAnswer = { response: Prisma.InputJsonObject; autoScore: number | null; mediaId?: string | null };

/**
 * Practice answers have no attempt; one row per learner and exercise holds the
 * latest. The advisory lock makes two submits at once take turns, so they
 * cannot both insert a row. Returns the recording the new answer replaced, if any.
 */
export async function saveLatestPracticeAnswer(customerId: string, exerciseId: string, answer: PracticeAnswer): Promise<string | null> {
  // Any earlier teacher grade belonged to the previous answer, so it is cleared.
  const data = { ...answer, mediaId: answer.mediaId ?? null, manualScore: null, feedback: "", gradedBy: null, gradedAt: null };
  return db.$transaction(async (tx) => {
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
    return previous?.mediaId ?? null;
  });
}
