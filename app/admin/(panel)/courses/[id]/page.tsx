import Link from "next/link";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { PageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { deleteCourseAction } from "@/features/courses/course-actions";
import { CourseForm } from "@/features/courses/course-form";
import { loadCourseFormOptions } from "@/features/courses/course-form-options";
import { ExerciseTable } from "@/features/exercises/exercise-table";
import { LessonTable } from "@/features/lessons/lesson-table";
import { requireCourseAccess } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireCourseAccess("course.manage", id);

  const [course, options] = await Promise.all([
    db.course.findUniqueOrThrow({
      where: { id },
      include: {
        categories: true,
        teachers: true,
        lessons: {
          where: { deletedAt: null },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          include: { _count: { select: { exercises: { where: { deletedAt: null } } } } },
        },
        // Exercises not tied to a lesson: only usable inside assessments.
        exercises: { where: { deletedAt: null, lessonId: null }, orderBy: { position: "asc" } },
      },
    }),
    loadCourseFormOptions(actor, id),
  ]);

  const base = `/admin/courses/${course.id}`;
  return (
    <>
      <PageHeader title={course.title} back={{ href: "/admin/courses", label: "Khóa học" }} />
      <div className="grid gap-10">
        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Bài học</h2>
            <Link href={`${base}/lessons/new`} className={buttonVariants({ size: "sm" })}>
              Thêm bài học
            </Link>
          </div>
          <LessonTable
            courseId={course.id}
            lessons={course.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              status: l.status,
              exerciseCount: l._count.exercises,
            }))}
          />
        </section>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Bài tập không gắn bài học</h2>
            <Link href={`${base}/exercises/new`} className={buttonVariants({ size: "sm", variant: "outline" })}>
              Thêm bài tập
            </Link>
          </div>
          <ExerciseTable courseId={course.id} exercises={course.exercises} />
        </section>

        <section className="grid gap-4">
          <h2 className="text-lg font-semibold">Thông tin khóa học</h2>
          <CourseForm
            {...options}
            course={{
              id: course.id,
              title: course.title,
              slug: course.slug,
              description: course.description,
              status: course.status,
              categoryIds: course.categories.map((c) => c.categoryId),
              teacherIds: course.teachers.map((t) => t.staffId),
            }}
          />
        </section>

        <section className="grid gap-2">
          <h2 className="text-lg font-semibold">Xóa khóa học</h2>
          <p className="text-sm text-muted-foreground">Học viên sẽ không còn thấy khóa học. Điểm đã có vẫn được giữ.</p>
          <ConfirmActionButton
            action={deleteCourseAction.bind(null, course.id)}
            label="Xóa khóa học"
            variant="destructive"
            confirmMessage={`Xóa khóa học "${course.title}"?`}
          />
        </section>
      </div>
    </>
  );
}
