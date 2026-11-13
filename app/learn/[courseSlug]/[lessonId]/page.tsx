import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { Button, buttonVariants } from "@/components/ui/button";
import { ExercisePlayer } from "@/features/exercise-player/exercise-player";
import { toLearnerExercise } from "@/features/exercise-player/learner-exercise";
import { LessonBlockList } from "@/features/lesson-blocks/lesson-block-list";
import { blockExerciseIds, parseLessonBlocks } from "@/features/lesson-blocks/lesson-blocks";
import { listPublishedLessonIds, loadLearnerLesson } from "@/features/lessons/lesson-queries";
import { setLessonCompletedAction } from "@/features/progress/lesson-progress-actions";
import { requireApprovedCourse } from "@/lib/auth/current-customer";
import { requireUuid } from "@/lib/forms/require-uuid";

type Props = { params: Promise<{ courseSlug: string; lessonId: string }> };

/** One lesson: its content, its practice exercises, and the "done" switch. */
export default async function LearnLessonPage({ params }: Props) {
  const { courseSlug, lessonId } = await params;
  const { customer, course } = await requireApprovedCourse(courseSlug);
  requireUuid(lessonId);

  const [lesson, siblings] = await Promise.all([
    loadLearnerLesson(course.id, lessonId, customer.id),
    listPublishedLessonIds(course.id),
  ]);
  if (!lesson) notFound();

  const completed = lesson.progress.length > 0;
  const blocks = parseLessonBlocks(lesson.blocks);
  const placedInBlocks = new Set(blockExerciseIds(blocks));
  // Exercises a block shows in place are numbered on their own; the rest keep one running number.
  const listedIds = lesson.exercises.map((exercise) => exercise.id).filter((id) => !placedInBlocks.has(id));
  const rendered = lesson.exercises.map((exercise) => {
    const learner = toLearnerExercise(exercise);
    const answer = exercise.answers[0];
    const placed = placedInBlocks.has(exercise.id);
    return {
      id: exercise.id,
      placed,
      node: (
      <ExercisePlayer
        key={exercise.id}
        index={placed ? 0 : listedIds.indexOf(exercise.id)}
        exercise={learner}
        lastScore={answer?.autoScore != null ? Number(answer.autoScore) : null}
        written={
          // An answer without an automatic score is one a teacher grades, whatever the exercise is set to now.
          answer && answer.autoScore == null
            ? {
                response: answer.response,
                score: answer.manualScore != null ? Number(answer.manualScore) : null,
                feedback: answer.feedback,
                recordingAnswerId: answer.mediaId ? answer.id : null,
              }
            : undefined
        }
      />
      ),
    };
  });
  const unplaced = rendered.filter((item) => !item.placed);
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
      {lesson.content.trim() !== "" && (
      <article className="grid gap-3 leading-7 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground">
        <Markdown>{lesson.content}</Markdown>
      </article>
      )}

      <LessonBlockList lessonId={lesson.id} blocks={blocks} exercises={new Map(rendered.map((item) => [item.id, item.node]))} />

      {unplaced.length > 0 && (
        <section className="grid gap-4">
          <h2 className="text-xl font-semibold">Bài tập</h2>
          {unplaced.map((item) => item.node)}
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
