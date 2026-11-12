/**
 * Daily challenge streak of one learner in one course. Pure rules, no database:
 * - finishing a challenge counts the day once (Vietnam time); more tries that day change nothing;
 * - missing any day drops the streak to 0 and keeps the old value as "to restore";
 * - while there is a streak to restore, only a challenge scored 80% or more counts:
 *   it brings the old streak back plus today. Below 80% the learner may simply try again.
 */
export type StreakState = { current: number; best: number; toRestore: number; lastDay: string | null };

export const RESTORE_RATIO = 0.8;
export const EMPTY_STREAK: StreakState = { current: 0, best: 0, toRestore: 0, lastDay: null };

/** Calendar day in Vietnam as YYYY-MM-DD. */
export function vnDay(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

/** The day before a YYYY-MM-DD day. */
export function previousDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** The state as of `today`: a streak whose last day is before yesterday is broken. */
export function streakOn(state: StreakState, today: string): StreakState {
  const alive = state.lastDay === today || state.lastDay === previousDay(today);
  if (state.current === 0 || alive) return state;
  return { ...state, current: 0, toRestore: Math.max(state.toRestore, state.current) };
}

export type CompletionOutcome = { state: StreakState; change: "counted" | "restored" | "already_counted" | "restore_failed" };

/** Applies one finished challenge, scored `ratio` (0 to 1), on `today`. */
export function applyCompletion(stored: StreakState, today: string, ratio: number): CompletionOutcome {
  const state = streakOn(stored, today);
  if (state.lastDay === today && state.current > 0) return { state, change: "already_counted" };

  if (state.toRestore > 0) {
    if (ratio < RESTORE_RATIO) return { state, change: "restore_failed" };
    const current = state.toRestore + 1;
    return { state: { current, best: Math.max(state.best, current), toRestore: 0, lastDay: today }, change: "restored" };
  }
  const current = state.current + 1;
  return { state: { current, best: Math.max(state.best, current), toRestore: 0, lastDay: today }, change: "counted" };
}
