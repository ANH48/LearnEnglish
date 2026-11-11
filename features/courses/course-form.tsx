import { ActionForm } from "@/components/admin/action-form";
import { CheckboxList, FormField, nativeSelectClass } from "@/components/admin/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveCourseAction } from "./course-actions";

type Props = {
  categories: { id: string; name: string }[];
  /** Null when the signed-in staff member may not change who teaches the course. */
  teacherOptions: { id: string; fullName: string; email: string }[] | null;
  course?: {
    id: string;
    title: string;
    slug: string;
    description: string;
    status: string;
    categoryIds: string[];
    teacherIds: string[];
  };
};

export function CourseForm({ categories, teacherOptions, course }: Props) {
  return (
    <ActionForm action={saveCourseAction.bind(null, course?.id ?? null)}>
      <FormField label="Tên khóa học" htmlFor="title">
        <Input id="title" name="title" defaultValue={course?.title} required maxLength={160} />
      </FormField>
      <FormField label="Đường dẫn" htmlFor="slug" hint="Để trống thì tự tạo từ tên.">
        <Input id="slug" name="slug" defaultValue={course?.slug} maxLength={180} />
      </FormField>
      <FormField label="Mô tả" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={course?.description} rows={4} />
      </FormField>
      <FormField label="Trạng thái" htmlFor="status" hint="Học viên chỉ thấy khóa học đã xuất bản.">
        <select id="status" name="status" defaultValue={course?.status ?? "draft"} className={nativeSelectClass}>
          <option value="draft">Nháp</option>
          <option value="published">Đã xuất bản</option>
        </select>
      </FormField>
      <FormField label="Thể loại">
        <CheckboxList
          name="categoryIds"
          selected={course?.categoryIds ?? []}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
      </FormField>
      {teacherOptions && (
        <FormField label="Teacher phụ trách" hint="Teacher chỉ thấy và sửa được khóa học mình phụ trách.">
          <CheckboxList
            name="teacherIds"
            selected={course?.teacherIds ?? []}
            options={teacherOptions.map((t) => ({ value: t.id, label: t.fullName, hint: t.email }))}
          />
        </FormField>
      )}
    </ActionForm>
  );
}
