import { Flame } from "lucide-react";
import type { StreakState } from "./challenge-streak";
import { PetAvatar } from "./pet-avatar";
import { type PetLook, nextGearAt } from "./pet-look";

/** The pet with the streak beside it, and what happens next. */
export function PetCard({ streak, look, level, size = 160 }: { streak: StreakState; look: PetLook; level: number; size?: number }) {
  const next = nextGearAt(streak.current);
  return (
    <div className="flex items-center gap-4">
      <PetAvatar look={look} size={size} />
      <div className="grid min-w-0 gap-1">
        <p className="flex items-center gap-1.5 text-2xl font-semibold tabular-nums">
          <Flame className={streak.current > 0 ? "size-6 text-orange-500" : "size-6 text-muted-foreground"} aria-hidden />
          {streak.current} ngày
        </p>
        <p className="text-sm text-muted-foreground">{statusText(streak, look, level)}</p>
        <p className="text-xs text-muted-foreground">
          Challenge cấp {level}
          {streak.best > 0 && ` · Dài nhất ${streak.best} ngày`}
          {streak.current > 0 && next !== null && ` · Đồ mới ở ngày ${next}`}
        </p>
      </div>
    </div>
  );
}

function statusText(streak: StreakState, look: PetLook, level: number): string {
  if (level === 0) return "Học xong bài đầu tiên để mở challenge.";
  if (streak.toRestore > 0) return `Lỡ mất chuỗi ${streak.toRestore} ngày. Làm challenge đạt 80% để khôi phục và lấy lại đồ.`;
  if (look.mood === "happy") return "Hôm nay đã ôn xong, thú cưng vui lắm!";
  if (streak.current > 0) return "Hôm nay chưa ôn, làm challenge để giữ chuỗi nhé.";
  return "Làm challenge mỗi ngày để thú cưng lớn lên.";
}
