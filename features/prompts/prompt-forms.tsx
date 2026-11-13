import { ActionForm } from "@/components/admin/action-form";
import { FormField } from "@/components/admin/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PromptCategory } from "@/lib/prompt-store/prompt-schemas";
import { createPromptVersionAction, savePromptCategoryAction } from "./prompt-actions";
import { PromptJsonEditor } from "./prompt-json-editor";

/** Category level: what the prompt is for (type, key) and which model runs it. */
export function PromptCategoryForm({ category }: { category?: PromptCategory }) {
  return (
    <ActionForm action={savePromptCategoryAction.bind(null, category?.key ?? null)} submitLabel={category ? "Lưu category" : "Thêm category"}>
      {!category && (
        <FormField label="Key" htmlFor="key" hint="Code gọi prompt bằng key này, không đổi được sau khi tạo. Ví dụ: ocr_image_to_text, writing_grading.">
          <Input id="key" name="key" required maxLength={60} pattern="[a-z][a-z0-9_]{2,59}" className="font-mono" />
        </FormField>
      )}
      <FormField label="Type" htmlFor="type" hint="Nhóm prompt, ví dụ: ocr, grading.">
        <Input id="type" name="type" required maxLength={40} defaultValue={category?.type} className="font-mono" />
      </FormField>
      <FormField label="Tên" htmlFor="name">
        <Input id="name" name="name" required maxLength={120} defaultValue={category?.name} />
      </FormField>
      <FormField label="Mô tả" htmlFor="description">
        <Textarea id="description" name="description" rows={2} maxLength={1000} defaultValue={category?.description} />
      </FormField>
      <FormField label="Model" htmlFor="model" hint="Model ID trên Groq, ví dụ: qwen/qwen3.8-27b.">
        <Input id="model" name="model" required maxLength={120} defaultValue={category?.model} className="font-mono" />
      </FormField>
    </ActionForm>
  );
}

/** Prompt level: key + version + prompt JSON. Starts from the applied version so a change is a small edit. */
export function PromptVersionForm({ promptKey, nextVersion, initialJson }: { promptKey: string; nextVersion: string; initialJson: string }) {
  return (
    <ActionForm action={createPromptVersionAction.bind(null, promptKey)} submitLabel="Tạo version">
      <FormField label="Version" htmlFor="version" hint="major.minor.patch. Version đã tạo không sửa được, muốn đổi thì tạo version mới.">
        <Input id="version" name="version" required defaultValue={nextVersion} className="w-40 font-mono" />
      </FormField>
      <FormField
        label="Prompt JSON"
        htmlFor="content"
        hint='"system" và "user" viết một chuỗi hoặc mảng các dòng (mỗi dòng một phần tử). "responseFormat": "text" | "json_object". "params" chỉ nhận: temperature, top_p, max_completion_tokens, reasoning_effort, reasoning_format, seed. Trong "user" có thể dùng {{imageCount}}.'
      >
        <PromptJsonEditor name="content" initialJson={initialJson} />
      </FormField>
      <FormField label="Ghi chú" htmlFor="note" hint="Đổi gì so với version trước, để sau dễ dò.">
        <Input id="note" name="note" maxLength={500} />
      </FormField>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="apply" /> Áp dụng version này ngay
      </label>
    </ActionForm>
  );
}
