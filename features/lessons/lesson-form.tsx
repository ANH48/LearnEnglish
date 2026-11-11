import { ActionForm } from "@/components/admin/action-form";
import { FormField, nativeSelectClass } from "@/components/admin/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveLessonAction } from "./lesson-actions";

type Props = {
  courseId: string;
  lesson?: { id: string; title: string; content: string; status: string };
};

export function LessonForm({ courseId, lesson }: Props) {
  return (
    <ActionForm action={saveLessonAction.bind(null, courseId, lesson?.id ?? null)}>
      <FormField label="Tên bài học" htmlFor="title">
        <Input id="title" name="title" defaultValue={lesson?.title} required maxLength={200} />
      </FormField>
      <FormField label="Nội dung" htmlFor="content" hint="Viết bằng Markdown.">
        <Textarea id="content" name="content" defaultValue={lesson?.content} rows={14} className="font-mono text-sm" />
      </FormField>
      <FormField label="Trạng thái" htmlFor="status" hint="Học viên chỉ thấy bài học đã xuất bản.">
        <select id="status" name="status" defaultValue={lesson?.status ?? "draft"} className={nativeSelectClass}>
          <option value="draft">Nháp</option>
          <option value="published">Đã xuất bản</option>
        </select>
      </FormField>
    </ActionForm>
  );
}
