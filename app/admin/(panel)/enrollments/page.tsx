import { BookOpen, Check, Inbox, UserMinus, Users, X } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { InitialAvatar } from "@/components/brand/initial-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { reviewEnrollmentAction } from "@/features/enrollments/enrollment-actions";
import { requirePermission } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { courseScopeWhere } from "@/lib/permissions/course-scope";

const vnDate = (date: Date) => date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

/** Requests waiting for review and learners already in a course, limited to the actor's courses. */
export default async function EnrollmentsPage() {
  const staff = await requirePermission("enrollment.review");
  const enrollments = await db.enrollment.findMany({
    where: {
      status: { in: ["pending", "approved"] },
      course: courseScopeWhere(staff),
      customer: { deletedAt: null },
    },
    orderBy: { updatedAt: "asc" },
    include: { course: { select: { title: true } }, customer: { select: { fullName: true, email: true } } },
  });
  const pending = enrollments.filter((e) => e.status === "pending");
  const approved = enrollments.filter((e) => e.status === "approved");

  return (
    <>
      <PageHeader title="Duyệt đăng ký" description="Học viên chỉ vào học được sau khi yêu cầu được duyệt." />
      <div className="grid gap-10">
        <Section title="Đang chờ duyệt" count={pending.length} tone="bg-amber-100 text-amber-800">
          {pending.length === 0 ? (
            <EmptyState icon={Inbox} title="Không có yêu cầu nào đang chờ">
              Yêu cầu mới của học viên sẽ hiện ở đây.
            </EmptyState>
          ) : (
            <div className="grid gap-3">
              {pending.map((enrollment) => (
                <form
                  key={enrollment.id}
                  className="grid gap-4 rounded-2xl border bg-card p-4 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <InitialAvatar name={enrollment.customer.fullName} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{enrollment.customer.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{enrollment.customer.email}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                          <BookOpen className="size-3" /> {enrollment.course.title}
                        </span>
                        <span className="text-muted-foreground">Gửi ngày {vnDate(enrollment.updatedAt)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input name="note" aria-label="Ghi chú cho học viên" placeholder="Lý do (nếu từ chối)" maxLength={300} className="h-9 w-full rounded-lg sm:w-56" />
                    <Button type="submit" formAction={reviewEnrollmentAction.bind(null, enrollment.id, "approve")} className="h-9">
                      <Check className="size-4" /> Duyệt
                    </Button>
                    <Button type="submit" variant="outline" formAction={reviewEnrollmentAction.bind(null, enrollment.id, "reject")} className="h-9">
                      <X className="size-4" /> Từ chối
                    </Button>
                  </div>
                </form>
              ))}
            </div>
          )}
        </Section>

        <Section title="Đang học" count={approved.length} tone="bg-emerald-100 text-emerald-800">
          {approved.length === 0 ? (
            <EmptyState icon={Users} title="Chưa có học viên nào được duyệt" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Học viên</TableHead>
                  <TableHead>Khóa học</TableHead>
                  <TableHead>Duyệt ngày</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {approved.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <InitialAvatar name={enrollment.customer.fullName} className="size-8 text-sm" />
                        <div>
                          <p className="font-semibold">{enrollment.customer.fullName}</p>
                          <p className="text-xs text-muted-foreground">{enrollment.customer.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{enrollment.course.title}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{enrollment.reviewedAt ? vnDate(enrollment.reviewedAt) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <form action={reviewEnrollmentAction.bind(null, enrollment.id, "remove")}>
                        <Button type="submit" size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <UserMinus className="size-4" /> Gỡ khỏi khóa
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
      </div>
    </>
  );
}

function Section({ title, count, tone, children }: { title: string; count: number; tone: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
        {title}
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${tone}`}>{count}</span>
      </h2>
      {children}
    </section>
  );
}
