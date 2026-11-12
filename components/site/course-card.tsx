import { BookOpen } from "lucide-react";
import Link from "next/link";
import { InitialAvatar } from "@/components/brand/initial-avatar";
import { Badge } from "@/components/ui/badge";
import { courseCoverGradient } from "@/lib/course-cover";

type Props = { slug: string; title: string; description: string | null; categories: string[]; lessonCount: number; teachers: string[] };

export function CourseCard({ slug, title, description, categories, lessonCount, teachers }: Props) {
  return (
    <Link
      href={`/courses/${slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className={`relative h-28 bg-gradient-to-br ${courseCoverGradient(slug)}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgb(255_255_255/0.25)_1px,transparent_1px)] [background-size:14px_14px]" />
        <span className="absolute bottom-3 left-4 grid size-11 place-items-center rounded-xl bg-white/95 text-brand-ink shadow-md transition-transform duration-200 group-hover:-rotate-6">
          <BookOpen className="size-5" />
        </span>
      </div>
      <div className="grid flex-1 content-start gap-2 p-4">
        <h3 className="font-heading text-lg leading-snug font-bold">{title}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{description || "Chưa có mô tả."}</p>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {categories.map((name) => (
              <Badge key={name} variant="secondary">
                {name}
              </Badge>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center gap-2 border-t pt-3">
          {teachers.length > 0 ? (
            <>
              <span className="flex -space-x-2">
                {teachers.slice(0, 3).map((name) => (
                  <InitialAvatar key={name} name={name} className="size-7 text-xs ring-2 ring-card" />
                ))}
              </span>
              <span className="min-w-0 truncate text-xs font-medium" title={teachers.join(", ")}>
                {teachers.join(", ")}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Chưa có teacher</span>
          )}
          <span className="ml-auto shrink-0 text-xs font-medium text-muted-foreground tabular-nums">{lessonCount} bài học</span>
        </div>
      </div>
    </Link>
  );
}
