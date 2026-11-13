import { BookOpen, CircleCheck, ClipboardCheck, Clock, MessageSquareHeart, MonitorSmartphone, PenLine, XCircle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { cancelEnrollmentAction, requestEnrollmentAction } from "@/features/enrollments/enrollment-actions";
import type { EnrollmentStatus } from "@/features/enrollments/enrollment-state";
import { courseCoverGradient } from "@/lib/course-cover";
import { cn } from "@/lib/utils";
import type { CourseDetail } from "./course-detail-query";

type Props = { course: CourseDetail; signedIn: boolean; status: EnrollmentStatus | null; note: string };

const wide = cn(buttonVariants({ size: "lg" }), "h-12 w-full rounded-xl text-base shadow-lg shadow-primary/25");

/** Side card: cover, the join button for the visitor's current state, and what the course includes. */
export function CourseEnrollCard({ course, signedIn, status, note }: Props) {
  const teacherGraded = Boolean(course.exerciseTypes.writing || course.exerciseTypes.speaking);
  return (
    <aside className="overflow-hidden rounded-3xl border bg-card shadow-2xl shadow-brand-ink/15">
      <div className={`relative grid h-40 place-items-center bg-gradient-to-br ${courseCoverGradient(course.slug)}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgb(255_255_255/0.25)_1px,transparent_1px)] [background-size:14px_14px]" />
        <span className="relative grid size-20 animate-float place-items-center rounded-3xl bg-white/95 text-brand-ink shadow-xl">
          <BookOpen className="size-9" />
        </span>
      </div>

      <div className="grid gap-4 p-5">
        <EnrollAction course={course} signedIn={signedIn} status={status} note={note} />

        <div className="grid gap-2.5 border-t pt-4">
          <p className="font-heading font-bold">Khóa học này bao gồm</p>
          <ul className="grid gap-2 text-sm">
            <Include icon={<BookOpen />}>{course.lessons.length} bài học</Include>
            <Include icon={<PenLine />}>{course.exerciseCount} bài tập luyện tập</Include>
            {course.assessments.length > 0 && <Include icon={<ClipboardCheck />}>{course.assessments.length} bài kiểm tra / bài thi</Include>}
            <Include icon={<CircleCheck />}>Chấm tự động, xem đáp án ngay</Include>
            {teacherGraded && <Include icon={<MessageSquareHeart />}>Teacher chấm bài nói và bài viết</Include>}
            <Include icon={<MonitorSmartphone />}>Học trên điện thoại và máy tính</Include>
          </ul>
        </div>
      </div>
    </aside>
  );
}

function EnrollAction({ course, signedIn, status, note }: Props) {
  const next = `?next=/courses/${course.slug}`;
  if (!signedIn) {
    return (
      <div className="grid gap-2">
        <Link href={`/register${next}`} className={wide}>
          Đăng ký học ngay
        </Link>
        <p className="text-center text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link href={`/login${next}`} className="font-semibold text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    );
  }
  if (status === "approved") {
    return (
      <div className="grid gap-2">
        <StatusPill tone="ok" icon={<CircleCheck />}>Bạn đã được duyệt vào khóa</StatusPill>
        <Link href={`/learn/${course.slug}`} className={wide}>
          Vào học
        </Link>
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="grid gap-2">
        <StatusPill tone="wait" icon={<Clock />}>Đang chờ teacher duyệt</StatusPill>
        <p className="text-sm text-muted-foreground">Bạn chưa cần làm gì thêm. Khóa học sẽ mở ngay khi được duyệt.</p>
        <form action={cancelEnrollmentAction.bind(null, course.id)}>
          <SubmitButton variant="outline" className="w-full">
            Hủy yêu cầu
          </SubmitButton>
        </form>
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      {status === "rejected" && (
        <StatusPill tone="bad" icon={<XCircle />}>
          Yêu cầu trước bị từ chối{note ? `: ${note}` : ""}
        </StatusPill>
      )}
      <form action={requestEnrollmentAction.bind(null, course.id)}>
        <SubmitButton className={wide}>
          {status === null ? "Đăng ký khóa học" : "Gửi lại yêu cầu"}
        </SubmitButton>
      </form>
      <p className="text-center text-xs text-muted-foreground">Teacher của khóa sẽ duyệt yêu cầu của bạn.</p>
    </div>
  );
}

const TONES = { ok: "bg-emerald-50 text-emerald-800", wait: "bg-amber-50 text-amber-800", bad: "bg-rose-50 text-rose-800" };

function StatusPill({ tone, icon, children }: { tone: keyof typeof TONES; icon: ReactNode; children: ReactNode }) {
  return <p className={cn("flex items-start gap-2 rounded-xl px-3 py-2 text-sm font-medium [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0", TONES[tone])}>{icon}{children}</p>;
}

function Include({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <li className="flex items-center gap-2.5 [&>svg]:size-4 [&>svg]:text-primary">{icon}{children}</li>;
}
