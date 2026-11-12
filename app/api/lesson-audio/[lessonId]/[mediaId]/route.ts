import { NextResponse } from "next/server";
import { z } from "zod";
import { blockAudioIds, parseLessonBlocks } from "@/features/lesson-blocks/lesson-blocks";
import { getCurrentCustomer } from "@/lib/auth/current-customer";
import { getCurrentStaff } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
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

  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, deletedAt: null, course: { deletedAt: null } },
    select: { blocks: true, status: true, courseId: true, course: { select: { status: true } } },
  });
  if (!lesson || !blockAudioIds(parseLessonBlocks(lesson.blocks)).includes(mediaId)) return notFound();

  const customer = await getCurrentCustomer();
  let allowed =
    customer !== null &&
    lesson.status === "published" &&
    lesson.course.status === "published" &&
    (await db.enrollment.findFirst({
      where: { courseId: lesson.courseId, customerId: customer.id, status: "approved" },
      select: { id: true },
    })) !== null;
  if (!allowed) {
    const staff = await getCurrentStaff();
    allowed = staff !== null && (await canAccessCourse(staff, lesson.courseId));
  }
  if (!allowed) return notFound();

  const media = await db.mediaFile.findFirst({ where: { id: mediaId, kind: "audio" }, select: { storageKey: true } });
  if (!media) return notFound();
  // Not cached, so every page load passes the permission check again and gets a fresh URL.
  return NextResponse.redirect(await presignDownload(media.storageKey, URL_LIFETIME_SECONDS), { headers: { "Cache-Control": "no-store" } });
}
