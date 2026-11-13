import { Headphones } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { blockAudioEntries, lessonAudioUrl, parseLessonBlocks } from "@/features/lesson-blocks/lesson-blocks";
import { listLessonsWithBlocks, listMediaFileSizes } from "@/features/lessons/lesson-queries";
import { requirePermission } from "@/lib/auth/current-staff";

const megabytes = (bytes: number) => `${(bytes / 1_048_576).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`;

/** Every audio file of every lesson the actor may open, with a player, so a teacher can check the voice. */
export default async function LessonAudioPage() {
  const staff = await requirePermission("course.manage");
  const lessons = await listLessonsWithBlocks(staff);
  const withAudio = lessons
    .map((lesson) => ({ ...lesson, audio: blockAudioEntries(parseLessonBlocks(lesson.blocks)) }))
    .filter((lesson) => lesson.audio.length > 0);
  const files = await listMediaFileSizes(withAudio.flatMap((lesson) => lesson.audio.map((entry) => entry.mediaId)));
  const fileById = new Map(files.map((file) => [file.id, file]));

  return (
    <>
      <PageHeader title="Audio bài học" description="Nghe lại mọi file audio của từng bài học để kiểm tra giọng đọc trước khi học viên nghe." />
      {withAudio.length === 0 ? (
        <EmptyState icon={Headphones} title="Chưa có bài học nào có audio">
          Audio xuất hiện ở đây sau khi bài học theo khối được nhập kèm giọng đọc.
        </EmptyState>
      ) : (
        <div className="grid max-w-3xl gap-6">
          {withAudio.map((lesson) => (
            <section key={lesson.id} className="grid gap-4 rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="grid gap-0.5">
                  <p className="text-xs text-muted-foreground">{lesson.course.title}</p>
                  <h2 className="font-heading text-lg font-bold">
                    <Link href={`/admin/courses/${lesson.courseId}/lessons/${lesson.id}`} className="hover:text-primary hover:underline">
                      {lesson.title}
                    </Link>
                  </h2>
                </div>
                <Badge variant={lesson.status === "published" ? "default" : "outline"}>{lesson.status === "published" ? "Đã xuất bản" : "Bản nháp"}</Badge>
              </div>
              <ul className="grid gap-4">
                {lesson.audio.map((entry) => {
                  const file = fileById.get(entry.mediaId);
                  return (
                    <li key={entry.mediaId} className="grid gap-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                        <span className="font-medium">{entry.label}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {file ? `${megabytes(file.sizeBytes)} · tải lên ${file.createdAt.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}` : "Không tìm thấy file"}
                        </span>
                      </div>
                      {/* preload none: a page with many lessons must not download every file at once. */}
                      {file && <audio controls preload="none" src={lessonAudioUrl(lesson.id, entry.mediaId)} className="w-full" aria-label={`${lesson.title}: ${entry.label}`} />}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
