/** Rules for photos of handwritten answers. Pure, so they are shared by the browser, the server and tests. */

/** The browser re-encodes every photo before upload, so only these arrive. */
const EXTENSION_BY_MIME: Record<string, string> = { "image/jpeg": "jpg", "image/webp": "webp", "image/png": "png" };

/** The OCR model reads at most 3 images per request. */
export const MAX_WRITING_IMAGES = 3;
/** After the browser shrinks a photo; anything larger was not shrunk and is refused. */
export const MAX_WRITING_IMAGE_BYTES = 3 * 1024 * 1024;
/** A file the learner picks before shrinking; bigger than this is not a phone photo. */
export const MAX_ORIGINAL_IMAGE_BYTES = 25 * 1024 * 1024;
/** Photos are deleted this long after upload. */
export const WRITING_IMAGE_RETENTION_DAYS = 3;
/** The learner waits this long for the text before being told to try again. */
export const OCR_TIMEOUT_MS = 120_000;

export function normalizeWritingImageMime(mime: unknown): string | null {
  if (typeof mime !== "string") return null;
  const base = mime.split(";")[0].trim().toLowerCase();
  return Object.hasOwn(EXTENSION_BY_MIME, base) ? base : null;
}

/** The server picks the key; the learner's id is part of it so one learner cannot claim another's file. */
export function writingImageKey(customerId: string, fileId: string, mime: string): string {
  return `writing-images/${customerId}/${fileId}.${EXTENSION_BY_MIME[mime]}`;
}

const KEY_PATTERN = /^writing-images\/([0-9a-f-]{36})\/[0-9a-f-]{36}\.(jpg|webp|png)$/;

export function isOwnWritingImageKey(key: unknown, customerId: string): key is string {
  return typeof key === "string" && KEY_PATTERN.exec(key)?.[1] === customerId;
}

export function writingImageExpiry(from: Date): Date {
  return new Date(from.getTime() + WRITING_IMAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}
