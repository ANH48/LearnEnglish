"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setLessonsStatusAction } from "./lesson-actions";

type Props = { courseId: string; selectedIds: string[]; onDone: () => void };

/** Toolbar above the lesson table: publish or unpublish every selected lesson in one go. */
export function LessonBulkStatusBar({ courseId, selectedIds, onDone }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const count = selectedIds.length;

  function apply(status: "draft" | "published") {
    setMessage(null);
    startTransition(async () => {
      try {
        const changed = await setLessonsStatusAction(courseId, selectedIds, status);
        const label = status === "published" ? "xuất bản" : "chuyển về nháp";
        setMessage(changed > 0 ? `Đã ${label} ${changed} bài học.` : "Các bài đã chọn sẵn ở trạng thái này rồi.");
        onDone();
      } catch {
        setMessage("Không đổi được trạng thái, thử lại sau.");
      }
    });
  }

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">{count > 0 ? `Đã chọn ${count} bài học` : "Tích chọn bài học để đổi trạng thái hàng loạt"}</span>
      {count > 0 && (
        <>
          <Button size="sm" disabled={pending} onClick={() => apply("published")}>
            Xuất bản
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => apply("draft")}>
            Chuyển về nháp
          </Button>
        </>
      )}
      {message && (
        <span role="status" className="text-muted-foreground">
          {message}
        </span>
      )}
    </div>
  );
}
