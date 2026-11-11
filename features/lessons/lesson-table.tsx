import Link from "next/link";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { statusLabel } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteLessonAction, moveLessonAction } from "./lesson-actions";

type Row = { id: string; title: string; status: string; exerciseCount: number };

export function LessonTable({ courseId, lessons }: { courseId: string; lessons: Row[] }) {
  if (lessons.length === 0) return <p className="text-sm text-muted-foreground">Chưa có bài học nào.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Bài học</TableHead>
          <TableHead>Bài tập</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {lessons.map((lesson, index) => (
          <TableRow key={lesson.id}>
            <TableCell className="tabular-nums">{index + 1}</TableCell>
            <TableCell>
              <Link href={`/admin/courses/${courseId}/lessons/${lesson.id}`} className="font-medium hover:underline">
                {lesson.title}
              </Link>
            </TableCell>
            <TableCell className="tabular-nums">{lesson.exerciseCount}</TableCell>
            <TableCell>
              <Badge variant={lesson.status === "published" ? "default" : "secondary"}>{statusLabel(lesson.status)}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                {index > 0 && (
                  <ConfirmActionButton action={moveLessonAction.bind(null, courseId, lesson.id, "up")} label="Lên" variant="ghost" />
                )}
                {index < lessons.length - 1 && (
                  <ConfirmActionButton action={moveLessonAction.bind(null, courseId, lesson.id, "down")} label="Xuống" variant="ghost" />
                )}
                <ConfirmActionButton
                  action={deleteLessonAction.bind(null, courseId, lesson.id)}
                  label="Xóa"
                  variant="destructive"
                  confirmMessage={`Xóa bài học "${lesson.title}" cùng các bài tập của nó?`}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
