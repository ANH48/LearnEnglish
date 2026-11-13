import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { listPublishedAssessments } from "@/features/assessments/assessment-queries";
import { listLearnerLessons } from "@/features/lessons/lesson-queries";
import { ASSESSMENT_KIND_LABELS, type AssessmentKindName } from "@/lib/assessments/attempt-rules";
import { ChallengeCourseCard } from "@/features/challenge/challenge-course-card";
import { lessonExerciseCounts } from "@/features/progress/lesson-exercise-completion";
import { ProgressBar } from "@/features/progress/progress-bar";
import { requireApprovedCourse } from "@/lib/auth/current-customer";

/** Lesson list of a course the learner is approved for. Lessons are not locked: any can be opened. */
export default async function LearnCoursePage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const { customer, course } = await requireApprovedCourse(courseSlug);

  const [assessments, lessons] = await Promise.all([listPublishedAssessments(course.id), listLearnerLessons(course.id, customer.id)]);
  const counts = await lessonExerciseCounts(customer.id, lessons.map((lesson) => lesson.id));
  const done = lessons.filter((lesson) => lesson.progress.length > 0).length;

  return (
    <div className="grid max-w-2xl gap-6">
      <div className="grid gap-2">
        <Link href="/learn" className="text-sm text-muted-foreground hover:underline">
          ← Khóa của tôi
        </Link>
        <h1 className="text-2xl font-semibold text-balance">{course.title}</h1>
        <ProgressBar done={done} total={lessons.length} />
      </div>

      {lessons.length > 0 && <ChallengeCourseCard customerId={customer.id} courseId={course.id} courseSlug={course.slug} level={done} />}

      {lessons.length === 0 && <p className="text-muted-foreground">Khóa học chưa có bài học nào.</p>}
      <ol className="grid gap-2">
        {lessons.map((lesson, index) => (
          <li key={lesson.id}>
            <Link
              href={`/learn/${course.slug}/${lesson.id}`}
              className="flex items-center gap-3 rounded-xl border p-3 hover:border-primary"
            >
              <span className="w-6 text-center text-sm text-muted-foreground tabular-nums">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{lesson.title}</span>
                <ExerciseCountLabel count={counts.get(lesson.id)} />
              </span>
              <DoneMark done={lesson.progress.length > 0} />
            </Link>
          </li>
        ))}
      </ol>

      {assessments.length > 0 && (
        <section className="grid gap-2">
          <h2 className="text-xl font-semibold">Bài kiểm tra</h2>
          <ul className="grid gap-2">
            {assessments.map((assessment) => (
              <li key={assessment.id}>
                <Link
                  href={`/learn/${course.slug}/assessments/${assessment.id}`}
                  className="flex items-center gap-3 rounded-xl border p-3 hover:border-primary"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{assessment.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {ASSESSMENT_KIND_LABELS[assessment.kind as AssessmentKindName]} · {assessment.durationMinutes} phút
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ExerciseCountLabel({ count }: { count?: { answered: number; total: number } }) {
  if (!count || count.total === 0) return <span className="text-xs text-muted-foreground">Không có bài tập</span>;
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      Đã làm {count.answered}/{count.total} bài tập
    </span>
  );
}

/** Green tick once the lesson is done (every exercise submitted, or marked done by the learner). */
function DoneMark({ done }: { done: boolean }) {
  return done ? (
    <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="size-5" aria-hidden />
      Đã học
    </span>
  ) : (
    <span className="flex items-center gap-1 text-sm text-muted-foreground">
      <Circle className="size-5" aria-hidden />
      Chưa học
    </span>
  );
}
