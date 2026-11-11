import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { type ExerciseTypeName, toEditorPayload } from "@/features/exercises/exercise-content";
import { ExerciseForm } from "@/features/exercises/exercise-form";
import { requireCourseAccess } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { requireUuid } from "@/lib/forms/require-uuid";

type Props = {
  params: Promise<{ id: string; exerciseId: string }>;
  searchParams: Promise<{ lessonId?: string }>;
};

/** `/exercises/new` creates an exercise; any other id edits that exercise. */
export default async function ExercisePage({ params, searchParams }: Props) {
  const { id: courseId, exerciseId } = await params;
  await requireCourseAccess("course.manage", courseId);

  const lessons = await db.lesson.findMany({
    where: { courseId, deletedAt: null },
    orderBy: { position: "asc" },
    select: { id: true, title: true },
  });
  const back = { href: `/admin/courses/${courseId}`, label: "Khóa học" };

  if (exerciseId === "new") {
    const { lessonId } = await searchParams;
    return (
      <>
        <PageHeader title="Thêm bài tập" back={back} />
        <ExerciseForm
          courseId={courseId}
          lessons={lessons}
          defaultLessonId={lessons.some((l) => l.id === lessonId) ? lessonId : undefined}
        />
      </>
    );
  }

  requireUuid(exerciseId);
  const exercise = await db.exercise.findFirst({ where: { id: exerciseId, courseId, deletedAt: null } });
  if (!exercise) notFound();
  const type = exercise.type as ExerciseTypeName;

  return (
    <>
      <PageHeader title="Sửa bài tập" back={back} />
      <ExerciseForm
        courseId={courseId}
        lessons={lessons}
        exercise={{
          id: exercise.id,
          type,
          prompt: exercise.prompt,
          points: exercise.points,
          status: exercise.status,
          lessonId: exercise.lessonId,
          payload: toEditorPayload(type, exercise.data, exercise.answerKey),
        }}
      />
    </>
  );
}
