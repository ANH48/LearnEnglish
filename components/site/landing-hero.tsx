import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { LearningShowcase } from "@/components/auth/learning-showcase";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Top of the landing page: the pitch on the left, the animated learning canvas on the right. */
export function LandingHero() {
  return (
    <section className="grid items-center gap-10 py-6 sm:py-10 lg:grid-cols-[1.05fr_1fr]">
      <div className="grid gap-5">
        <p className="inline-flex w-fit animate-rise items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          <Sparkles className="size-3.5" />
          Lớp tiếng Anh có teacher đồng hành
        </p>
        <h1 className="animate-rise font-heading text-4xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-6xl" style={{ animationDelay: "0.08s" }}>
          Học tiếng Anh{" "}
          <span className="relative whitespace-nowrap text-primary">
            vui hơn
            <svg viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true" className="absolute -bottom-0.5 left-0 h-2.5 w-full text-brand-sun">
              <path d="M2 9 C 50 2, 150 2, 198 8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
          , từng bài một
        </h1>
        <p className="max-w-xl animate-rise text-lg text-muted-foreground" style={{ animationDelay: "0.16s" }}>
          Chọn khóa học, gửi yêu cầu tham gia và bắt đầu ngay khi teacher duyệt. Bài tập được chấm liền tay, bài nói và bài viết có
          teacher nhận xét.
        </p>
        <div className="flex animate-rise flex-wrap gap-3" style={{ animationDelay: "0.24s" }}>
          <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-xl px-6 text-base shadow-lg shadow-primary/25")}>
            Học miễn phí
            <ArrowRight className="size-4" />
          </Link>
          <Link href="#courses" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 rounded-xl px-6 text-base")}>
            Xem khóa học
          </Link>
        </div>
      </div>
      <LearningShowcase showCaption={false} className="hidden aspect-[5/4] rounded-[2rem] shadow-2xl shadow-primary/20 lg:flex" />
    </section>
  );
}
