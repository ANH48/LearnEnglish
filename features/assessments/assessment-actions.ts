"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requireCourseAccess } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { type ActionState, validationFailed } from "@/lib/forms/action-state";
import { requireUuid } from "@/lib/forms/require-uuid";
import { assessmentFormSchema, buildAssessmentFields, readPickedQuestions } from "./assessment-fields";

const pagePath = (courseId: string, assessmentId: string) => `/admin/courses/${courseId}/assessments/${assessmentId}`;

/** Create (assessmentId = null) or update an assessment inside a course the actor may manage. */
export async function saveAssessmentAction(
  courseId: string,
  assessmentId: string | null,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireCourseAccess("assessment.manage", courseId);
  if (assessmentId !== null) requireUuid(assessmentId);
  const parsed = assessmentFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailed(parsed.error);
  const built = buildAssessmentFields(parsed.data);
  if (!built.ok) return { error: built.error };

  let savedId = assessmentId;
  if (assessmentId) {
    const updated = await db.assessment.updateMany({ where: { id: assessmentId, courseId, deletedAt: null }, data: built.fields });
    if (updated.count === 0) return { error: "Không tìm thấy bài kiểm tra." };
  } else {
    savedId = (await db.assessment.create({ data: { ...built.fields, courseId, createdBy: actor.id } })).id;
  }

  revalidatePath("/admin/assessments");
  redirect(pagePath(courseId, savedId as string));
}

/**
 * Replaces the question list. Refused once a learner has started, because
 * changing questions or points would make earlier scores mean something else.
 */
export async function saveAssessmentQuestionsAction(
  courseId: string,
  assessmentId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireCourseAccess("assessment.manage", courseId);
  requireUuid(assessmentId);
  const picked = readPickedQuestions(formData);
  if (!picked) return { error: "Điểm mỗi câu phải từ 1 đến 100, thứ tự từ 0 đến 999." };

  const assessment = await db.assessment.findFirst({ where: { id: assessmentId, courseId, deletedAt: null }, select: { id: true } });
  if (!assessment) return { error: "Không tìm thấy bài kiểm tra." };

  // Every picked exercise must belong to this same course, whatever the form says.
  const owned = await db.exercise.count({ where: { id: { in: picked.map((p) => p.exerciseId) }, courseId, deletedAt: null } });
  if (owned !== picked.length) return { error: "Có bài tập không thuộc khóa học này." };

  const locked = await db.$transaction(async (tx) => {
    // Takes turns with a learner pressing "start", so the list cannot change under a new attempt.
    await tx.$queryRaw`SELECT id FROM assessments WHERE id = ${assessmentId}::uuid FOR UPDATE`;
    if ((await tx.attempt.count({ where: { assessmentId } })) > 0) return true;
    await tx.assessmentExercise.deleteMany({ where: { assessmentId } });
    await tx.assessmentExercise.createMany({
      data: picked.map((p, position) => ({ assessmentId, exerciseId: p.exerciseId, points: p.points, position })),
    });
    return false;
  });
  if (locked) return { error: "Đã có học viên làm bài, không đổi câu hỏi được nữa." };

  revalidatePath(pagePath(courseId, assessmentId));
  redirect(pagePath(courseId, assessmentId));
}

export async function deleteAssessmentAction(courseId: string, assessmentId: string): Promise<void> {
  const actor = await requireCourseAccess("assessment.manage", courseId);
  requireUuid(assessmentId);
  await db.assessment.updateMany({ where: { id: assessmentId, courseId, deletedAt: null }, data: { deletedAt: new Date() } });
  await writeAuditLog(actor.id, "assessment.delete", "assessment", assessmentId, { courseId });
  revalidatePath("/admin/assessments");
  redirect("/admin/assessments");
}
