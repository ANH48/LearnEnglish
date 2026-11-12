"use server";

import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { solutionText } from "@/features/exercise-player/learner-exercise";
import { requireApprovedCourse, requireCustomer } from "@/lib/auth/current-customer";
import { db } from "@/lib/db";
import { gradeExercise, parseResponse, scoreFor } from "@/lib/grading/grade-exercise";
import { type ChallengeItem, openChallenge } from "./challenge-data";
import { type CompletionOutcome, EMPTY_STREAK, type StreakState, applyCompletion, vnDay } from "./challenge-streak";

/** Starts a new challenge (or resumes the unfinished one) and shows it. */
export async function startChallengeAction(courseSlug: string): Promise<void> {
  const { customer, course } = await requireApprovedCourse(String(courseSlug));
  await openChallenge(customer.id, course.id, true);
  redirect(`/learn/${course.slug}/challenge`);
}

export type ItemResult = { score: number; points: number; parts: boolean[]; solution: string };
export type ChallengeResult =
  | { ok: true; score: number; maxPoints: number; items: ItemResult[]; change: CompletionOutcome["change"]; streak: StreakState }
  | { ok: false; error: string };

const uuid = z.uuid();

/**
 * Grades a whole challenge once and moves the streak. The session row is locked
 * so a double submit cannot count twice; the streak row is locked per learner
 * and course so two sessions finishing together apply one after the other.
 */
export async function submitChallengeAction(sessionId: string, responses: unknown): Promise<ChallengeResult> {
  const customer = await requireCustomer();
  if (!uuid.safeParse(sessionId).success || !Array.isArray(responses)) return { ok: false, error: "Bài nộp không hợp lệ." };

  // No revalidate here: the page keeps showing the graded challenge; "Làm lượt mới" reloads it.
  return db.$transaction(async (tx): Promise<ChallengeResult> => {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM challenge_sessions
      WHERE id = ${sessionId}::uuid AND customer_id = ${customer.id}::uuid AND completed_at IS NULL
      FOR UPDATE`;
    if (locked.length === 0) return { ok: false, error: "Lượt challenge này đã nộp hoặc không còn nữa." };
    const session = await tx.challengeSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        course: {
          select: { deletedAt: true, status: true, enrollments: { where: { customerId: customer.id, status: "approved" }, select: { customerId: true } } },
        },
      },
    });
    const { course } = session;
    if (course.deletedAt || course.status !== "published" || course.enrollments.length === 0) return { ok: false, error: "Không tìm thấy khóa học." };

    const items = session.items as ChallengeItem[];
    const cleaned = items.map((item, i) => parseResponse(item.type, responses[i]));
    const graded: ItemResult[] = items.map((item, i) => {
      const outcome = cleaned[i] ? gradeExercise(item.type, item.answerKey, cleaned[i]) : null;
      const score = outcome ? scoreFor(outcome.ratio, item.points) : 0;
      return { score, points: item.points, parts: outcome?.parts ?? [], solution: solutionText({ id: "", ...item }) };
    });
    const score = Math.round(graded.reduce((sum, r) => sum + r.score, 0) * 100) / 100;
    const ratio = session.maxPoints > 0 ? score / session.maxPoints : 0;

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`streak:${customer.id}:${session.courseId}`}))`;
    const key = { customerId_courseId: { customerId: customer.id, courseId: session.courseId } };
    const row = await tx.courseStreak.findUnique({ where: key });
    const stored = row ? { current: row.current, best: row.best, toRestore: row.toRestore, lastDay: row.lastDay } : EMPTY_STREAK;
    const { state, change } = applyCompletion(stored, vnDay(new Date()), ratio);
    await tx.courseStreak.upsert({ where: key, update: state, create: { ...key.customerId_courseId, ...state } });

    await tx.challengeSession.update({
      where: { id: sessionId },
      data: {
        responses: cleaned.map((r) => r ?? {}) as Prisma.InputJsonArray,
        results: graded.map(({ score: s, parts }) => ({ score: s, parts })),
        score,
        outcome: change,
        completedAt: new Date(),
      },
    });
    return { ok: true, score, maxPoints: session.maxPoints, items: graded, change, streak: state };
  });
}
