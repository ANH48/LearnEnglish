import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { ExerciseTable } from "@/features/exercises/exercise-table";
import { LessonForm } from "@/features/lessons/lesson-form";
import { requireCourseAccess } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { requireUuid } from "@/lib/forms/require-uuid";

/** `/lessons/new` creates a lesson; any other id edits that lesson and lists its exercises. */
export default async function LessonPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id: courseId, lessonId } = await params;
  await requireCourseAccess("course.manage", courseId);
  const back = { href: `/admin/courses/${courseId}`, label: "Khóa học" };

  if (lessonId === "new") {
    return (
      <>
        <PageHeader title="Thêm bài học" back={back} />
        <LessonForm courseId={courseId} />
      </>
    );
  }

  requireUuid(lessonId);
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, courseId, deletedAt: null },
    include: { exercises: { where: { deletedAt: null }, orderBy: { position: "asc" } } },
  });
  if (!lesson) notFound();

  return (
    <>
      <PageHeader title={lesson.title} back={back} />
      <div className="grid gap-10">
        <LessonForm courseId={courseId} lesson={lesson} />
        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Bài tập của bài học</h2>
            <Link
              href={`/admin/courses/${courseId}/exercises/new?lessonId=${lesson.id}`}
              className={buttonVariants({ size: "sm" })}
            >
              Thêm bài tập
            </Link>
          </div>
          <ExerciseTable courseId={courseId} exercises={lesson.exercises} />
        </section>
      </div>
    </>
  );
}
