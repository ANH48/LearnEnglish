/**
 * Timing and availability rules for assessments. Pure functions: every time
 * comes from the server and is passed in, never read from the browser.
 */

export const ASSESSMENT_KIND_LABELS = {
  quiz_15: "Kiểm tra 15 phút",
  test_60: "Kiểm tra 60 phút",
  custom: "Kiểm tra tự đặt giờ",
  exam: "Bài thi",
} as const;

export type AssessmentKindName = keyof typeof ASSESSMENT_KIND_LABELS;
export const ASSESSMENT_KINDS = Object.keys(ASSESSMENT_KIND_LABELS) as AssessmentKindName[];

/** Kinds whose length is fixed by their name. */
export const FIXED_DURATION_MINUTES: Partial<Record<AssessmentKindName, number>> = { quiz_15: 15, test_60: 60 };

/** A late autosave still counts for this long after the deadline (network delay, not extra time). */
export const SAVE_GRACE_MS = 10_000;

type Window = { kind: string; opensAt: Date | null; closesAt: Date | null };

/** `started + duration`; an exam never runs past its closing time. */
export function computeDeadline(startedAt: Date, durationMinutes: number, assessment: Window): Date {
  const deadline = new Date(startedAt.getTime() + durationMinutes * 60_000);
  if (assessment.kind === "exam" && assessment.closesAt && assessment.closesAt < deadline) return assessment.closesAt;
  return deadline;
}

export function isPastDeadline(deadlineAt: Date, now: Date): boolean {
  return now > deadlineAt;
}

export function canStillSave(deadlineAt: Date, now: Date): boolean {
  return now.getTime() <= deadlineAt.getTime() + SAVE_GRACE_MS;
}

export type StartCheck = "ok" | "not_open_yet" | "closed" | "no_attempts_left";

/** Whether a learner may start a new attempt now. Only exams have an opening window. */
export function checkCanStart(assessment: Window & { maxAttempts: number }, attemptsUsed: number, now: Date): StartCheck {
  if (assessment.kind === "exam") {
    if (assessment.opensAt && now < assessment.opensAt) return "not_open_yet";
    if (assessment.closesAt && now >= assessment.closesAt) return "closed";
  }
  if (attemptsUsed >= assessment.maxAttempts) return "no_attempts_left";
  return "ok";
}

export const START_CHECK_MESSAGES: Record<Exclude<StartCheck, "ok">, string> = {
  not_open_yet: "Bài thi chưa mở.",
  closed: "Bài thi đã đóng.",
  no_attempts_left: "Bạn đã dùng hết số lượt làm bài.",
};

/** Exam answers stay hidden until the exam closes; other kinds show them once submitted. */
export function canSeeSolutions(assessment: Window, now: Date): boolean {
  if (assessment.kind !== "exam") return true;
  return assessment.closesAt !== null && now >= assessment.closesAt;
}

type ScoredAnswer = { autoScore: unknown; manualScore: unknown; gradedAt: Date | null; needsManual: boolean };

/** Final score = auto + manual. Stays "submitted" while a teacher-graded answer is waiting. */
export function settleScore(answers: ScoredAnswer[]): { score: number; status: "submitted" | "graded" } {
  const total = answers.reduce((sum, a) => sum + Number(a.autoScore ?? 0) + Number(a.manualScore ?? 0), 0);
  const waiting = answers.some((a) => a.needsManual && a.gradedAt === null);
  return { score: Math.round(total * 100) / 100, status: waiting ? "submitted" : "graded" };
}
