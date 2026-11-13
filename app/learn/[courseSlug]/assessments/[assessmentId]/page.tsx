import Link from "next/link";
import { listMyAttempts, sumAssessmentQuestions } from "@/features/attempts/attempt-queries";
import { requireLearnerAssessment } from "@/features/attempts/learner-assessment";
import { StartAttemptButton } from "@/features/attempts/start-attempt-button";
import { ASSESSMENT_KIND_LABELS, type AssessmentKindName, START_CHECK_MESSAGES, checkCanStart } from "@/lib/assessments/attempt-rules";
import { formatVietnamDateTime } from "@/lib/datetime/vietnam-time";

type Props = { params: Promise<{ courseSlug: string; assessmentId: string }> };

const ATTEMPT_STATUS: Record<string, string> = { in_progress: "Đang làm", submitted: "Chờ teacher chấm", graded: "Đã có điểm" };

/** One assessment: its rules, the learner's attempts, and the button to start or continue. */
export default async function LearnAssessmentPage({ params }: Props) {
  const { courseSlug, assessmentId } = await params;
  const { customer, course, assessment, now } = await requireLearnerAssessment(courseSlug, assessmentId);

  const [attempts, questions] = await Promise.all([
    listMyAttempts(assessmentId, customer.id),
    sumAssessmentQuestions(assessmentId),
  ]);
  const running = attempts.some((a) => a.status === "in_progress");
  const check = checkCanStart(assessment, attempts.length, now);
  const base = `/learn/${course.slug}/assessments/${assessment.id}`;

  return (
    <div className="grid max-w-2xl gap-6">
      <div className="grid gap-2">
        <Link href={`/learn/${course.slug}`} className="text-sm text-muted-foreground hover:underline">
          ← {course.title}
        </Link>
        <h1 className="text-2xl font-semibold text-balance">{assessment.title}</h1>
        <p className="text-sm text-muted-foreground">{ASSESSMENT_KIND_LABELS[assessment.kind as AssessmentKindName]}</p>
      </div>

      <ul className="grid gap-1 rounded-xl border p-4 text-sm">
        <li>Thời gian làm bài: {assessment.durationMinutes} phút</li>
        <li>
          Số câu: {questions._count} · Tổng điểm: {questions._sum.points ?? 0}
        </li>
        <li>
          Số lượt đã dùng: {attempts.length}/{assessment.maxAttempts}
        </li>
        {assessment.kind === "exam" && assessment.opensAt && assessment.closesAt && (
          <li>
            Mở từ {formatVietnamDateTime(assessment.opensAt)} đến {formatVietnamDateTime(assessment.closesAt)} (giờ Việt Nam). Đáp án hiện sau khi bài thi đóng.
          </li>
        )}
        <li>Đồng hồ chạy ngay khi bắt đầu và không dừng khi bạn đóng trang. Hết giờ bài tự nộp.</li>
      </ul>

      {running ? (
        <StartAttemptButton assessmentId={assessment.id} label="Tiếp tục làm bài" />
      ) : check === "ok" ? (
        <StartAttemptButton assessmentId={assessment.id} label="Bắt đầu làm bài" />
      ) : (
        <p className="text-sm text-muted-foreground">{START_CHECK_MESSAGES[check]}</p>
      )}

      {attempts.length > 0 && (
        <section className="grid gap-2">
          <h2 className="text-lg font-semibold">Các lượt làm</h2>
          <ol className="grid gap-2">
            {attempts.map((attempt, index) => (
              <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
                <span>
                  Lượt {index + 1} · {ATTEMPT_STATUS[attempt.status]}
                  {attempt.status !== "in_progress" && (
                    <span className="tabular-nums">
                      {" "}
                      · {Number(attempt.score ?? 0)}/{questions._sum.points ?? 0} điểm
                    </span>
                  )}
                </span>
                {attempt.status !== "in_progress" && (
                  <Link href={`${base}/result/${attempt.id}`} className="underline">
                    Xem kết quả
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
