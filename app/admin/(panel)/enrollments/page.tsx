import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { reviewEnrollmentAction } from "@/features/enrollments/enrollment-actions";
import { requirePermission } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { courseScopeWhere } from "@/lib/permissions/course-scope";

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
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Đang chờ duyệt ({pending.length})</h2>
          {pending.length === 0 && <p className="text-sm text-muted-foreground">Không có yêu cầu nào đang chờ.</p>}
          {pending.map((enrollment) => (
            <form key={enrollment.id} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0 text-sm">
                <p className="font-medium">{enrollment.customer.fullName}</p>
                <p className="text-xs text-muted-foreground">{enrollment.customer.email}</p>
                <p>Khóa học: {enrollment.course.title}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input name="note" aria-label="Ghi chú cho học viên" placeholder="Lý do (nếu từ chối)" maxLength={300} className="w-48" />
                <Button type="submit" size="sm" formAction={reviewEnrollmentAction.bind(null, enrollment.id, "approve")}>
                  Duyệt
                </Button>
                <Button type="submit" size="sm" variant="outline" formAction={reviewEnrollmentAction.bind(null, enrollment.id, "reject")}>
                  Từ chối
                </Button>
              </div>
            </form>
          ))}
        </section>

        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Đang học ({approved.length})</h2>
          {approved.length === 0 && <p className="text-sm text-muted-foreground">Chưa có học viên nào được duyệt.</p>}
          {approved.length > 0 && (
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
                      <span className="font-medium">{enrollment.customer.fullName}</span>
                      <p className="text-xs text-muted-foreground">{enrollment.customer.email}</p>
                    </TableCell>
                    <TableCell>{enrollment.course.title}</TableCell>
                    <TableCell className="tabular-nums">{enrollment.reviewedAt?.toLocaleDateString("vi-VN") ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <form action={reviewEnrollmentAction.bind(null, enrollment.id, "remove")}>
                        <Button type="submit" size="sm" variant="outline">
                          Gỡ khỏi khóa
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </>
  );
}
