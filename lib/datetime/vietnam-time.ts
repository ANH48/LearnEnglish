/**
 * Teachers type exam times in Vietnam time (UTC+7, no daylight saving), while
 * the server runs in UTC. These convert a `datetime-local` value both ways.
 */

const OFFSET_MS = 7 * 60 * 60_000;
const LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** "2026-11-12T08:00" typed in Vietnam time → the instant it names, or null when malformed. */
export function parseVietnamLocal(value: string): Date | null {
  if (!LOCAL_PATTERN.test(value)) return null;
  const asUtc = new Date(`${value}:00.000Z`);
  if (Number.isNaN(asUtc.getTime())) return null;
  return new Date(asUtc.getTime() - OFFSET_MS);
}

/** The value a `datetime-local` input needs to show this instant in Vietnam time. */
export function toVietnamLocalInput(date: Date): string {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 16);
}

/** "08:00 12/11/2026" in Vietnam time, for display. */
export function formatVietnamDateTime(date: Date): string {
  const [day, time] = toVietnamLocalInput(date).split("T");
  const [year, month, dayOfMonth] = day.split("-");
  return `${time} ${dayOfMonth}/${month}/${year}`;
}
