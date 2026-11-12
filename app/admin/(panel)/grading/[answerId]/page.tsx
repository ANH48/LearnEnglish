import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/action-form";
import { FormField } from "@/components/admin/form-field";
import { PageHeader } from "@/components/admin/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { responseText } from "@/features/exercise-player/learner-exercise";
import { gradeAnswerAction } from "@/features/manual-grading/grade-answer-action";
import { gradingAnswerInclude, manualAnswerWhere, maxPointsFor } from "@/features/manual-grading/grading-queue";
import { requirePermission } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { requireUuid } from "@/lib/forms/require-uuid";

/** One written or spoken answer: read or listen, give a score and a comment. Grading again replaces the earlier grade. */
export default async function GradeAnswerPage({ params }: { params: Promise<{ answerId: string }> }) {
  const { answerId } = await params;
  const staff = await requirePermission("grading.manual");
  requireUuid(answerId);
  const answer = await db.answer.findFirst({ where: { id: answerId, ...manualAnswerWhere(staff) }, include: gradingAnswerInclude });
  if (!answer) notFound();

  const max = maxPointsFor(answer);
  const text = responseText(answer.exercise, answer.response);
  const minWords = (answer.exercise.data as { minWords?: number } | null)?.minWords ?? 0;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <>
      <PageHeader
        title={`Chấm bài của ${answer.customer.fullName}`}
        description={`${answer.exercise.course.title} · ${answer.attempt ? answer.attempt.assessment.title : `Bài học: ${answer.exercise.lesson?.title ?? "—"}`}`}
        back={{ href: "/admin/grading", label: "Chấm bài" }}
      />
      <div className="grid max-w-2xl gap-6">
        <section className="grid gap-1">
          <h2 className="font-semibold">Đề bài</h2>
          <p className="whitespace-pre-wrap text-sm">{answer.exercise.prompt}</p>
        </section>
        <section className="grid gap-1">
          <h2 className="font-semibold">Bài làm</h2>
          {answer.mediaId ? (
            <audio controls src={`/api/recordings/${answer.id}`} className="w-full" aria-label="Bản thu của học viên" />
          ) : (
            <>
              <p className="rounded-xl border p-3 text-sm leading-6 whitespace-pre-wrap">{text || "(không có nội dung)"}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {words} từ{minWords > 0 && ` · yêu cầu tối thiểu ${minWords} từ`}
              </p>
            </>
          )}
        </section>
        <ActionForm action={gradeAnswerAction.bind(null, answer.id, answer.updatedAt.toISOString())} submitLabel="Lưu điểm">
          <FormField label={`Điểm (tối đa ${max})`} htmlFor="score">
            <Input id="score" name="score" type="number" min={0} max={max} step={0.25} defaultValue={answer.manualScore != null ? Number(answer.manualScore) : ""} required className="w-32" />
          </FormField>
          <FormField label="Nhận xét cho học viên" htmlFor="feedback">
            <Textarea id="feedback" name="feedback" rows={5} maxLength={2000} defaultValue={answer.feedback} />
          </FormField>
        </ActionForm>
      </div>
    </>
  );
}
