import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader, SiteMain } from "@/components/site/site-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cancelEnrollmentAction, requestEnrollmentAction } from "@/features/enrollments/enrollment-actions";
import { ENROLLMENT_STATUS_LABEL } from "@/features/enrollments/enrollment-state";
import { getCurrentCustomer } from "@/lib/auth/current-customer";
import { db } from "@/lib/db";

/** Public course page: description, lesson titles, and the join button for the visitor's current state. */
export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await db.course.findFirst({
    where: { slug, deletedAt: null, status: "published" },
    include: {
      categories: { include: { category: true } },
      lessons: { where: { deletedAt: null, status: "published" }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true, title: true } },
    },
  });
  if (!course) notFound();

  const customer = await getCurrentCustomer();
  const enrollment = customer
    ? await db.enrollment.findUnique({ where: { courseId_customerId: { courseId: course.id, customerId: customer.id } } })
    : null;
  const status = enrollment?.status ?? null;

  return (
    <>
      <SiteHeader />
      <SiteMain>
        <div className="grid max-w-2xl gap-6">
          <div className="grid gap-2">
            <Link href="/#courses" className="text-sm text-muted-foreground hover:underline">
              ← Tất cả khóa học
            </Link>
            <h1 className="text-3xl font-semibold text-balance">{course.title}</h1>
            <div className="flex flex-wrap gap-1">
              {course.categories.map((c) => (
                <Badge key={c.categoryId} variant="secondary">
                  {c.category.name}
                </Badge>
              ))}
            </div>
            <p className="whitespace-pre-line text-muted-foreground">{course.description}</p>
          </div>

          <div className="grid gap-2 rounded-xl border p-4">
            {!customer && (
              <>
                <p className="text-sm">Đăng nhập để gửi yêu cầu tham gia khóa học này.</p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/login?next=/courses/${course.slug}`} className={buttonVariants()}>
                    Đăng nhập
                  </Link>
                  <Link href={`/register?next=/courses/${course.slug}`} className={buttonVariants({ variant: "outline" })}>
                    Tạo tài khoản
                  </Link>
                </div>
              </>
            )}
            {customer && status && <p className="text-sm font-medium">Trạng thái: {ENROLLMENT_STATUS_LABEL[status]}</p>}
            {customer && status === "approved" && (
              <div>
                <Link href={`/learn/${course.slug}`} className={buttonVariants()}>
                  Vào học
                </Link>
              </div>
            )}
            {customer && status === "pending" && (
              <>
                <p className="text-sm text-muted-foreground">Teacher của khóa sẽ duyệt yêu cầu của bạn. Bạn chưa cần làm gì thêm.</p>
                <form action={cancelEnrollmentAction.bind(null, course.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    Hủy yêu cầu
                  </Button>
                </form>
              </>
            )}
            {customer && status === "rejected" && enrollment?.note && (
              <p className="text-sm text-muted-foreground">Lý do: {enrollment.note}</p>
            )}
            {customer && (status === null || status === "rejected" || status === "cancelled") && (
              <form action={requestEnrollmentAction.bind(null, course.id)}>
                <Button type="submit">{status === null ? "Đăng ký khóa học" : "Gửi lại yêu cầu"}</Button>
              </form>
            )}
          </div>

          <div className="grid gap-2">
            <h2 className="text-xl font-semibold">Nội dung khóa học</h2>
            {course.lessons.length === 0 && <p className="text-sm text-muted-foreground">Khóa học chưa có bài học nào.</p>}
            <ol className="grid list-decimal gap-1 pl-5">
              {course.lessons.map((lesson) => (
                <li key={lesson.id}>{lesson.title}</li>
              ))}
            </ol>
          </div>
        </div>
      </SiteMain>
    </>
  );
}
