import { ActionForm } from "@/components/admin/action-form";
import { FormField } from "@/components/admin/form-field";
import { Input } from "@/components/ui/input";
import { saveCategoryAction } from "./category-actions";

export function CategoryForm({ category }: { category?: { id: string; name: string; slug: string } }) {
  return (
    <ActionForm action={saveCategoryAction.bind(null, category?.id ?? null)} submitLabel={category ? "Lưu" : "Thêm thể loại"}>
      <FormField label="Tên thể loại" htmlFor="name">
        <Input id="name" name="name" defaultValue={category?.name} required maxLength={80} />
      </FormField>
      <FormField label="Đường dẫn" htmlFor="slug" hint="Để trống thì tự tạo từ tên, ví dụ: giao-tiep-co-ban.">
        <Input id="slug" name="slug" defaultValue={category?.slug} maxLength={100} />
      </FormField>
    </ActionForm>
  );
}
