import "server-only";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export type ExerciseCount = { answered: number; total: number };

/**
 * Per lesson: how many published exercises it has, and how many of them the
 * learner has submitted at least once in practice (any score counts as done).
 */
export async function lessonExerciseCounts(customerId: string, lessonIds: string[]): Promise<Map<string, ExerciseCount>> {
  const counts = new Map<string, ExerciseCount>(lessonIds.map((id) => [id, { answered: 0, total: 0 }]));
  if (lessonIds.length === 0) return counts;
  const exercises = await db.exercise.findMany({
    where: { lessonId: { in: lessonIds }, deletedAt: null, status: "published" },
    select: { lessonId: true, answers: { where: { customerId, attemptId: null }, select: { id: true }, take: 1 } },
  });
  for (const exercise of exercises) {
    const count = exercise.lessonId ? counts.get(exercise.lessonId) : undefined;
    if (!count) continue;
    count.total++;
    if (exercise.answers.length > 0) count.answered++;
  }
  return counts;
}

/** After a practice submit: once every exercise of the lesson has an answer, the lesson is marked done. */
export async function markLessonDoneWhenAllAnswered(customerId: string, lessonId: string | null): Promise<void> {
  if (!lessonId) return;
  const count = (await lessonExerciseCounts(customerId, [lessonId])).get(lessonId);
  if (!count || count.total === 0 || count.answered < count.total) return;
  await db.lessonProgress.upsert({
    where: { customerId_lessonId: { customerId, lessonId } },
    update: {},
    create: { customerId, lessonId },
  });
  revalidatePath("/learn", "layout");
}
