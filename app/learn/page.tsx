import { BookOpen, CircleCheck, Clock, Compass } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { type MyCourse, MyCourseCard } from "@/features/my-courses/my-course-card";
import { requireCustomer } from "@/lib/auth/current-customer";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

/** The learner's courses with each request's status, the course's teachers and, once approved, progress. */
export default async function MyCoursesPage() {
  const customer = await requireCustomer();
  const enrollments = await db.enrollment.findMany({
    where: { customerId: customer.id, course: { deletedAt: null, status: "published" } },
    orderBy: { updatedAt: "desc" },
    include: {
      course: {
        select: {
          slug: true,
          title: true,
          categories: { where: { category: { deletedAt: null } }, select: { category: { select: { name: true } } } },
          teachers: { where: { staff: { deletedAt: null } }, select: { staff: { select: { fullName: true } } } },
          lessons: {
            where: { deletedAt: null, status: "published" },
            select: { progress: { where: { customerId: customer.id }, select: { lessonId: true } } },
          },
        },
      },
    },
  });

  const items: MyCourse[] = enrollments.map((e) => ({
    id: e.id,
    status: e.status,
    note: e.note,
    requestedAt: e.updatedAt,
    course: {
      slug: e.course.slug,
      title: e.course.title,
      categories: e.course.categories.map((c) => c.category.name),
      teachers: e.course.teachers.map((t) => t.staff.fullName),
      lessonCount: e.course.lessons.length,
      doneCount: e.course.lessons.filter((l) => l.progress.length > 0).length,
    },
  }));
  const learning = items.filter((i) => i.status === "approved").length;
  const waiting = items.filter((i) => i.status === "pending").length;

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Xin chào, {customer.fullName}</p>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight">Khóa của tôi</h1>
        </div>
        <Link href="/#courses" className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}>
          <Compass className="size-4" /> Khám phá thêm khóa học
        </Link>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={<BookOpen />} tone="bg-secondary text-primary" value={items.length} label="Khóa đã đăng ký" />
          <Stat icon={<CircleCheck />} tone="bg-emerald-100 text-emerald-700" value={learning} label="Đang học" />
          <Stat icon={<Clock />} tone="bg-amber-100 text-amber-700" value={waiting} label="Chờ duyệt" />
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={BookOpen} title="Bạn chưa đăng ký khóa học nào">
          <p>Chọn một khóa phù hợp và gửi yêu cầu, teacher sẽ duyệt cho bạn.</p>
          <Link href="/#courses" className={cn(buttonVariants(), "mt-3 rounded-xl")}>
            Xem khóa học
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <MyCourseCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, tone, value, label }: { icon: ReactNode; tone: string; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
      <span className={`hidden size-10 shrink-0 place-items-center rounded-xl sm:grid [&>svg]:size-5 ${tone}`}>{icon}</span>
      <div>
        <p className="font-heading text-2xl font-extrabold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
