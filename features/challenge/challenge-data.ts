import "server-only";
import { randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { CHALLENGE_TYPES, type ChallengeExercise, shuffleExercise, shuffled } from "./challenge-shuffle";
import { EMPTY_STREAK, type StreakState, streakOn, vnDay } from "./challenge-streak";

/** A challenge item as stored in a session: a shuffled exercise and the lesson it came from. */
export type ChallengeItem = ChallengeExercise & { lessonTitle: string };

const random = () => randomInt(0, 2 ** 31) / 2 ** 31;

/** The learner's streak in a course as of today (a streak past its day reads as broken). */
export async function readStreak(customerId: string, courseId: string): Promise<StreakState> {
  const row = await db.courseStreak.findUnique({ where: { customerId_courseId: { customerId, courseId } } });
  const stored = row ? { current: row.current, best: row.best, toRestore: row.toRestore, lastDay: row.lastDay } : EMPTY_STREAK;
  return streakOn(stored, vnDay(new Date()));
}

/** Published lessons of the course the learner has finished (green tick). Their count is the challenge level. */
async function finishedLessonIds(customerId: string, courseId: string): Promise<string[]> {
  const rows = await db.lessonProgress.findMany({
    where: { customerId, lesson: { courseId, deletedAt: null, status: "published" } },
    select: { lessonId: true },
  });
  return rows.map((row) => row.lessonId);
}

export async function challengeLevel(customerId: string, courseId: string): Promise<number> {
  return (await finishedLessonIds(customerId, courseId)).length;
}

/** Every challenge-able exercise of the finished lessons, each shuffled, in a mixed order. */
async function buildItems(lessonIds: string[]): Promise<ChallengeItem[]> {
  const exercises = await db.exercise.findMany({
    where: { lessonId: { in: lessonIds }, deletedAt: null, status: "published", type: { in: [...CHALLENGE_TYPES] } },
    select: { type: true, prompt: true, points: true, data: true, answerKey: true, lesson: { select: { title: true } } },
  });
  const items = exercises.flatMap((exercise) => {
    const stored = { ...exercise, data: (exercise.data ?? {}) as Record<string, unknown>, answerKey: (exercise.answerKey ?? {}) as Record<string, unknown> };
    const item = shuffleExercise(stored, random);
    return item ? [{ ...item, lessonTitle: exercise.lesson?.title ?? "" }] : [];
  });
  return shuffled(items, random);
}

export type OpenSession = { id: string; level: number; items: ChallengeItem[] };

/**
 * The learner's unfinished challenge, or a new one. An unfinished one built
 * before another lesson was finished is replaced, so the level always matches.
 * Returns null when no lesson is finished yet, or the finished ones have nothing to practise.
 */
export async function openChallenge(customerId: string, courseId: string, startNew: boolean): Promise<OpenSession | null> {
  const lessonIds = await finishedLessonIds(customerId, courseId);
  if (lessonIds.length === 0) return null;

  const open = await db.challengeSession.findFirst({
    where: { customerId, courseId, completedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (open && open.level === lessonIds.length) return { id: open.id, level: open.level, items: open.items as ChallengeItem[] };
  if (!startNew) return null;

  const items = await buildItems(lessonIds);
  if (items.length === 0) return null;
  await db.challengeSession.deleteMany({ where: { customerId, courseId, completedAt: null } });
  const created = await db.challengeSession.create({
    data: { customerId, courseId, level: lessonIds.length, items: items as Prisma.InputJsonArray, maxPoints: items.reduce((sum, item) => sum + item.points, 0) },
  });
  return { id: created.id, level: created.level, items };
}
