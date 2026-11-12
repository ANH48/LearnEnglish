import Link from "next/link";
import { SiteHeader, SiteMain } from "@/components/site/site-header";
import { BookOpen, BookOpenCheck, Send, UserPlus } from "lucide-react";
import { CourseCard } from "@/components/site/course-card";
import { LandingHero } from "@/components/site/landing-hero";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: UserPlus, title: "Đăng ký tài khoản", text: "Chỉ cần email và mật khẩu.", tone: "bg-secondary text-primary" },
  { icon: Send, title: "Xin vào khóa học", text: "Teacher của khóa duyệt yêu cầu của bạn.", tone: "bg-accent text-accent-foreground" },
  { icon: BookOpenCheck, title: "Học và luyện tập", text: "Làm bài, xem điểm và đáp án ngay.", tone: "bg-rose-100 text-rose-700" },
];

const chip = (selected: boolean) =>
  cn(
    "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
    selected ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50 hover:text-primary",
  );

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
        teachers: { where: { staff: { deletedAt: null } }, select: { staff: { select: { fullName: true } } } },
        _count: { select: { lessons: { where: { deletedAt: null, status: "published" } } } },
      },
    }),
  ]);

  return (
    <>
      <SiteHeader />
      <SiteMain>
        <LandingHero />

        <section className="grid gap-4 py-10 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text, tone }, i) => (
            <div key={title} className="flex animate-rise gap-4 rounded-2xl border bg-card p-5 shadow-sm" style={{ animationDelay: `${0.1 * i}s` }}>
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}>
                <Icon className="size-5" />
              </span>
              <div>
                <h2 className="font-heading font-bold">{title}</h2>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </section>

        <section id="courses" className="grid scroll-mt-20 gap-5 py-8">
          <div>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight">Khóa học đang mở</h2>
            <p className="text-muted-foreground">Chọn một khóa phù hợp và gửi yêu cầu tham gia.</p>
          </div>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Link href="/#courses" className={chip(!category)}>
                Tất cả
              </Link>
              {categories.map((c) => (
                <Link key={c.id} href={`/?category=${c.slug}#courses`} className={chip(category === c.slug)}>
                  {c.name}
                </Link>
              ))}
            </div>
          )}
          {courses.length === 0 && (
            <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
              <BookOpen className="size-8 text-primary" />
              Chưa có khóa học nào được mở. Quay lại sau nhé!
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                slug={course.slug}
                title={course.title}
                description={course.description}
                categories={course.categories.map((c) => c.category.name)}
                lessonCount={course._count.lessons}
                teachers={course.teachers.map((t) => t.staff.fullName)}
              />
            ))}
          </div>
        </section>
      </SiteMain>
    </>
  );
}
