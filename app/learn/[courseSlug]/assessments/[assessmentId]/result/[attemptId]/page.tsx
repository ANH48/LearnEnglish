import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { loadAssessmentQuestions, requireLearnerAssessment } from "@/features/attempts/learner-assessment";
import { responseText, solutionText } from "@/features/exercise-player/learner-exercise";
import { canSeeSolutions } from "@/lib/assessments/attempt-rules";
import { formatVietnamDateTime } from "@/lib/datetime/vietnam-time";
import { db } from "@/lib/db";
import { requireUuid } from "@/lib/forms/require-uuid";
import { needsManualGrading } from "@/lib/grading/grade-exercise";

type Props = { params: Promise<{ courseSlug: string; assessmentId: string; attemptId: string }> };

/** Score, per-question marks and teacher feedback of one finished attempt. */
export default async function AttemptResultPage({ params }: Props) {
  const { courseSlug, assessmentId, attemptId } = await params;
  const { customer, course, assessment, now } = await requireLearnerAssessment(courseSlug, assessmentId);
  requireUuid(attemptId);

  const attempt = await db.attempt.findFirst({
    where: { id: attemptId, assessmentId, customerId: customer.id },
    include: { answers: true },
  });
  if (!attempt) notFound();
  const base = `/learn/${course.slug}/assessments/${assessment.id}`;
  if (attempt.status === "in_progress") redirect(`${base}/take`);

  const questions = await loadAssessmentQuestions(assessmentId);
  const answers = new Map(attempt.answers.map((a) => [a.exerciseId, a]));
  const total = questions.reduce((sum, link) => sum + link.points, 0);
  const showSolutions = canSeeSolutions(assessment, now);

  return (
    <div className="grid max-w-2xl gap-6">
      <div className="grid gap-2">
        <Link href={base} className="text-sm text-muted-foreground hover:underline">
          ← {assessment.title}
        </Link>
        <h1 className="text-2xl font-semibold">Kết quả</h1>
        <p className="text-lg">
          Điểm:{" "}
          <span className="font-semibold tabular-nums">
            {Number(attempt.score ?? 0)}/{total}
          </span>
        </p>
        {attempt.status === "submitted" && <p className="text-sm text-muted-foreground">Còn câu đang chờ teacher chấm; điểm sẽ được cộng thêm.</p>}
        {!showSolutions && assessment.closesAt && (
          <p className="text-sm text-muted-foreground">Đáp án hiện sau khi bài thi đóng lúc {formatVietnamDateTime(assessment.closesAt)}.</p>
        )}
      </div>

      <ol className="grid gap-3">
        {questions.map((link, index) => {
          const answer = answers.get(link.exerciseId);
          const manual = needsManualGrading(link.exercise.type);
          const waiting = manual && answer !== undefined && answer.gradedAt === null;
          const score = Number(answer?.autoScore ?? 0) + Number(answer?.manualScore ?? 0);
          const given = answer ? responseText(link.exercise, answer.response) : "";
          return (
            <li key={link.exerciseId} className="grid gap-1 rounded-xl border p-3 text-sm">
              <p className="font-medium">
                Câu {index + 1}. {link.exercise.prompt}
              </p>
              <p className="tabular-nums">{waiting ? "Chờ teacher chấm" : `${score}/${link.points} điểm`}</p>
              {answer?.mediaId ? (
                <audio controls src={`/api/recordings/${answer.id}`} className="w-full" aria-label="Bản thu của bạn" />
              ) : (
                <p className="whitespace-pre-wrap text-muted-foreground">Bạn trả lời: {given || "(bỏ trống)"}</p>
              )}
              {showSolutions && !manual && <p className="text-muted-foreground">Đáp án: {solutionText(link.exercise)}</p>}
              {answer?.feedback && <p>Nhận xét của teacher: {answer.feedback}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
