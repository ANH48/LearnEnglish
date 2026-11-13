"use server";

import { randomUUID } from "node:crypto";
import { canAnswerNow } from "@/features/exercise-player/answerable-exercise";
import { saveLatestPracticeAnswer } from "@/features/exercise-player/practice-answer";
import { type CurrentCustomer, requireCustomer } from "@/lib/auth/current-customer";
import { db } from "@/lib/db";
import { deleteObject, presignUpload, statObject } from "@/lib/storage/object-storage";
import { MAX_RECORDING_BYTES, isOwnRecordingKey, normalizeRecordingMime, recordingKey } from "@/lib/storage/recording-rules";

const REFUSED = { ok: false as const, error: "Không lưu được bản thu cho câu này." };
const canRecordFor = (customer: CurrentCustomer, attemptId: unknown, exerciseId: unknown) => canAnswerNow(customer, attemptId, exerciseId, "speaking");

export type UploadTicket = { ok: true; url: string; key: string; mime: string } | { ok: false; error: string };

/** Step 1: a short-lived URL the browser uploads the recording to. The server picks where it goes. */
export async function requestRecordingUploadAction(attemptId: string | null, exerciseId: string, mime: string): Promise<UploadTicket> {
  const customer = await requireCustomer();
  const cleanMime = normalizeRecordingMime(mime);
  if (!cleanMime) return { ok: false, error: "Trình duyệt này thu âm ở định dạng chưa hỗ trợ." };
  if (!(await canRecordFor(customer, attemptId, exerciseId))) return REFUSED;
  const key = recordingKey(customer.id, randomUUID(), cleanMime);
  return { ok: true, url: await presignUpload(key, cleanMime), key, mime: cleanMime };
}

export type RecordingSaved = { ok: true; answerId: string } | { ok: false; error: string };

/** Step 2, after the upload: check the stored file and make it the learner's answer, replacing any earlier take. */
export async function saveRecordingAnswerAction(attemptId: string | null, exerciseId: string, key: string): Promise<RecordingSaved> {
  const customer = await requireCustomer();
  // The key carries the learner's id, so nobody can attach a file they did not upload.
  if (!isOwnRecordingKey(key, customer.id) || !(await canRecordFor(customer, attemptId, exerciseId))) return REFUSED;

  const stored = await statObject(key);
  const mime = normalizeRecordingMime(stored?.mime);
  if (!stored || !mime || stored.sizeBytes === 0) return REFUSED;
  if (stored.sizeBytes > MAX_RECORDING_BYTES) {
    await deleteObject(key);
    return { ok: false, error: "Bản thu quá lớn. Hãy thu ngắn hơn." };
  }

  const media = await db.mediaFile.create({ data: { kind: "recording", storageKey: key, mime, sizeBytes: stored.sizeBytes } });
  let replacedMediaId: string | null;
  if (attemptId === null) {
    replacedMediaId = await saveLatestPracticeAnswer(customer.id, exerciseId, { response: {}, autoScore: null, mediaId: media.id });
  } else {
    const result = await db.$transaction(async (tx) => {
      // Same lock as the text autosave: hand-in waits, and a take arriving after hand-in is refused.
      const open = await tx.$queryRaw<unknown[]>`SELECT id FROM attempts WHERE id = ${attemptId}::uuid AND status = 'in_progress' FOR SHARE`;
      if (open.length === 0) return null;
      const where = { attemptId_exerciseId: { attemptId, exerciseId } };
      const previous = await tx.answer.findUnique({ where, select: { mediaId: true } });
      await tx.answer.upsert({ where, update: { mediaId: media.id }, create: { attemptId, exerciseId, customerId: customer.id, mediaId: media.id } });
      return { replaced: previous?.mediaId ?? null };
    });
    if (!result) {
      await removeMedia(media.id);
      return REFUSED;
    }
    replacedMediaId = result.replaced;
  }
  if (replacedMediaId) await removeMedia(replacedMediaId);

  const answer = await db.answer.findFirstOrThrow({ where: { customerId: customer.id, exerciseId, attemptId, mediaId: media.id }, select: { id: true } });
  return { ok: true, answerId: answer.id };
}

/** Drops a recording nobody points to any more, row and file. */
async function removeMedia(mediaId: string): Promise<void> {
  const media = await db.mediaFile.delete({ where: { id: mediaId } }).catch(() => null);
  if (media) await deleteObject(media.storageKey);
}
