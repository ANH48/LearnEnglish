import "server-only";
import { db } from "@/lib/db";
import { deleteObjects, statObject } from "@/lib/storage/object-storage";
import { MAX_WRITING_IMAGE_BYTES, normalizeWritingImageMime, writingImageExpiry } from "@/lib/storage/writing-image-rules";

/** Photos one learner may upload in 24 hours. */
const DAILY_IMAGE_LIMIT = 30;
/** Times one photo may be read; enough for "try again", not for calling the paid model in a loop. */
const MAX_READS_PER_IMAGE = 3;

type Owner = { customerId: string; exerciseId: string; attemptId: string | null };

/**
 * Reserves a photo before its upload URL is handed out: the row exists (and expires) even if the
 * learner never comes back, so the daily job also deletes files nobody asked to read.
 * The per-customer lock makes the daily count and the insert one step, so parallel calls cannot pass the cap.
 */
export async function reserveWritingImage(owner: Owner, storageKey: string, mime: string): Promise<boolean> {
  const now = new Date();
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`writing-images:${owner.customerId}`}))`;
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sentToday = await tx.writingImage.count({ where: { customerId: owner.customerId, createdAt: { gte: since } } });
    if (sentToday >= DAILY_IMAGE_LIMIT) return false;
    await tx.writingImage.create({ data: { ...owner, storageKey, mime, sizeBytes: 0, createdAt: now, expiresAt: writingImageExpiry(now) } });
    return true;
  });
}

export type ClaimResult = { ok: true } | { ok: false; reason: "not_found" | "bad_file" | "read_limit" };

/**
 * Before a read: every key must be a reserved, unexpired photo of this learner for this question,
 * actually uploaded as a small image, and read fewer than MAX_READS_PER_IMAGE times. Counts the read.
 */
export async function claimWritingImagesForRead(owner: Owner, keys: string[]): Promise<ClaimResult> {
  const now = new Date();
  const rows = await db.writingImage.findMany({ where: { ...owner, storageKey: { in: keys }, expiresAt: { gt: now } } });
  if (rows.length !== keys.length) return { ok: false, reason: "not_found" };

  for (const row of rows.filter((r) => r.sizeBytes === 0)) {
    const stored = await statObject(row.storageKey);
    const mime = normalizeWritingImageMime(stored?.mime);
    if (!stored || !mime || stored.sizeBytes === 0 || stored.sizeBytes > MAX_WRITING_IMAGE_BYTES) {
      // A missing upload keeps its row (the learner may retry); a wrong file is removed now.
      if (stored) {
        await deleteObjects([row.storageKey]);
        await db.writingImage.delete({ where: { id: row.id } });
      }
      return { ok: false, reason: "bad_file" };
    }
    await db.writingImage.update({ where: { id: row.id }, data: { sizeBytes: stored.sizeBytes, mime } });
  }

  const counted = await db.writingImage.updateMany({
    where: { id: { in: rows.map((r) => r.id) }, readCount: { lt: MAX_READS_PER_IMAGE } },
    data: { readCount: { increment: 1 } },
  });
  return counted.count === rows.length ? { ok: true } : { ok: false, reason: "read_limit" };
}

/** Deletes photos past their 3 days, file then row, in batches until done or the time budget is spent. */
export async function clearExpiredWritingImages(budgetMs = 45_000): Promise<number> {
  const started = Date.now();
  let deleted = 0;
  while (Date.now() - started < budgetMs) {
    const expired = await db.writingImage.findMany({
      where: { expiresAt: { lte: new Date() } },
      select: { id: true, storageKey: true },
      orderBy: { expiresAt: "asc" },
      take: 1000,
    });
    if (expired.length === 0) break;
    // Rows go even if a file could not be deleted (it is logged), so the job never loops on one file.
    await deleteObjects(expired.map((image) => image.storageKey));
    const { count } = await db.writingImage.deleteMany({ where: { id: { in: expired.map((image) => image.id) } } });
    deleted += count;
  }
  return deleted;
}
