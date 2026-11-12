"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { statusLabel } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteLessonAction, moveLessonAction } from "./lesson-actions";
import { LessonBulkStatusBar } from "./lesson-bulk-status-bar";

type Row = { id: string; title: string; status: string; exerciseCount: number };

export function LessonTable({ courseId, lessons }: { courseId: string; lessons: Row[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  if (lessons.length === 0) return <p className="text-sm text-muted-foreground">Chưa có bài học nào.</p>;

  // Ignore ids of lessons that disappeared after a refresh (deleted in another tab).
  const selectedIds = lessons.filter((l) => selected.has(l.id)).map((l) => l.id);
  const allChecked = selectedIds.length === lessons.length;

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <div className="grid gap-2">
      <LessonBulkStatusBar courseId={courseId} selectedIds={selectedIds} onDone={() => setSelected(new Set())} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <Checkbox
                aria-label="Chọn tất cả bài học"
                checked={allChecked}
                indeterminate={selectedIds.length > 0 && !allChecked}
                onCheckedChange={(checked) => setSelected(checked ? new Set(lessons.map((l) => l.id)) : new Set())}
              />
            </TableHead>
            <TableHead>#</TableHead>
            <TableHead>Bài học</TableHead>
            <TableHead>Bài tập</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lessons.map((lesson, index) => (
            <TableRow key={lesson.id} data-state={selected.has(lesson.id) ? "selected" : undefined}>
              <TableCell>
                <Checkbox
                  aria-label={`Chọn ${lesson.title}`}
                  checked={selected.has(lesson.id)}
                  onCheckedChange={(checked) => toggle(lesson.id, checked)}
                />
              </TableCell>
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
    </div>
  );
}
