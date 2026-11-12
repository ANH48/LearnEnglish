import { BookOpen, CalendarDays, ChevronRight, GraduationCap, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { CourseDetail } from "./course-detail-query";

/** Dark band at the top of the course page: where it sits, what it is, and its real numbers. */
export function CourseHero({ course }: { course: CourseDetail }) {
  const teacherNames = course.teachers.map((t) => t.fullName).join(", ");
  return (
    <section className="relative isolate overflow-hidden bg-brand-ink text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgb(255_255_255/0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="absolute -top-28 -left-20 -z-10 size-96 rounded-full bg-teal-400/25 blur-3xl" />
      <div className="absolute -right-10 -bottom-32 -z-10 size-80 rounded-full bg-orange-400/15 blur-3xl" />

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:min-h-[340px] lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-4">
          <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-1 text-sm text-teal-200">
            <Link href="/" className="hover:text-white hover:underline">
              Trang chủ
            </Link>
            <ChevronRight className="size-3.5" />
            <Link href="/#courses" className="hover:text-white hover:underline">
              Khóa học
            </Link>
            {course.categories[0] && (
              <>
                <ChevronRight className="size-3.5" />
                <Link href={`/?category=${course.categories[0].slug}#courses`} className="hover:text-white hover:underline">
                  {course.categories[0].name}
                </Link>
              </>
            )}
          </nav>

          <h1 className="animate-rise font-heading text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl">{course.title}</h1>
          {course.description && (
            <p className="line-clamp-3 max-w-2xl animate-rise text-lg text-white/80" style={{ animationDelay: "0.08s" }}>
              {course.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {course.categories.map((c) => (
              <span key={c.slug} className="rounded-full bg-teal-300/15 px-3 py-1 text-xs font-semibold text-teal-100 ring-1 ring-teal-300/30">
                {c.name}
              </span>
            ))}
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
            <Stat icon={<Users />}>{course.learnerCount} học viên</Stat>
            <Stat icon={<BookOpen />}>{course.lessons.length} bài học</Stat>
            {teacherNames && <Stat icon={<GraduationCap />}>Teacher: {teacherNames}</Stat>}
            <Stat icon={<CalendarDays />}>Cập nhật {course.updatedAt.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</Stat>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <li className="flex items-center gap-1.5 [&>svg]:size-4 [&>svg]:text-teal-300">{icon}{children}</li>;
}
