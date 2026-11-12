"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Draft, draftFromResponse, toPartialResponse } from "@/features/exercise-player/exercise-draft";
import { ExerciseInputs } from "@/features/exercise-player/exercise-inputs";
import type { LearnerExercise } from "@/features/exercise-player/learner-exercise";
import { saveAttemptAnswerAction, submitAttemptAction } from "./attempt-actions";

type Props = {
  attemptId: string;
  /** Time left when the server rendered the page; the server's deadline stays the judge. */
  remainingMs: number;
  questions: { exercise: LearnerExercise; saved: unknown }[];
};

const SAVE_DELAY_MS = 800;
const RETRY_DELAY_MS = 3000;
const clock = (ms: number) => {
  const seconds = Math.ceil(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};

/** The running attempt: countdown, every question, autosave on each change, hand-in at zero. */
export function AttemptRunner({ attemptId, remainingMs, questions }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>(() => questions.map((q) => draftFromResponse(q.exercise, q.saved)));
  const [left, setLeft] = useState(remainingMs);
  const [saveNote, setSaveNote] = useState("Mọi câu trả lời được lưu tự động.");
  const [closing, startClosing] = useTransition();
  const unsaved = useRef(new Map<string, unknown>());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handedIn = useRef(false);

  const flush = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const batch = [...unsaved.current];
    unsaved.current.clear();
    if (batch.length === 0) return;
    const results = await Promise.all(
      batch.map(async ([exerciseId, response]) => {
        try {
          return await saveAttemptAnswerAction(attemptId, exerciseId, response);
        } catch {
          // Network or server failure: keep the answer for the next try, unless a newer one is already waiting.
          if (!unsaved.current.has(exerciseId)) unsaved.current.set(exerciseId, response);
          return null;
        }
      }),
    );
    if (results.includes(null)) {
      setSaveNote("Mất kết nối, đang thử lưu lại…");
      saveTimer.current = setTimeout(flush, RETRY_DELAY_MS);
      return;
    }
    const failed = results.find((r) => r && !r.ok);
    setSaveNote(failed && !failed.ok ? failed.error : "Đã lưu.");
  };

  const handIn = () => {
    if (handedIn.current) return;
    handedIn.current = true;
    startClosing(async () => {
      await flush();
      try {
        await submitAttemptAction(attemptId);
      } catch (error) {
        // The redirect to the result page travels as an error; anything else is a real failure.
        if (String((error as { digest?: unknown })?.digest).startsWith("NEXT_REDIRECT")) throw error;
        handedIn.current = false;
        setSaveNote("Chưa nộp được. Kiểm tra mạng rồi bấm Nộp bài lần nữa.");
      }
    });
  };
  // The effects below must call the latest functions without restarting the clock.
  const latest = useRef({ handIn, flush });
  useEffect(() => {
    latest.current = { handIn, flush };
  });

  // Switching tab or closing the page inside the save delay must not drop the last keystrokes.
  useEffect(() => {
    const saveNow = () => {
      if (document.visibilityState === "hidden") void latest.current.flush();
    };
    const warn = (event: BeforeUnloadEvent) => {
      if (unsaved.current.size > 0) event.preventDefault();
    };
    document.addEventListener("visibilitychange", saveNow);
    window.addEventListener("beforeunload", warn);
    return () => {
      document.removeEventListener("visibilitychange", saveNow);
      window.removeEventListener("beforeunload", warn);
    };
  }, []);

  useEffect(() => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const now = Math.max(0, remainingMs - (Date.now() - startedAt));
      setLeft(now);
      if (now === 0) {
        clearInterval(interval);
        latest.current.handIn();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [remainingMs]);

  const change = (index: number, draft: Draft) => {
    setDrafts((all) => all.map((d, i) => (i === index ? draft : d)));
    const exercise = questions[index].exercise;
    const response = toPartialResponse(exercise, draft);
    if (response === null) return;
    unsaved.current.set(exercise.id, response);
    setSaveNote("Đang lưu…");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DELAY_MS);
  };

  return (
    <div className="grid gap-4">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-background p-3">
        <p className="text-sm">
          Còn lại{" "}
          <span role="timer" className={`text-lg font-semibold tabular-nums ${left < 60_000 ? "text-destructive" : ""}`}>
            {clock(left)}
          </span>
        </p>
        <p role="status" className="text-xs text-muted-foreground">
          {saveNote}
        </p>
      </div>

      {questions.map(({ exercise }, index) => (
        <Card key={exercise.id}>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Câu {index + 1}. {exercise.prompt}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{exercise.points} điểm</p>
          </CardHeader>
          <CardContent>
            {exercise.type === "listening" && <p className="mb-2 text-sm text-muted-foreground">Audio cho bài nghe này chưa được tạo.</p>}
            <ExerciseInputs exercise={exercise} draft={drafts[index]} onChange={(draft) => change(index, draft)} disabled={closing} />
          </CardContent>
        </Card>
      ))}

      <div>
        <Button
          type="button"
          disabled={closing}
          onClick={() => {
            if (window.confirm("Nộp bài? Sau khi nộp bạn không sửa được nữa.")) handIn();
          }}
        >
          {closing ? "Đang nộp…" : "Nộp bài"}
        </Button>
      </div>
    </div>
  );
}
