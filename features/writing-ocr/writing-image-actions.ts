"use server";

import { randomUUID } from "node:crypto";
import { canAnswerNow } from "@/features/exercise-player/answerable-exercise";
import { requireCustomer } from "@/lib/auth/current-customer";
import { presignUpload } from "@/lib/storage/object-storage";
import { normalizeWritingImageMime, writingImageKey } from "@/lib/storage/writing-image-rules";
import { reserveWritingImage } from "./writing-image-queries";

export type ImageUploadTicket = { ok: true; url: string; key: string; mime: string } | { ok: false; error: string };

/** A short-lived URL the browser uploads one (already shrunk) photo to. The server picks where it goes. */
export async function requestWritingImageUploadAction(attemptId: string | null, exerciseId: string, mime: string): Promise<ImageUploadTicket> {
  const customer = await requireCustomer();
  const cleanMime = normalizeWritingImageMime(mime);
  if (!cleanMime) return { ok: false, error: "Ảnh này chưa đúng định dạng, hãy chọn ảnh JPG hoặc PNG." };
  if (!(await canAnswerNow(customer, attemptId, exerciseId, "writing"))) return { ok: false, error: "Không gửi được ảnh cho câu này." };
  const key = writingImageKey(customer.id, randomUUID(), cleanMime);
  if (!(await reserveWritingImage({ customerId: customer.id, exerciseId, attemptId }, key, cleanMime))) {
    return { ok: false, error: "Hôm nay bạn đã gửi nhiều ảnh rồi, hãy gõ bài hoặc thử lại vào ngày mai." };
  }
  return { ok: true, url: await presignUpload(key, cleanMime), key, mime: cleanMime };
}
