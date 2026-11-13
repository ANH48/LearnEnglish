import { NextResponse } from "next/server";
import { z } from "zod";
import { findRecordingAnswer } from "@/features/recordings/recording-queries";
import { getCurrentCustomer } from "@/lib/auth/current-customer";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { hasPermission } from "@/lib/permissions/check-permission";
import { canAccessCourse } from "@/lib/permissions/course-scope";
import { presignDownload } from "@/lib/storage/object-storage";

const notFound = () => new NextResponse(null, { status: 404 });

/**
 * Plays back the recording of one answer: redirects to a short-lived storage
 * URL, but only for the learner who recorded it or a teacher who may grade in
 * that course. Everyone else gets 404.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ answerId: string }> }) {
  const { answerId } = await params;
  if (!z.uuid().safeParse(answerId).success) return notFound();

  const answer = await findRecordingAnswer(answerId);
  if (!answer?.media) return notFound();

  const customer = await getCurrentCustomer();
  let allowed = customer?.id === answer.customerId;
  if (!allowed) {
    const staff = await getCurrentStaff();
    allowed = staff !== null && hasPermission(staff, "grading.manual") && (await canAccessCourse(staff, answer.exercise.courseId));
  }
  if (!allowed) return notFound();

  return NextResponse.redirect(await presignDownload(answer.media.storageKey), { status: 302, headers: { "Cache-Control": "no-store" } });
}
