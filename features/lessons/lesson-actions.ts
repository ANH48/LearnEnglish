"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requireCourseAccess } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { requireUuid } from "@/lib/forms/require-uuid";
import { type ActionState, validationFailed } from "@/lib/forms/action-state";

const lessonSchema = z.object({
  title: z.string().trim().min(1, "Bắt buộc").max(200),
  content: z.string().max(50_000),
  status: z.enum(["draft", "published"]),
});

/** Create (lessonId = null) or update a lesson. New lessons go to the end of the course. */
export async function saveLessonAction(
  courseId: string,
  lessonId: string | null,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireCourseAccess("course.manage", courseId);
  if (lessonId !== null) requireUuid(lessonId);
  const parsed = lessonSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content") ?? "",
    status: formData.get("status"),
  });
  if (!parsed.success) return validationFailed(parsed.error);

  let savedId = lessonId;
  if (lessonId) {
    const updated = await db.lesson.updateMany({
      where: { id: lessonId, courseId, deletedAt: null },
      data: parsed.data,
    });
    if (updated.count === 0) return { error: "Không tìm thấy bài học." };
  } else {
    const last = await db.lesson.aggregate({ where: { courseId, deletedAt: null }, _max: { position: true } });
    const created = await db.lesson.create({
      data: { ...parsed.data, courseId, position: (last._max.position ?? -1) + 1 },
    });
    savedId = created.id;
  }

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}/lessons/${savedId}`);
}

export async function deleteLessonAction(courseId: string, lessonId: string): Promise<void> {
  const actor = await requireCourseAccess("course.manage", courseId);
  requireUuid(lessonId);
  await db.$transaction([
    db.lesson.updateMany({ where: { id: lessonId, courseId, deletedAt: null }, data: { deletedAt: new Date() } }),
    // Exercises of a deleted lesson are removed with it.
    db.exercise.updateMany({ where: { lessonId, courseId, deletedAt: null }, data: { deletedAt: new Date() } }),
  ]);
  await writeAuditLog(actor.id, "lesson.delete", "lesson", lessonId, { courseId });
  revalidatePath(`/admin/courses/${courseId}`);
}

/** Swap a lesson with the one just above or below it. */
export async function moveLessonAction(courseId: string, lessonId: string, direction: "up" | "down"): Promise<void> {
  await requireCourseAccess("course.manage", courseId);
  requireUuid(lessonId);
  if (direction !== "up" && direction !== "down") return;
  const lessons = await db.lesson.findMany({
    where: { courseId, deletedAt: null },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const from = lessons.findIndex((lesson) => lesson.id === lessonId);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= lessons.length) return;

  [lessons[from], lessons[to]] = [lessons[to], lessons[from]];
  // Rewriting every position also repairs gaps left by deleted lessons.
  await db.$transaction(
    lessons.map((lesson, position) => db.lesson.update({ where: { id: lesson.id }, data: { position } })),
  );
  revalidatePath(`/admin/courses/${courseId}`);
}
