import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ENROLLMENT_STATUS_LABEL } from "@/features/enrollments/enrollment-state";
import { ProgressBar } from "@/features/progress/progress-bar";
import { requireCustomer } from "@/lib/auth/current-customer";
import { db } from "@/lib/db";

/** The learner's courses with each request's status and, once approved, progress. */
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
          lessons: {
            where: { deletedAt: null, status: "published" },
            select: { progress: { where: { customerId: customer.id }, select: { lessonId: true } } },
          },
        },
      },
    },
  });

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Khóa của tôi</h1>
      {enrollments.length === 0 && (
        <div className="grid gap-3 rounded-xl border p-6">
          <p>Bạn chưa đăng ký khóa học nào.</p>
          <div>
            <Link href="/#courses" className={buttonVariants()}>
              Xem khóa học
            </Link>
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {enrollments.map((enrollment) => {
          const { course, status } = enrollment;
          const done = course.lessons.filter((lesson) => lesson.progress.length > 0).length;
          return (
            <Card key={enrollment.id}>
              <CardHeader>
                <CardTitle>{course.title}</CardTitle>
                <div>
                  <Badge variant={status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary"}>
                    {ENROLLMENT_STATUS_LABEL[status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                {status === "approved" ? (
                  <>
                    <ProgressBar done={done} total={course.lessons.length} />
                    <div>
                      <Link href={`/learn/${course.slug}`} className={buttonVariants({ size: "sm" })}>
                        Vào học
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      {status === "pending" && "Teacher của khóa sẽ duyệt yêu cầu của bạn."}
                      {status === "rejected" && (enrollment.note ? `Lý do: ${enrollment.note}` : "Bạn có thể gửi lại yêu cầu.")}
                      {status === "cancelled" && "Bạn có thể gửi lại yêu cầu bất cứ lúc nào."}
                    </p>
                    <div>
                      <Link href={`/courses/${course.slug}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                        Xem khóa học
                      </Link>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
