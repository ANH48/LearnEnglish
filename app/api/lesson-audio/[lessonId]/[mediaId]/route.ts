import { NextResponse } from "next/server";
import { z } from "zod";
import { isApprovedLearner } from "@/features/enrollments/enrollment-queries";
import { blockAudioIds, parseLessonBlocks } from "@/features/lesson-blocks/lesson-blocks";
import { findAudioFile, findLessonAudioSource } from "@/features/lessons/lesson-queries";
import { getCurrentCustomer } from "@/lib/auth/current-customer";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { canAccessCourse } from "@/lib/permissions/course-scope";
import { presignDownload } from "@/lib/storage/object-storage";

const notFound = () => new NextResponse(null, { status: 404 });
// The player keeps using the signed URL for seeking, and a learner may stay on a lesson for a long time.
const URL_LIFETIME_SECONDS = 6 * 60 * 60;

/**
 * Plays one audio file of a lesson: redirects to a short-lived storage URL.
 * Only a file the lesson's blocks refer to is served, and only to a learner
 * approved in that published course or to staff who may open the course.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ lessonId: string; mediaId: string }> }) {
  const { lessonId, mediaId } = await params;
  if (!z.uuid().safeParse(lessonId).success || !z.uuid().safeParse(mediaId).success) return notFound();

  const lesson = await findLessonAudioSource(lessonId);
  if (!lesson || !blockAudioIds(parseLessonBlocks(lesson.blocks)).includes(mediaId)) return notFound();

  const customer = await getCurrentCustomer();
  let allowed =
    customer !== null &&
    lesson.status === "published" &&
    lesson.course.status === "published" &&
    (await isApprovedLearner(lesson.courseId, customer.id));
  if (!allowed) {
    const staff = await getCurrentStaff();
    allowed = staff !== null && (await canAccessCourse(staff, lesson.courseId));
  }
  if (!allowed) return notFound();

  const media = await findAudioFile(mediaId);
  if (!media) return notFound();
  // Not cached, so every page load passes the permission check again and gets a fresh URL.
  return NextResponse.redirect(await presignDownload(media.storageKey, URL_LIFETIME_SECONDS), { headers: { "Cache-Control": "no-store" } });
}
