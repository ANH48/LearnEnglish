/** Rules for learner voice recordings. Pure, so they are shared by the browser, the server and tests. */

/** What browsers record: Chrome and Firefox produce webm or ogg, Safari mp4. */
const EXTENSION_BY_MIME: Record<string, string> = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a" };

export const RECORDING_MIME_CANDIDATES = ["audio/webm", "audio/mp4", "audio/ogg"];
export const MAX_RECORDING_BYTES = 15 * 1024 * 1024;

/** "audio/webm;codecs=opus" → "audio/webm"; null when the type is not an accepted recording. */
export function normalizeRecordingMime(mime: unknown): string | null {
  if (typeof mime !== "string") return null;
  const base = mime.split(";")[0].trim().toLowerCase();
  return Object.hasOwn(EXTENSION_BY_MIME, base) ? base : null;
}

/** The server picks the key; the learner's id is part of it so one learner cannot claim another's file. */
export function recordingKey(customerId: string, fileId: string, mime: string): string {
  return `recordings/${customerId}/${fileId}.${EXTENSION_BY_MIME[mime]}`;
}

const KEY_PATTERN = /^recordings\/([0-9a-f-]{36})\/[0-9a-f-]{36}\.(webm|ogg|m4a)$/;

export function isOwnRecordingKey(key: unknown, customerId: string): key is string {
  return typeof key === "string" && KEY_PATTERN.exec(key)?.[1] === customerId;
}
