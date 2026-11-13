"use client";

import { ChevronRight, CircleAlert, CircleCheck, CircleDashed, CircleX, Clock } from "lucide-react";
import { type ComponentProps, type ReactNode, createContext, useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type LessonExerciseItem = {
  id: string;
  prompt: string;
  points: number;
  /** Score of the learner's latest answer; null before any answer and while a teacher has not graded it. */
  lastScore: number | null;
  /** The latest answer is waiting for a teacher's grade. */
  waiting: boolean;
  /** The exercise, already rendered. */
  node: ReactNode;
};

type ExerciseContext = { items: LessonExerciseItem[]; open: (exerciseId: string) => void };
const LessonExerciseContext = createContext<ExerciseContext>({ items: [], open: () => {} });

function useExercise(exerciseId: string) {
  const { items, open } = useContext(LessonExerciseContext);
  const index = items.findIndex((item) => item.id === exerciseId);
  return { item: items[index], number: index + 1, open: () => open(exerciseId) };
}

type Props = { items: LessonExerciseItem[]; children: ReactNode };

/**
 * Keeps the lesson page for learning: each exercise opens alone in a popup.
 * Every exercise stays mounted, even while the popup is closed, so what was typed is kept.
 */
export function LessonExerciseDialog({ items, children }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  /** Kept after closing so the popup does not go blank while it fades out. */
  const [shownId, setShownId] = useState(items[0]?.id ?? "");
  const shownNumber = items.findIndex((item) => item.id === shownId) + 1;

  const open = (exerciseId: string) => {
    setShownId(exerciseId);
    setOpenId(exerciseId);
  };

  return (
    <LessonExerciseContext value={{ items, open }}>
      {children}
      <Dialog open={openId !== null} onOpenChange={(isOpen) => !isOpen && setOpenId(null)}>
        <DialogContent keepMounted className="flex max-h-[92dvh] max-w-[calc(100%-1rem)] flex-col gap-3 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Bài tập {shownNumber}</DialogTitle>
            <DialogDescription>Đóng cửa sổ để quay lại bài học, câu trả lời đang gõ vẫn được giữ.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} hidden={item.id !== shownId}>
                {item.node}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </LessonExerciseContext>
  );
}

/** Colour and icon of a last score by its share of the points: good from 70%, middling from 50%, low below. */
const SCORE_LEVELS = [
  { from: 0.7, Icon: CircleCheck, tone: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  { from: 0.5, Icon: CircleAlert, tone: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  { from: 0, Icon: CircleX, tone: "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200" },
];

/** Latest result of one exercise: not done yet, waiting for the teacher, or the last score. */
export function ExerciseStatus({ exerciseId, className }: { exerciseId: string; className?: string }) {
  const { item } = useExercise(exerciseId);
  if (!item) return null;
  const base = cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3.5", className);
  if (item.waiting) {
    return (
      <span className={cn(base, "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200")}>
        <Clock aria-hidden="true" /> Đã nộp, chờ chấm
      </span>
    );
  }
  if (item.lastScore === null) {
    return (
      <span className={cn(base, "bg-muted text-muted-foreground")}>
        <CircleDashed aria-hidden="true" /> Chưa làm
      </span>
    );
  }
  const ratio = item.points > 0 ? item.lastScore / item.points : 1;
  const { Icon, tone } = SCORE_LEVELS.find((level) => ratio >= level.from) ?? SCORE_LEVELS[2];
  return (
    <span className={cn(base, tone, "tabular-nums")}>
      <Icon aria-hidden="true" /> Lần cuối: {item.lastScore}/{item.points} điểm
    </span>
  );
}

/** Card for one exercise on the lesson page: its question, its latest result, and one click to open it. */
export function ExerciseLauncher({ exerciseId }: { exerciseId: string }) {
  const { item, number, open } = useExercise(exerciseId);
  if (!item) return null;
  return (
    <button
      type="button"
      onClick={open}
      className="group flex h-full min-h-11 w-full cursor-pointer items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-colors duration-200 outline-none hover:border-primary hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold text-primary tabular-nums group-hover:bg-background">{number}</span>
      <span className="grid min-w-0 flex-1 justify-items-start gap-1">
        <span className="line-clamp-2 text-sm font-medium">{item.prompt}</span>
        <ExerciseStatus exerciseId={exerciseId} />
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

type OpenButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "type"> & { exerciseId: string };

/** Plain button that opens one exercise in the popup. */
export function OpenExerciseButton({ exerciseId, ...props }: OpenButtonProps) {
  const { open } = useExercise(exerciseId);
  return <Button {...props} type="button" onClick={open} />;
}
