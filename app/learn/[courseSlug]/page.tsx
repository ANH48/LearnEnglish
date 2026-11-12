import Link from "next/link";
import { ASSESSMENT_KIND_LABELS, type AssessmentKindName } from "@/lib/assessments/attempt-rules";
import { ProgressBar } from "@/features/progress/progress-bar";
import { requireApprovedCourse } from "@/lib/auth/current-customer";
import { db } from "@/lib/db";

/** Lesson list of a course the learner is approved for. Lessons are not locked: any can be opened. */
export default async function LearnCoursePage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const { customer, course } = await requireApprovedCourse(courseSlug);

  const assessments = await db.assessment.findMany({
    where: { courseId: course.id, deletedAt: null, status: "published" },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, kind: true, durationMinutes: true },
  });
  const lessons = await db.lesson.findMany({
    where: { courseId: course.id, deletedAt: null, status: "published" },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      progress: { where: { customerId: customer.id }, select: { lessonId: true } },
      _count: { select: { exercises: { where: { deletedAt: null, status: "published" } } } },
    },
  });
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
                <span className="text-xs text-muted-foreground">{lesson._count.exercises} bài tập</span>
              </span>
              {lesson.progress.length > 0 && <span className="text-sm text-primary">Đã học xong</span>}
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
