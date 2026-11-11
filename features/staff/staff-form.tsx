import { ActionForm } from "@/components/admin/action-form";
import { CheckboxList, FormField } from "@/components/admin/form-field";
import { AccountFormFields } from "@/features/accounts/account-form-fields";
import { saveStaffAction } from "./staff-actions";

type Props = {
  /** Superadmins see the superadmin switch and the group list; others do not. */
  actorIsSuperadmin: boolean;
  groups: { id: string; name: string; description: string }[];
  staff?: {
    id: string;
    email: string;
    fullName: string;
    status: string;
    isSuperadmin: boolean;
    groupIds: string[];
  };
};

export function StaffForm({ actorIsSuperadmin, groups, staff }: Props) {
  return (
    <ActionForm action={saveStaffAction.bind(null, staff?.id ?? null)}>
      <AccountFormFields account={staff} />
      {actorIsSuperadmin && (
        <>
          <FormField label="Group quyền">
            <CheckboxList
              name="groupIds"
              selected={staff?.groupIds ?? []}
              options={groups.map((g) => ({ value: g.id, label: g.name, hint: g.description }))}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isSuperadmin" defaultChecked={staff?.isSuperadmin} />
            Superadmin (toàn quyền, bỏ qua mọi kiểm tra)
          </label>
        </>
      )}
    </ActionForm>
  );
}
