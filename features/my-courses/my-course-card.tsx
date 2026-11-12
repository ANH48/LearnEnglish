import { ArrowRight, BookOpen, CircleCheck, Clock, GraduationCap, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { InitialAvatar } from "@/components/brand/initial-avatar";
import { buttonVariants } from "@/components/ui/button";
import type { EnrollmentStatus } from "@/features/enrollments/enrollment-state";
import { ENROLLMENT_STATUS_LABEL } from "@/features/enrollments/enrollment-state";
import { ProgressBar } from "@/features/progress/progress-bar";
import { courseCoverGradient } from "@/lib/course-cover";
import { cn } from "@/lib/utils";

export type MyCourse = {
  id: string;
  status: EnrollmentStatus;
  note: string;
  requestedAt: Date;
  course: { slug: string; title: string; categories: string[]; teachers: string[]; lessonCount: number; doneCount: number };
};

const STATUS_STYLE: Record<EnrollmentStatus, { tone: string; icon: ReactNode }> = {
  approved: { tone: "bg-emerald-100 text-emerald-800", icon: <CircleCheck /> },
  pending: { tone: "bg-amber-100 text-amber-800", icon: <Clock /> },
  rejected: { tone: "bg-rose-100 text-rose-800", icon: <XCircle /> },
  cancelled: { tone: "bg-muted text-muted-foreground", icon: <RotateCcw /> },
};

/** One course on the learner's "my courses" page: who teaches it, where the request stands, what to do next. */
export function MyCourseCard({ item }: { item: MyCourse }) {
  const { course, status } = item;
  const teachers = course.teachers.length > 0 ? course.teachers.join(", ") : "teacher của khóa";
  const style = STATUS_STYLE[status];

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className={`relative h-24 bg-gradient-to-br ${courseCoverGradient(course.slug)}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgb(255_255_255/0.25)_1px,transparent_1px)] [background-size:14px_14px]" />
        <span className={cn("absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm [&>svg]:size-3.5", style.tone)}>
          {style.icon}
          {ENROLLMENT_STATUS_LABEL[status]}
        </span>
        <span className="absolute -bottom-5 left-4 grid size-11 place-items-center rounded-xl bg-white text-brand-ink shadow-md ring-1 ring-black/5">
          <BookOpen className="size-5" />
        </span>
      </div>

      <div className="grid flex-1 content-start gap-3 p-4 pt-7">
        <div>
          <h2 className="font-heading text-lg leading-snug font-bold">{course.title}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <GraduationCap className="size-3.5 text-primary" /> {course.teachers.length > 0 ? teachers : "Chưa có teacher"}
            </span>
            <span className="inline-flex items-center gap-1">
              <BookOpen className="size-3.5 text-primary" /> {course.lessonCount} bài học
            </span>
          </p>
          {course.categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {course.categories.map((name) => (
                <span key={name} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        {status === "approved" ? (
          <ProgressBar done={course.doneCount} total={course.lessonCount} />
        ) : (
          <div className="flex items-start gap-3 rounded-xl bg-muted/70 p-3 text-sm">
            {status === "pending" && course.teachers[0] && <InitialAvatar name={course.teachers[0]} className="size-8 text-sm" />}
            <div className="grid gap-0.5">
              {status === "pending" && (
                <>
                  <p className="font-medium">Đang chờ {teachers} duyệt</p>
                  <p className="text-xs text-muted-foreground">Gửi ngày {item.requestedAt.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}. Bạn chưa cần làm gì thêm.</p>
                </>
              )}
              {status === "rejected" && <p>{item.note ? `Lý do: ${item.note}` : "Yêu cầu chưa được chấp nhận. Bạn có thể gửi lại."}</p>}
              {status === "cancelled" && <p>Bạn đã hủy yêu cầu. Có thể gửi lại bất cứ lúc nào.</p>}
            </div>
          </div>
        )}

        <div className="mt-auto pt-1">
          {status === "approved" ? (
            <Link href={`/learn/${course.slug}`} className={cn(buttonVariants(), "w-full rounded-xl")}>
              {course.doneCount > 0 ? "Học tiếp" : "Bắt đầu học"} <ArrowRight className="size-4" />
            </Link>
          ) : (
            <Link href={`/courses/${course.slug}`} className={cn(buttonVariants({ variant: "outline" }), "w-full rounded-xl")}>
              Xem khóa học
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
