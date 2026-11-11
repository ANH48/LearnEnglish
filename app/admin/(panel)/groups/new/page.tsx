import { PageHeader } from "@/components/admin/page-header";
import { GroupForm } from "@/features/groups/group-form";
import { requireSuperadmin } from "@/lib/auth/current-staff";

export default async function NewGroupPage() {
  await requireSuperadmin();
  return (
    <>
      <PageHeader title="Tạo group quyền" back={{ href: "/admin/groups", label: "Group quyền" }} />
      <GroupForm />
    </>
  );
}
