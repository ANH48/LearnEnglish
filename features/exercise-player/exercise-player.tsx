"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Draft, draftFromResponse, emptyDraft, toResponse } from "./exercise-draft";
import { SpeakingRecorder } from "@/features/recordings/speaking-recorder";
import { ExerciseInputs } from "./exercise-inputs";
import type { LearnerExercise } from "./learner-exercise";
import { type SubmitResult, submitExerciseAnswerAction } from "./submit-answer-action";

type Props = {
  exercise: LearnerExercise;
  index: number;
  /** Score of the learner's last submission, if any. */
  lastScore: number | null;
  /** Writing and speaking: what was sent earlier and the teacher's grade, once given. */
  written?: { response: unknown; score: number | null; feedback: string; recordingAnswerId: string | null };
};

/** One practice exercise: answer, submit, see the score and the right answer, try again. */
export function ExercisePlayer({ exercise, index, lastScore, written }: Props) {
  const [draft, setDraft] = useState<Draft>(() => (written ? draftFromResponse(exercise, written.response) : emptyDraft(exercise)));
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const submit = () =>
    startTransition(async () => {
      const submitted = await submitExerciseAnswerAction(exercise.id, response);
      setResult(submitted);
      // Reload the stored text and clear the old grade shown for a written answer.
      if (submitted.ok && submitted.waiting) router.refresh();
    });
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
        {exercise.type === "speaking" ? (
          <SpeakingRecorder
            attemptId={null}
            exerciseId={exercise.id}
            maxSeconds={exercise.maxSeconds ?? 60}
            savedAnswerId={written?.recordingAnswerId ?? null}
            disabled={false}
            onSaved={() => router.refresh()}
          />
        ) : (
          <ExerciseInputs exercise={exercise} draft={draft} onChange={setDraft} disabled={pending || done} />
        )}

        {result?.ok === false && (
          <p role="alert" className="text-sm text-destructive">
            {result.error}
          </p>
        )}
        {written && !result && (
          <p role="status" className="rounded-lg border p-3 text-sm">
            {written.score === null
              ? "Bài đã nộp, đang chờ teacher chấm."
              : `Teacher đã chấm: ${written.score}/${exercise.points}${written.feedback ? ` · ${written.feedback}` : ""}`}
          </p>
        )}
        {result?.ok && result.waiting && (
          <p role="status" className="rounded-lg border p-3 text-sm">
            Đã nộp. Teacher sẽ chấm bài này.
          </p>
        )}
        {result?.ok && !result.waiting && (
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

        {(exercise.autoGraded || exercise.type === "writing") && (
          <div className="flex gap-2">
            {!done ? (
              <Button
                type="button"
                disabled={pending || response === null}
                onClick={submit}
              >
                {pending ? "Đang nộp…" : written ? "Nộp lại" : "Nộp câu trả lời"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (exercise.autoGraded) setDraft(emptyDraft(exercise));
                  setResult(null);
                }}
              >
                {exercise.autoGraded ? "Làm lại" : "Sửa bài"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
