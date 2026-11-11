import { notFound } from "next/navigation";
import { z } from "zod";

const uuid = z.uuid();

/**
 * Ids reach server actions and pages as untrusted values: a URL segment, or a
 * bound action argument that a crafted request can replace with any JSON,
 * including a Prisma filter object such as `{ not: "..." }`. Anything that is
 * not a plain UUID string is treated as "does not exist".
 */
export function requireUuid(...values: unknown[]): void {
  for (const value of values) {
    if (!uuid.safeParse(value).success) notFound();
  }
}

/** Keeps only well-formed, distinct ids from a submitted list. */
export function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}
