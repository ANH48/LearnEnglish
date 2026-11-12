import Link from "next/link";
import { Button } from "@/components/ui/button";
import { startChallengeAction } from "@/features/challenge/challenge-actions";
import { challengeLevel, openChallenge, readStreak } from "@/features/challenge/challenge-data";
import { ChallengeRunner } from "@/features/challenge/challenge-runner";
import { vnDay } from "@/features/challenge/challenge-streak";
import { PetCard } from "@/features/challenge/pet-card";
import { petLook } from "@/features/challenge/pet-look";
import { toLearnerExercise } from "@/features/exercise-player/learner-exercise";
import { requireApprovedCourse } from "@/lib/auth/current-customer";

/** Daily challenge of a course: the pet and streak, then the open challenge or a button to start one. */
export default async function ChallengePage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const { customer, course } = await requireApprovedCourse(courseSlug);
  const [streak, level, session] = await Promise.all([
    readStreak(customer.id, course.id),
    challengeLevel(customer.id, course.id),
    openChallenge(customer.id, course.id, false),
  ]);
  const look = petLook(streak, vnDay(new Date()));
  const restart = startChallengeAction.bind(null, course.slug);

  return (
    <div className="grid max-w-2xl gap-6">
      <div className="grid gap-2">
        <Link href={`/learn/${course.slug}`} className="text-sm text-muted-foreground hover:underline">
          ← {course.title}
        </Link>
        <h1 className="text-2xl font-semibold">Challenge mỗi ngày</h1>
        <p className="text-sm text-muted-foreground">Làm lại bài tập của các bài đã học, câu hỏi được xáo thứ tự mỗi lượt. Ôn mỗi ngày để giữ chuỗi.</p>
      </div>

      <PetCard streak={streak} look={look} level={level} />

      {level === 0 && <p className="text-muted-foreground">Chưa có bài để ôn. Học xong bài 1 (làm đủ bài tập) là mở challenge.</p>}

      {level > 0 && !session && (
        <form action={restart}>
          <Button type="submit" size="lg">
            Bắt đầu challenge · {level} bài học
          </Button>
        </form>
      )}

      {session && (
        <ChallengeRunner
          key={session.id}
          sessionId={session.id}
          restoring={streak.toRestore}
          onRestart={restart}
          items={session.items.map((item, i) => ({ exercise: toLearnerExercise({ id: `${session.id}-${i}`, ...item }), lessonTitle: item.lessonTitle }))}
        />
      )}
    </div>
  );
}
