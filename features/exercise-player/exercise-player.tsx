"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Draft, ExerciseInputs, emptyDraft, toResponse } from "./exercise-inputs";
import type { LearnerExercise } from "./learner-exercise";
import { type SubmitResult, submitExerciseAnswerAction } from "./submit-answer-action";

type Props = {
  exercise: LearnerExercise;
  index: number;
  /** Score of the learner's last submission, if any. */
  lastScore: number | null;
};

/** One practice exercise: answer, submit, see the score and the right answer, try again. */
export function ExercisePlayer({ exercise, index, lastScore }: Props) {
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(exercise));
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [pending, startTransition] = useTransition();
  const response = toResponse(exercise, draft);
  const done = result?.ok === true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Câu {index + 1}. {exercise.prompt}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {exercise.points} điểm
          {lastScore !== null && !result && ` · Lần làm trước: ${lastScore}/${exercise.points}`}
        </p>
      </CardHeader>
      <CardContent className="grid gap-4">
        {exercise.type === "listening" && (
          <p className="text-sm text-muted-foreground">Audio cho bài nghe này chưa được tạo.</p>
        )}
        <ExerciseInputs exercise={exercise} draft={draft} onChange={setDraft} disabled={pending || done} />

        {result?.ok === false && (
          <p role="alert" className="text-sm text-destructive">
            {result.error}
          </p>
        )}
        {result?.ok && (
          <div role="status" className="rounded-lg border p-3 text-sm">
            <p className="font-medium">
              {result.score === result.points ? "Đúng rồi!" : result.score > 0 ? "Đúng một phần." : "Chưa đúng."} Điểm:{" "}
              <span className="tabular-nums">
                {result.score}/{result.points}
              </span>
            </p>
            <p className="text-muted-foreground">Đáp án: {result.solution}</p>
          </div>
        )}

        {exercise.autoGraded && (
          <div className="flex gap-2">
            {!done ? (
              <Button
                type="button"
                disabled={pending || response === null}
                onClick={() => startTransition(async () => setResult(await submitExerciseAnswerAction(exercise.id, response)))}
              >
                {pending ? "Đang chấm…" : "Nộp câu trả lời"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraft(emptyDraft(exercise));
                  setResult(null);
                }}
              >
                Làm lại
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
