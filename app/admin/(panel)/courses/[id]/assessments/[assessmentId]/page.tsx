import { notFound } from "next/navigation";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { PageHeader } from "@/components/admin/page-header";
import { deleteAssessmentAction } from "@/features/assessments/assessment-actions";
import { AssessmentForm } from "@/features/assessments/assessment-form";
import { findAssessmentForEdit } from "@/features/assessments/assessment-queries";
import { AssessmentQuestionPicker } from "@/features/assessments/assessment-question-picker";
import { listCourseExercisesForPicker } from "@/features/exercises/exercise-queries";
import { requireCourseAccess } from "@/lib/auth/current-staff";
import { requireUuid } from "@/lib/forms/require-uuid";

/** `/assessments/new` creates an assessment; any other id edits it and picks its questions. */
export default async function AssessmentPage({ params }: { params: Promise<{ id: string; assessmentId: string }> }) {
  const { id: courseId, assessmentId } = await params;
  await requireCourseAccess("assessment.manage", courseId);
  const back = { href: "/admin/assessments", label: "Bài kiểm tra" };

  if (assessmentId === "new") {
    return (
      <>
        <PageHeader title="Thêm bài kiểm tra" description="Lưu xong rồi chọn câu hỏi." back={back} />
        <AssessmentForm courseId={courseId} />
      </>
    );
  }

  requireUuid(assessmentId);
  const [assessment, exercises] = await Promise.all([
    findAssessmentForEdit(courseId, assessmentId),
    listCourseExercisesForPicker(courseId),
  ]);
  if (!assessment) notFound();
  const picked = new Map(assessment.exercises.map((link) => [link.exerciseId, link]));

  return (
    <>
      <PageHeader title={assessment.title} back={back} />
      <div className="grid gap-10">
        <AssessmentForm courseId={courseId} assessment={assessment} />

        <section className="grid gap-4">
          <div>
            <h2 className="text-lg font-semibold">Câu hỏi</h2>
            <p className="text-sm text-muted-foreground">Chọn từ bài tập của khóa học. Câu có số thứ tự nhỏ hơn hiện trước.</p>
          </div>
          <AssessmentQuestionPicker
            courseId={courseId}
            assessmentId={assessment.id}
            locked={assessment._count.attempts > 0}
            rows={exercises.map((exercise) => ({
              id: exercise.id,
              prompt: exercise.prompt,
              type: exercise.type,
              lessonTitle: exercise.lesson?.title ?? null,
              points: picked.get(exercise.id)?.points ?? exercise.points,
              position: picked.get(exercise.id)?.position ?? null,
            }))}
          />
        </section>

        <section className="grid gap-2">
          <h2 className="text-lg font-semibold">Xóa bài kiểm tra</h2>
          <p className="text-sm text-muted-foreground">Học viên sẽ không còn thấy bài này. Điểm đã có vẫn được giữ.</p>
          <ConfirmActionButton
            action={deleteAssessmentAction.bind(null, courseId, assessment.id)}
            label="Xóa bài kiểm tra"
            variant="destructive"
            confirmMessage={`Xóa bài "${assessment.title}"?`}
          />
        </section>
      </div>
    </>
  );
}
