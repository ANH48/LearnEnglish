import { ChevronDown, Lock, PlayCircle } from "lucide-react";
import Link from "next/link";
import type { CourseDetail, TypeCounts } from "./course-detail-query";
import { EXERCISE_TYPE_DISPLAY, EXERCISE_TYPE_ORDER } from "./exercise-type-display";

const total = (counts: TypeCounts) => Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

/** Lesson list as an accordion; each lesson opens to show which kinds of exercise it holds. */
export function CourseCurriculum({ course, canLearn }: { course: CourseDetail; canLearn: boolean }) {
  const lessonExercises = course.lessons.reduce((sum, l) => sum + total(l.exerciseTypes), 0);
  return (
    <section className="grid gap-3">
      <h2 className="font-heading text-2xl font-extrabold tracking-tight">Nội dung khóa học</h2>
      <p className="text-sm text-muted-foreground">
        {course.lessons.length} bài học • {lessonExercises} bài tập trong bài học
        {course.assessments.length > 0 && ` • ${course.assessments.length} bài kiểm tra`}
      </p>
      {course.lessons.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Khóa học chưa có bài học nào.</p>
      ) : (
        <div className="divide-y overflow-hidden rounded-2xl border bg-card">
          {course.lessons.map((lesson, i) => {
            const count = total(lesson.exerciseTypes);
            return (
              <details key={lesson.id} open={i === 0} className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary font-heading text-sm font-extrabold text-primary">{i + 1}</span>
                  <span className="flex-1 font-semibold">{lesson.title}</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{count} bài tập</span>
                  <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="flex flex-wrap items-center gap-2 bg-muted/40 px-4 py-3 pl-15">
                  {count === 0 && <span className="text-sm text-muted-foreground">Bài đọc, chưa có bài tập.</span>}
                  {EXERCISE_TYPE_ORDER.filter((type) => lesson.exerciseTypes[type]).map((type) => {
                    const { icon: Icon, label } = EXERCISE_TYPE_DISPLAY[type];
                    return (
                      <span key={type} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium">
                        <Icon className="size-3.5 text-primary" />
                        {label} × {lesson.exerciseTypes[type]}
                      </span>
                    );
                  })}
                  <span className="ml-auto">
                    {canLearn ? (
                      <Link href={`/learn/${course.slug}/${lesson.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                        <PlayCircle className="size-4" /> Vào học
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="size-3.5" /> Mở khi được duyệt
                      </span>
                    )}
                  </span>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
