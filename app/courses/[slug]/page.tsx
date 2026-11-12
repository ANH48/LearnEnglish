import { Check, ClipboardCheck, Timer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { InitialAvatar } from "@/components/brand/initial-avatar";
import { SiteHeader } from "@/components/site/site-header";
import { CourseCurriculum } from "@/features/course-detail/course-curriculum";
import { loadCourseDetail } from "@/features/course-detail/course-detail-query";
import { CourseEnrollCard } from "@/features/course-detail/course-enroll-card";
import { CourseHero } from "@/features/course-detail/course-hero";
import { EXERCISE_TYPE_DISPLAY, EXERCISE_TYPE_ORDER } from "@/features/course-detail/exercise-type-display";
import { ASSESSMENT_KIND_LABELS } from "@/lib/assessments/attempt-rules";
import { getCurrentCustomer } from "@/lib/auth/current-customer";
import { db } from "@/lib/db";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const course = await db.course.findFirst({ where: { slug: (await params).slug, deletedAt: null, status: "published" }, select: { title: true } });
  return { title: course?.title ?? "Khóa học" };
}

/** Public course page: what the course trains, its lessons (titles only), tests, teachers, and the join card. */
export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const course = await loadCourseDetail((await params).slug);
  if (!course) notFound();

  const customer = await getCurrentCustomer();
  const enrollment = customer
    ? await db.enrollment.findUnique({ where: { courseId_customerId: { courseId: course.id, customerId: customer.id } }, select: { status: true, note: true } })
    : null;
  const status = enrollment?.status ?? null;
  const skills = EXERCISE_TYPE_ORDER.filter((type) => course.exerciseTypes[type]);

  return (
    <>
      <SiteHeader />
      <CourseHero course={course} />

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-10 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:-mt-[300px]">
          <CourseEnrollCard course={course} signedIn={customer !== null} status={status} note={enrollment?.note ?? ""} />
        </div>

        <div className="grid min-w-0 gap-10 lg:col-start-1 lg:row-start-1">
          {skills.length > 0 && (
            <Section title="Bạn sẽ luyện được">
              <ul className="grid gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-2">
                {skills.map((type) => (
                  <li key={type} className="flex gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {EXERCISE_TYPE_DISPLAY[type].skill}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <CourseCurriculum course={course} canLearn={status === "approved"} />

          {course.assessments.length > 0 && (
            <Section title="Bài kiểm tra và bài thi">
              <ul className="grid gap-3 sm:grid-cols-2">
                {course.assessments.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                      <ClipboardCheck className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{a.title}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        {ASSESSMENT_KIND_LABELS[a.kind]} · <Timer className="size-3" /> {a.durationMinutes} phút
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {course.description && (
            <Section title="Mô tả khóa học">
              <p className="leading-relaxed whitespace-pre-line text-muted-foreground">{course.description}</p>
            </Section>
          )}

          {course.teachers.length > 0 && (
            <Section title="Teacher đồng hành">
              <ul className="flex flex-wrap gap-3">
                {course.teachers.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 rounded-2xl border bg-card py-3 pr-5 pl-3">
                    <InitialAvatar name={t.fullName} className="size-11 text-lg" />
                    <div>
                      <p className="font-semibold">{t.fullName}</p>
                      <p className="text-xs text-muted-foreground">Teacher của khóa</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {course.categories.length > 0 && (
            <Section title="Chủ đề liên quan">
              <div className="flex flex-wrap gap-2">
                {course.categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/?category=${c.slug}#courses`}
                    className="rounded-full border bg-card px-4 py-1.5 text-sm font-semibold transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </div>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="font-heading text-2xl font-extrabold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
