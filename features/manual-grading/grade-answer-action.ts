"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { settleAttempt } from "@/features/attempts/finalize-attempt";
import { requirePermission } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { type ActionState, validationFailed } from "@/lib/forms/action-state";
import { requireUuid } from "@/lib/forms/require-uuid";
import { gradingAnswerInclude, manualAnswerWhere, maxPointsFor } from "./grading-queue";

const gradeSchema = z.object({
  // Checked as text first: coercing an empty field would silently grade the answer 0.
  score: z.string().trim().min(1, "Bắt buộc").transform(Number).pipe(z.number().min(0).multipleOf(0.25, "Điểm lẻ theo bước 0,25")),
  feedback: z.string().trim().max(2000),
});

/** Stores the teacher's score and comment, then recomputes the attempt's total when the answer belongs to one. */
export async function gradeAnswerAction(answerId: string, readAt: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("grading.manual");
  requireUuid(answerId);
  const parsed = gradeSchema.safeParse({ score: formData.get("score") ?? "", feedback: formData.get("feedback") ?? "" });
  if (!parsed.success) return validationFailed(parsed.error);

  const answer = await db.answer.findFirst({ where: { id: answerId, ...manualAnswerWhere(staff) }, include: gradingAnswerInclude });
  if (!answer) return { error: "Không tìm thấy bài làm." };
  const max = maxPointsFor(answer);
  if (parsed.data.score > max) return { error: `Điểm tối đa của câu này là ${max}.` };

  // `readAt` is the answer's version when the grading page was opened. A learner who
  // sent a new practice text since then must not get this grade on text nobody read.
  const version = new Date(typeof readAt === "string" ? readAt : NaN);
  const graded = await db.$transaction(async (tx) => {
    const updated = await tx.answer.updateMany({
      where: { id: answer.id, updatedAt: Number.isNaN(version.getTime()) ? undefined : version },
      data: { manualScore: parsed.data.score, feedback: parsed.data.feedback, gradedBy: staff.id, gradedAt: new Date() },
    });
    if (updated.count === 0) return false;
    if (answer.attemptId) await settleAttempt(tx, answer.attemptId);
    return true;
  });
  if (!graded) return { error: "Học viên vừa nộp lại bài này. Hãy tải lại trang để đọc bản mới." };

  revalidatePath("/admin/grading");
  redirect("/admin/grading");
}
