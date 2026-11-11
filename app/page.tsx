import Link from "next/link";
import { SiteHeader, SiteMain } from "@/components/site/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";

type Props = { searchParams: Promise<{ category?: string | string[] }> };

/** Landing page: what the site is, and the published courses, filterable by category. */
export default async function HomePage({ searchParams }: Props) {
  // A repeated ?category= arrives as an array; only a single value is a valid filter.
  const raw = (await searchParams).category;
  const category = typeof raw === "string" ? raw : undefined;
  const [categories, courses] = await Promise.all([
    db.category.findMany({
      where: { deletedAt: null, courses: { some: { course: { deletedAt: null, status: "published" } } } },
      orderBy: { name: "asc" },
    }),
    db.course.findMany({
      where: {
        deletedAt: null,
        status: "published",
        ...(category ? { categories: { some: { category: { slug: category, deletedAt: null } } } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        categories: { include: { category: true } },
        _count: { select: { lessons: { where: { deletedAt: null, status: "published" } } } },
      },
    }),
  ]);

  return (
    <>
      <SiteHeader />
      <SiteMain>
        <section className="grid gap-4 py-8 sm:py-14">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Học tiếng Anh theo từng bài, có teacher đồng hành
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Chọn khóa học, gửi yêu cầu tham gia và bắt đầu học ngay khi teacher duyệt. Mỗi bài học đi kèm bài tập được
            chấm ngay để bạn biết mình sai ở đâu.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="#courses" className={buttonVariants({ size: "lg" })}>
              Xem khóa học
            </Link>
            <Link href="/register" className={buttonVariants({ size: "lg", variant: "outline" })}>
              Tạo tài khoản
            </Link>
          </div>
        </section>

        <section className="grid gap-4 border-y py-8 sm:grid-cols-3">
          {[
            ["1. Đăng ký tài khoản", "Chỉ cần email và mật khẩu."],
            ["2. Xin vào khóa học", "Teacher của khóa duyệt yêu cầu của bạn."],
            ["3. Học và luyện tập", "Đọc bài, làm bài tập, xem điểm và đáp án ngay."],
          ].map(([title, text]) => (
            <div key={title}>
              <h2 className="font-medium">{title}</h2>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>

        <section id="courses" className="grid scroll-mt-4 gap-4 py-8">
          <h2 className="text-2xl font-semibold">Khóa học</h2>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Link href="/#courses" className={buttonVariants({ size: "sm", variant: category ? "outline" : "default" })}>
                Tất cả
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/?category=${c.slug}#courses`}
                  className={buttonVariants({ size: "sm", variant: category === c.slug ? "default" : "outline" })}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
          {courses.length === 0 && <p className="text-muted-foreground">Chưa có khóa học nào được mở.</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link key={course.id} href={`/courses/${course.slug}`} className="rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50">
                <Card className="h-full transition-colors hover:border-primary">
                  <CardHeader>
                    <CardTitle>{course.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm">
                    <p className="line-clamp-3 text-muted-foreground">{course.description || "Chưa có mô tả."}</p>
                    <div className="flex flex-wrap items-center gap-1">
                      {course.categories.map((c) => (
                        <Badge key={c.categoryId} variant="secondary">
                          {c.category.name}
                        </Badge>
                      ))}
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">{course._count.lessons} bài học</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </SiteMain>
    </>
  );
}
