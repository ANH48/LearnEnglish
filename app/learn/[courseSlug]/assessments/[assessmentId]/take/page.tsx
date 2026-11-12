import { redirect } from "next/navigation";
import { AttemptRunner } from "@/features/attempts/attempt-runner";
import { loadAssessmentQuestions, requireLearnerAssessment } from "@/features/attempts/learner-assessment";
import { toLearnerExercise } from "@/features/exercise-player/learner-exercise";
import { db } from "@/lib/db";

type Props = { params: Promise<{ courseSlug: string; assessmentId: string }> };

/** The running attempt. Reopening this page restores every saved answer and the real time left. */
export default async function TakeAssessmentPage({ params }: Props) {
  const { courseSlug, assessmentId } = await params;
  const { customer, course, assessment, now } = await requireLearnerAssessment(courseSlug, assessmentId);

  const attempt = await db.attempt.findFirst({
    where: { assessmentId, customerId: customer.id, status: "in_progress" },
    include: { answers: { select: { exerciseId: true, response: true } } },
  });
  if (!attempt) redirect(`/learn/${course.slug}/assessments/${assessment.id}`);

  const questions = await loadAssessmentQuestions(assessmentId);
  const saved = new Map(attempt.answers.map((a) => [a.exerciseId, a.response]));

  return (
    <div className="grid max-w-2xl gap-4">
      <h1 className="text-2xl font-semibold text-balance">{assessment.title}</h1>
      <AttemptRunner
        attemptId={attempt.id}
        remainingMs={Math.max(0, attempt.deadlineAt.getTime() - now.getTime())}
        questions={questions.map((link) => ({
          // Points come from the assessment, which may weigh a question differently from its lesson.
          exercise: toLearnerExercise({ ...link.exercise, points: link.points }),
          saved: saved.get(link.exerciseId) ?? null,
        }))}
      />
    </div>
  );
}
