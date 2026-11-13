import { PencilLine } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { SubmitButton } from "@/components/shared/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { ExercisePlayer } from "@/features/exercise-player/exercise-player";
import { toLearnerExercise } from "@/features/exercise-player/learner-exercise";
import { LessonBlockList } from "@/features/lesson-blocks/lesson-block-list";
import { blockExerciseIds, parseLessonBlocks } from "@/features/lesson-blocks/lesson-blocks";
import { ExerciseLauncher, LessonExerciseDialog } from "@/features/lesson-exercises/lesson-exercise-dialog";
import { listPublishedLessonIds, loadLearnerLesson } from "@/features/lessons/lesson-queries";
import { setLessonCompletedAction } from "@/features/progress/lesson-progress-actions";
import { requireApprovedCourse } from "@/lib/auth/current-customer";
import { requireUuid } from "@/lib/forms/require-uuid";

type Props = { params: Promise<{ courseSlug: string; lessonId: string }> };

/** One lesson: its content to learn, the popup holding its exercises, and the "done" switch. */
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
  // Numbering follows the page: exercises tied to a block first, in block order, then the rest.
  const blockOrder = blockExerciseIds(blocks);
  const position = (id: string) => (blockOrder.includes(id) ? blockOrder.indexOf(id) : blockOrder.length);
  const items = lesson.exercises
    .toSorted((a, b) => position(a.id) - position(b.id))
    .map((exercise, index) => {
      const answer = exercise.answers[0];
      const lastScore = answer?.autoScore ?? answer?.manualScore ?? null;
      return {
        id: exercise.id,
        prompt: exercise.prompt,
        points: exercise.points,
        lastScore: lastScore != null ? Number(lastScore) : null,
        waiting: answer != null && lastScore == null,
        node: (
          <ExercisePlayer
            index={index}
            exercise={toLearnerExercise(exercise)}
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
  const answeredCount = items.filter((item) => item.waiting || item.lastScore !== null).length;
  const next = siblings[siblings.findIndex((s) => s.id === lesson.id) + 1];

  return (
    <LessonExerciseDialog items={items}>
    <div className="grid gap-8">
      <div className="grid gap-2">
        <Link href={`/learn/${course.slug}`} className="text-sm text-muted-foreground hover:underline">
          ← {course.title}
        </Link>
        <h1 className="text-2xl font-semibold text-balance">{lesson.title}</h1>
      </div>

      {/* react-markdown never renders raw HTML, so teacher or AI-written content cannot inject scripts. */}
      {lesson.content.trim() !== "" && (
      <article className="grid max-w-2xl gap-3 leading-7 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground">
        <Markdown>{lesson.content}</Markdown>
      </article>
      )}

      <LessonBlockList lessonId={lesson.id} blocks={blocks} exerciseIds={new Set(items.map((item) => item.id))} />

      {items.length > 0 && (
        <section className="grid gap-4 border-t pt-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <PencilLine className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-semibold">Bài tập</h2>
              <p className="text-sm text-muted-foreground">
                Bấm vào bài nào thì làm bài đó. Đã làm {answeredCount}/{items.length} bài.
              </p>
            </div>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <li key={item.id}>
                <ExerciseLauncher exerciseId={item.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <form action={setLessonCompletedAction.bind(null, lesson.id, !completed)}>
          <SubmitButton variant={completed ? "outline" : "default"}>
            {completed ? "Bỏ đánh dấu đã học xong" : "Đánh dấu đã học xong"}
          </SubmitButton>
        </form>
        {next && (
          <Link href={`/learn/${course.slug}/${next.id}`} className={buttonVariants({ variant: "outline" })}>
            Bài tiếp theo →
          </Link>
        )}
      </div>
    </div>
    </LessonExerciseDialog>
  );
}
