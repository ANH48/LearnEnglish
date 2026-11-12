type AttemptSummary = { status: string; score: unknown };

/**
 * What one gradebook cell shows for a learner and an assessment: the best
 * finished score, with a mark while part of an attempt still waits for the teacher.
 */
export function gradebookCell(attempts: AttemptSummary[], total: number): string {
  if (attempts.length === 0) return "—";
  const finished = attempts.filter((a) => a.status !== "in_progress");
  if (finished.length === 0) return "Đang làm";
  const best = Math.max(...finished.map((a) => Number(a.score ?? 0)));
  const waiting = finished.some((a) => a.status === "submitted");
  return `${best}/${total}${waiting ? " (chờ chấm)" : ""}`;
}
