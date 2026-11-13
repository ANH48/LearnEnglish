import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { clearExpiredWritingImages } from "@/features/writing-ocr/writing-image-queries";

export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Vercel Cron (vercel.json) calls this once a day: deletes learners' writing photos older than 3 days. */
export async function GET(request: Request) {
  if (!authorized(request)) return new NextResponse(null, { status: 401 });
  return NextResponse.json({ deleted: await clearExpiredWritingImages() });
}
