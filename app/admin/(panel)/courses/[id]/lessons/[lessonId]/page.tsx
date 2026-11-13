import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { ExerciseTable } from "@/features/exercises/exercise-table";
import { LessonBlockList } from "@/features/lesson-blocks/lesson-block-list";
import { parseLessonBlocks } from "@/features/lesson-blocks/lesson-blocks";
import { LessonForm } from "@/features/lessons/lesson-form";
import { findLessonForEdit } from "@/features/lessons/lesson-queries";
import { requireCourseAccess } from "@/lib/auth/current-staff";
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
  const lesson = await findLessonForEdit(courseId, lessonId);
  if (!lesson) notFound();
  const blocks = parseLessonBlocks(lesson.blocks);

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
        {blocks.length > 0 && (
          <section className="grid max-w-2xl gap-6">
            <div className="grid gap-1">
              <h2 className="text-lg font-semibold">Nội dung theo khối (xem thử)</h2>
              <p className="text-sm text-muted-foreground">
                Đúng những gì học viên thấy và nghe, theo thứ tự: câu, cấu trúc, truyện, từ vựng, bản dịch. Hai bài tập nằm ở bảng phía trên. Phần này được nhập bằng script, chưa sửa được ở đây.
              </p>
            </div>
            <LessonBlockList lessonId={lesson.id} blocks={blocks} exercises={new Map()} />
          </section>
        )}
      </div>
    </>
  );
}
