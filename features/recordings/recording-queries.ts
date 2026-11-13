import "server-only";
import { db } from "@/lib/db";

/** Who recorded an answer, where the file is and which course it belongs to. Null when the answer has no recording. */
export function findRecordingAnswer(answerId: string) {
  return db.answer.findFirst({
    where: { id: answerId, mediaId: { not: null } },
    select: { customerId: true, media: { select: { storageKey: true } }, exercise: { select: { courseId: true } } },
  });
}
