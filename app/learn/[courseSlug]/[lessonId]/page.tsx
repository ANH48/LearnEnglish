import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { Button, buttonVariants } from "@/components/ui/button";
import { ExercisePlayer } from "@/features/exercise-player/exercise-player";
import { toLearnerExercise } from "@/features/exercise-player/learner-exercise";
import { setLessonCompletedAction } from "@/features/progress/lesson-progress-actions";
import { requireApprovedCourse } from "@/lib/auth/current-customer";
import { db } from "@/lib/db";
import { requireUuid } from "@/lib/forms/require-uuid";

type Props = { params: Promise<{ courseSlug: string; lessonId: string }> };

/** One lesson: its content, its practice exercises, and the "done" switch. */
export default async function LearnLessonPage({ params }: Props) {
  const { courseSlug, lessonId } = await params;
  const { customer, course } = await requireApprovedCourse(courseSlug);
  requireUuid(lessonId);

  const [lesson, siblings] = await Promise.all([
    db.lesson.findFirst({
      where: { id: lessonId, courseId: course.id, deletedAt: null, status: "published" },
      include: {
        exercises: {
          where: { deletedAt: null, status: "published" },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          include: {
            answers: {
              where: { customerId: customer.id, attemptId: null },
              orderBy: { updatedAt: "desc" },
              select: { id: true, autoScore: true, manualScore: true, feedback: true, response: true, mediaId: true },
              take: 1,
            },
          },
        },
        progress: { where: { customerId: customer.id }, select: { lessonId: true } },
      },
    }),
    db.lesson.findMany({
      where: { courseId: course.id, deletedAt: null, status: "published" },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    }),
  ]);
  if (!lesson) notFound();

  const completed = lesson.progress.length > 0;
  const next = siblings[siblings.findIndex((s) => s.id === lesson.id) + 1];

  return (
    <div className="grid max-w-2xl gap-8">
      <div className="grid gap-2">
        <Link href={`/learn/${course.slug}`} className="text-sm text-muted-foreground hover:underline">
          ← {course.title}
        </Link>
        <h1 className="text-2xl font-semibold text-balance">{lesson.title}</h1>
      </div>

      {/* react-markdown never renders raw HTML, so teacher or AI-written content cannot inject scripts. */}
      <article className="grid gap-3 leading-7 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground">
        <Markdown>{lesson.content}</Markdown>
      </article>

      {lesson.exercises.length > 0 && (
        <section className="grid gap-4">
          <h2 className="text-xl font-semibold">Bài tập</h2>
          {lesson.exercises.map((exercise, index) => (
            <ExercisePlayer
              key={exercise.id}
              index={index}
              exercise={toLearnerExercise(exercise)}
              lastScore={exercise.answers[0]?.autoScore != null ? Number(exercise.answers[0].autoScore) : null}
              written={
                (exercise.type === "writing" || exercise.type === "speaking") && exercise.answers[0]
                  ? {
                      response: exercise.answers[0].response,
                      score: exercise.answers[0].manualScore != null ? Number(exercise.answers[0].manualScore) : null,
                      feedback: exercise.answers[0].feedback,
                      recordingAnswerId: exercise.answers[0].mediaId ? exercise.answers[0].id : null,
                    }
                  : undefined
              }
            />
          ))}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <form action={setLessonCompletedAction.bind(null, lesson.id, !completed)}>
          <Button type="submit" variant={completed ? "outline" : "default"}>
            {completed ? "Bỏ đánh dấu đã học xong" : "Đánh dấu đã học xong"}
          </Button>
        </form>
        {next && (
          <Link href={`/learn/${course.slug}/${next.id}`} className={buttonVariants({ variant: "outline" })}>
            Bài tiếp theo →
          </Link>
        )}
      </div>
    </div>
  );
}
