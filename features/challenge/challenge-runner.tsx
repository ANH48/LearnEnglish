"use client";

import { useState, useTransition } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Draft, emptyDraft, toPartialResponse, toResponse } from "@/features/exercise-player/exercise-draft";
import { ExerciseInputs } from "@/features/exercise-player/exercise-inputs";
import type { LearnerExercise } from "@/features/exercise-player/learner-exercise";
import { type ChallengeResult, submitChallengeAction } from "./challenge-actions";
import { RESTORE_RATIO } from "./challenge-streak";

type Item = { exercise: LearnerExercise; lessonTitle: string };
type Props = { sessionId: string; items: Item[]; restoring: number; onRestart: () => Promise<void> };

const CHANGE_TEXT = {
  counted: (streak: number) => `Chuỗi tăng lên ${streak} ngày!`,
  restored: (streak: number) => `Đã khôi phục chuỗi: ${streak} ngày, thú cưng có lại đồ!`,
  already_counted: () => "Hôm nay đã tính chuỗi rồi, lượt này là ôn thêm.",
  restore_failed: () => `Chưa đạt ${RESTORE_RATIO * 100}% nên chuỗi chưa được khôi phục. Làm lượt mới để thử lại nhé.`,
};

/** All items of one challenge on one page, submitted together and graded at once. */
export function ChallengeRunner({ sessionId, items, restoring, onRestart }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>(() => items.map((item) => emptyDraft(item.exercise)));
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [pending, startTransition] = useTransition();
  const done = result?.ok === true;
  const unanswered = items.filter((item, i) => toResponse(item.exercise, drafts[i]) === null).length;

  const submit = () =>
    startTransition(async () => {
      setResult(await submitChallengeAction(sessionId, items.map((item, i) => toPartialResponse(item.exercise, drafts[i]))));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

  return (
    <div className="grid gap-4">
      {result?.ok && (
        <Card className="border-primary">
          <CardContent className="grid gap-2 pt-6">
            <p className="text-2xl font-semibold tabular-nums">
              {result.score}/{result.maxPoints} điểm
            </p>
            <p>{CHANGE_TEXT[result.change](result.streak.current)}</p>
            <form action={onRestart}>
              <SubmitButton variant="outline">
                Làm lượt mới
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      )}
      {result && !result.ok && <p className="text-sm text-destructive">{result.error}</p>}
      {restoring > 0 && !done && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Bạn đã lỡ ngày ôn nên chuỗi về 0. Đạt từ {RESTORE_RATIO * 100}% điểm lượt này để khôi phục chuỗi {restoring} ngày.
        </p>
      )}

      {items.map((item, i) => {
        const graded = result?.ok ? result.items[i] : null;
        return (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Câu {i + 1}. {item.exercise.prompt}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {item.lessonTitle} · {item.exercise.points} điểm
              </p>
            </CardHeader>
            <CardContent className="grid gap-3">
              <ExerciseInputs
                exercise={item.exercise}
                draft={drafts[i]}
                disabled={pending || done}
                onChange={(draft) => setDrafts((all) => all.map((d, j) => (j === i ? draft : d)))}
              />
              {graded && (
                <p className="text-sm">
                  <span className={graded.score === graded.points ? "font-medium text-emerald-600 dark:text-emerald-400" : "font-medium"}>
                    {graded.score}/{graded.points} điểm.
                  </span>{" "}
                  {graded.score < graded.points && <span className="text-muted-foreground">Đáp án: {graded.solution}</span>}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {!done && (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={submit} disabled={pending}>
            {pending ? "Đang chấm…" : "Nộp bài"}
          </Button>
          {unanswered > 0 && <span className="text-sm text-muted-foreground">Còn {unanswered} câu chưa làm xong, vẫn nộp được.</span>}
        </div>
      )}
    </div>
  );
}
