"use server";

import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { START_CHECK_MESSAGES, canStillSave, checkCanStart, computeDeadline } from "@/lib/assessments/attempt-rules";
import { requireCustomer } from "@/lib/auth/current-customer";
import { db } from "@/lib/db";
import type { ActionState } from "@/lib/forms/action-state";
import { isAutoGraded, parseResponse, parseWritingResponse } from "@/lib/grading/grade-exercise";
import { finalizeAttempt, finalizeExpiredAttempts } from "./finalize-attempt";
import { takeableBy } from "./learner-assessment";

const uuid = z.uuid();
const isUuid = (value: unknown): value is string => uuid.safeParse(value).success;

/** Starts a new attempt, or goes back to the one still running. The deadline is fixed here, on the server. */
export async function startAttemptAction(assessmentId: string): Promise<ActionState> {
  const customer = await requireCustomer();
  const missing = { error: "Không tìm thấy bài kiểm tra." };
  if (!isUuid(assessmentId)) return missing;

  const assessment = await db.assessment.findFirst({
    where: { id: assessmentId, ...takeableBy(customer.id) },
    include: { course: { select: { slug: true } }, _count: { select: { exercises: true } } },
  });
  if (!assessment) return missing;
  if (assessment._count.exercises === 0) return { error: "Bài kiểm tra chưa có câu hỏi." };

  const now = new Date();
  await finalizeExpiredAttempts({ assessmentId, customerId: customer.id }, now);

  const refusal = await db.$transaction(async (tx) => {
    // Takes turns with a teacher saving the question list, so questions cannot change under a new attempt.
    await tx.$queryRaw`SELECT id FROM assessments WHERE id = ${assessmentId}::uuid FOR SHARE`;
    // Two "start" clicks at once take turns, so they cannot both create an attempt.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`attempt:${customer.id}:${assessmentId}`}))`;
    const attempts = await tx.attempt.findMany({ where: { assessmentId, customerId: customer.id }, select: { status: true } });
    if (attempts.some((a) => a.status === "in_progress")) return null;

    const check = checkCanStart(assessment, attempts.length, now);
    if (check !== "ok") return START_CHECK_MESSAGES[check];
    await tx.attempt.create({
      data: {
        assessmentId,
        customerId: customer.id,
        startedAt: now,
        deadlineAt: computeDeadline(now, assessment.durationMinutes, assessment),
      },
    });
    return null;
  });
  if (refusal) return { error: refusal };

  redirect(`/learn/${assessment.course.slug}/assessments/${assessmentId}/take`);
}

export type SaveResult = { ok: true } | { ok: false; error: string };

/** Autosave of one answer while the attempt is running. Nothing is graded here. */
export async function saveAttemptAnswerAction(attemptId: string, exerciseId: string, response: unknown): Promise<SaveResult> {
  const customer = await requireCustomer();
  const closed: SaveResult = { ok: false, error: "Bài làm đã đóng, không lưu được nữa." };
  if (!isUuid(attemptId) || !isUuid(exerciseId)) return closed;

  const attempt = await db.attempt.findFirst({
    where: { id: attemptId, customerId: customer.id, status: "in_progress", assessment: takeableBy(customer.id) },
    select: {
      deadlineAt: true,
      assessment: { select: { exercises: { where: { exerciseId }, select: { exercise: { select: { type: true } } } } } },
    },
  });
  const type = attempt?.assessment.exercises[0]?.exercise.type;
  if (!attempt || !type || !canStillSave(attempt.deadlineAt, new Date())) return closed;

  // Only the validated shape is stored, never the raw request body.
  const cleaned = isAutoGraded(type) ? parseResponse(type, response) : type === "writing" ? parseWritingResponse(response) : null;
  if (!cleaned) return { ok: false, error: "Câu trả lời chưa hợp lệ." };

  return db.$transaction(async (tx) => {
    // Holds the attempt open while this answer is written: hand-in waits for it,
    // and a save arriving after hand-in is refused instead of landing ungraded.
    const open = await tx.$queryRaw<unknown[]>`SELECT id FROM attempts WHERE id = ${attemptId}::uuid AND status = 'in_progress' FOR SHARE`;
    if (open.length === 0) return closed;

    if (type === "writing" && !(cleaned as { text: string }).text.trim()) {
      // An emptied text is the same as no answer; keep it out of the teacher's queue.
      await tx.answer.deleteMany({ where: { attemptId, exerciseId } });
      return { ok: true };
    }
    const data = { response: cleaned as Prisma.InputJsonObject };
    await tx.answer.upsert({
      where: { attemptId_exerciseId: { attemptId, exerciseId } },
      update: data,
      create: { ...data, attemptId, exerciseId, customerId: customer.id },
    });
    return { ok: true };
  });
}

/** Hands the attempt in (also called by the page when the clock reaches zero). */
export async function submitAttemptAction(attemptId: string): Promise<void> {
  const customer = await requireCustomer();
  if (!isUuid(attemptId)) return;
  const attempt = await db.attempt.findFirst({
    where: { id: attemptId, customerId: customer.id },
    select: { id: true, assessmentId: true, assessment: { select: { course: { select: { slug: true } } } } },
  });
  if (!attempt) return;
  await finalizeAttempt(attempt.id);
  redirect(`/learn/${attempt.assessment.course.slug}/assessments/${attempt.assessmentId}/result/${attempt.id}`);
}
