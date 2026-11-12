"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requireCourseAccess } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { requireUuid } from "@/lib/forms/require-uuid";
import { type ActionState, validationFailed } from "@/lib/forms/action-state";
import { EXERCISE_TYPES, buildExerciseContent } from "./exercise-content";

const exerciseSchema = z.object({
  type: z.enum(EXERCISE_TYPES as [string, ...string[]]),
  prompt: z.string().trim().min(1, "Bắt buộc").max(2000),
  points: z.coerce.number().int().min(1).max(100),
  status: z.enum(["draft", "published"]),
  lessonId: z.union([z.literal(""), z.uuid()]),
  payload: z.string().max(20_000),
});

function parsePayload(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Where to go back to after saving or deleting an exercise. */
function parentPath(courseId: string, lessonId: string | null): string {
  return lessonId ? `/admin/courses/${courseId}/lessons/${lessonId}` : `/admin/courses/${courseId}`;
}

/** Create (exerciseId = null) or update an exercise inside a course the actor may manage. */
export async function saveExerciseAction(
  courseId: string,
  exerciseId: string | null,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireCourseAccess("course.manage", courseId);
  if (exerciseId !== null) requireUuid(exerciseId);
  const parsed = exerciseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;
  const type = input.type as (typeof EXERCISE_TYPES)[number];

  const content = buildExerciseContent(type, parsePayload(input.payload));
  if (!content.ok) return { error: content.error };

  // The lesson must belong to this same course, whatever the form says.
  const lessonId = input.lessonId || null;
  if (lessonId) {
    const lesson = await db.lesson.findFirst({ where: { id: lessonId, courseId, deletedAt: null } });
    if (!lesson) return { error: "Bài học không thuộc khóa học này." };
  }

  const fields = {
    type,
    prompt: input.prompt,
    points: input.points,
    status: input.status,
    lessonId,
    data: content.data as Prisma.InputJsonObject,
    answerKey: content.answerKey as Prisma.InputJsonObject,
  };

  const existing = exerciseId
    ? await db.exercise.findFirst({ where: { id: exerciseId, courseId, deletedAt: null } })
    : null;
  if (exerciseId && !existing) return { error: "Không tìm thấy bài tập." };
  // Answers already handed in were graded as the old type; changing it would turn them into something else.
  if (existing && existing.type !== type && (await db.attempt.count({ where: { assessment: { exercises: { some: { exerciseId: existing.id } } } } })) > 0) {
    return { error: "Bài tập này nằm trong bài kiểm tra đã có học viên làm, không đổi loại được." };
  }

  // A new exercise, or one moved to another lesson, goes to the end of its new list.
  let position = existing?.position ?? 0;
  if (!existing || existing.lessonId !== lessonId) {
    const last = await db.exercise.aggregate({
      where: { courseId, lessonId, deletedAt: null },
      _max: { position: true },
    });
    position = (last._max.position ?? -1) + 1;
  }

  if (existing) {
    await db.exercise.update({ where: { id: existing.id }, data: { ...fields, position } });
  } else {
    await db.exercise.create({ data: { ...fields, courseId, position } });
  }

  const back = parentPath(courseId, lessonId);
  revalidatePath(back);
  redirect(back);
}

export async function deleteExerciseAction(courseId: string, exerciseId: string): Promise<void> {
  const actor = await requireCourseAccess("course.manage", courseId);
  requireUuid(exerciseId);
  await db.$transaction([
    db.exercise.updateMany({ where: { id: exerciseId, courseId, deletedAt: null }, data: { deletedAt: new Date() } }),
    // It leaves tests nobody has started. Tests with attempts keep it, so their scores and totals still match.
    db.assessmentExercise.deleteMany({ where: { exerciseId, exercise: { courseId }, assessment: { attempts: { none: {} } } } }),
  ]);
  await writeAuditLog(actor.id, "exercise.delete", "exercise", exerciseId, { courseId });
  revalidatePath(`/admin/courses/${courseId}`, "layout");
}
