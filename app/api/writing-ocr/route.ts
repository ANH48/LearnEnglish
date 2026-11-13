import { NextResponse } from "next/server";
import { z } from "zod";
import { canAnswerNow } from "@/features/exercise-player/answerable-exercise";
import { readTextFromImages } from "@/features/writing-ocr/read-text-from-images";
import { claimWritingImagesForRead } from "@/features/writing-ocr/writing-image-queries";
import { getCurrentCustomer } from "@/lib/auth/current-customer";
import { presignDownload } from "@/lib/storage/object-storage";
import { MAX_WRITING_IMAGES, OCR_TIMEOUT_MS, isOwnWritingImageKey } from "@/lib/storage/writing-image-rules";

// The learner's page gives up after 2 minutes; the function may run a little longer to answer.
export const maxDuration = 130;

const bodySchema = z.object({
  attemptId: z.uuid().nullable(),
  exerciseId: z.uuid(),
  keys: z.array(z.string()).min(1).max(MAX_WRITING_IMAGES),
});

const fail = (error: string, status: number) => NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });

/** Reads the text in the learner's photos (uploaded before with a signed URL) and returns it for review. */
export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) return fail("Bạn cần đăng nhập lại.", 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Yêu cầu không hợp lệ.", 400);
  const { attemptId, exerciseId } = parsed.data;
  const keys = [...new Set(parsed.data.keys)];
  if (!keys.every((key) => isOwnWritingImageKey(key, customer.id))) return fail("Không đọc được ảnh này.", 403);
  if (!(await canAnswerNow(customer, attemptId, exerciseId, "writing"))) return fail("Không gửi được ảnh cho câu này.", 403);

  const claimed = await claimWritingImagesForRead({ customerId: customer.id, exerciseId, attemptId }, keys);
  if (!claimed.ok && claimed.reason === "read_limit") return fail("Các ảnh này đã đọc nhiều lần rồi. Hãy chụp lại hoặc gõ bài trực tiếp.", 429);
  if (!claimed.ok && claimed.reason === "bad_file") return fail("Có ảnh chưa tải lên được hoặc quá nặng. Hãy chọn lại ảnh.", 400);
  if (!claimed.ok) return fail("Ảnh đã hết hạn hoặc không thuộc câu này. Hãy chọn lại ảnh.", 400);

  const imageUrls = await Promise.all(keys.map((key) => presignDownload(key, 600)));
  const result = await readTextFromImages({
    imageUrls,
    actor: `customer:${customer.id}`,
    subject: { exerciseId, attemptId, imageCount: keys.length },
    // Stop waiting for the model when the learner leaves or gives up, not only at the time limit.
    signal: AbortSignal.any([request.signal, AbortSignal.timeout(OCR_TIMEOUT_MS - 5_000)]),
  });
  if (result.ok) return NextResponse.json({ ok: true, text: result.text }, { headers: { "Cache-Control": "no-store" } });
  if (result.reason === "timeout") return fail("Quá 2 phút vẫn chưa đọc xong. Hãy thử lại.", 504);
  if (result.reason === "busy") return fail("Hệ thống đọc chữ đang bận. Đợi khoảng 1 phút rồi bấm thử lại.", 503);
  if (result.reason === "unavailable") return fail("Tính năng đọc chữ từ ảnh đang tạm tắt. Hãy gõ bài trực tiếp.", 503);
  return fail("Chưa đọc được chữ trong ảnh. Hãy chụp rõ hơn rồi thử lại.", 502);
}
