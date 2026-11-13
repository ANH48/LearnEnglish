import { ExerciseStatus, OpenExerciseButton } from "@/features/lesson-exercises/lesson-exercise-dialog";
import type { VocabularyBlock as VocabularyBlockData } from "./lesson-blocks";

type Props = { block: VocabularyBlockData; quizExerciseId: string | null };

/**
 * Words from the story with their meanings. When the learner is ready, the quiz
 * (an exercise of the lesson) opens in the exercise popup, which covers the meanings.
 */
export function VocabularyBlock({ block, quizExerciseId }: Props) {
  return (
    <div className="grid gap-4">
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {block.items.map((item) => (
          <li key={item.en} className="flex items-baseline justify-between gap-3 rounded-xl border bg-card px-3 py-2">
            <span className="font-bold" lang="en">
              {item.en}
            </span>
            <span className="text-right text-sm text-muted-foreground">{item.vi}</span>
          </li>
        ))}
      </ul>
      {quizExerciseId && (
        <div className="flex flex-wrap items-center gap-3">
          <OpenExerciseButton exerciseId={quizExerciseId} className="h-10 px-4">
            Tôi nhớ rồi, kiểm tra →
          </OpenExerciseButton>
          <ExerciseStatus exerciseId={quizExerciseId} />
          <span className="text-sm text-muted-foreground">Bài kiểm tra mở trong cửa sổ riêng, bạn gõ lại nghĩa bằng tiếng Việt.</span>
        </div>
      )}
    </div>
  );
}
