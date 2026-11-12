import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { readStreak } from "./challenge-data";
import { vnDay } from "./challenge-streak";
import { PetCard } from "./pet-card";
import { petLook } from "./pet-look";

/** Challenge entry on the course page: the pet, the streak and a button to today's challenge. */
export async function ChallengeCourseCard({ customerId, courseId, courseSlug, level }: { customerId: string; courseId: string; courseSlug: string; level: number }) {
  const streak = await readStreak(customerId, courseId);
  const look = petLook(streak, vnDay(new Date()));
  return (
    <section className="grid gap-3 rounded-2xl border p-4 sm:flex sm:items-center sm:justify-between">
      <PetCard streak={streak} look={look} level={level} size={112} />
      {level > 0 && (
        <Link href={`/learn/${courseSlug}/challenge`} className={buttonVariants({ size: "lg" })}>
          {look.mood === "happy" ? "Ôn thêm" : "Vào challenge"}
        </Link>
      )}
    </section>
  );
}
