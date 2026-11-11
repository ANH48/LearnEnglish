/** "3/8 bài học" with a bar. Shows nothing misleading when a course has no lessons yet. */
export function ProgressBar({ done, total }: { done: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="grid gap-1">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Tiến độ khóa học"
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {total === 0 ? "Chưa có bài học" : `${done}/${total} bài học · ${percent}%`}
      </p>
    </div>
  );
}
