import { ActionForm } from "@/components/admin/action-form";
import { CheckboxList, FormField } from "@/components/admin/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSIONS, PERMISSION_KEYS, SUPERADMIN_ONLY } from "@/lib/permissions/permission-keys";
import { saveGroupAction } from "./group-actions";

type Props = {
  group?: { id: string; name: string; description: string; permissions: string[] };
};

export function GroupForm({ group }: Props) {
  const options = PERMISSION_KEYS.filter((key) => !SUPERADMIN_ONLY.includes(key)).map((key) => ({
    value: key,
    label: PERMISSIONS[key],
    hint: key,
  }));

  return (
    <ActionForm action={saveGroupAction.bind(null, group?.id ?? null)}>
      <FormField label="Tên group" htmlFor="name">
        <Input id="name" name="name" defaultValue={group?.name} required maxLength={60} />
      </FormField>
      <FormField label="Mô tả" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={group?.description} maxLength={300} />
      </FormField>
      <FormField
        label="Quyền"
        hint="Quyền tạo group và gán group chỉ dành cho superadmin nên không có trong danh sách."
      >
        <CheckboxList name="permissions" options={options} selected={group?.permissions ?? []} />
      </FormField>
    </ActionForm>
  );
}
