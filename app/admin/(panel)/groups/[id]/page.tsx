import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { GroupForm } from "@/features/groups/group-form";
import { findGroupWithPermissions } from "@/features/groups/group-queries";
import { requireSuperadmin } from "@/lib/auth/current-staff";
import { requireUuid } from "@/lib/forms/require-uuid";

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperadmin();
  const { id } = await params;
  requireUuid(id);
  const group = await findGroupWithPermissions(id);
  if (!group) notFound();

  return (
    <>
      <PageHeader title={`Sửa group: ${group.name}`} back={{ href: "/admin/groups", label: "Group quyền" }} />
      <GroupForm
        group={{
          id: group.id,
          name: group.name,
          description: group.description,
          permissions: group.permissions.map((p) => p.permissionKey),
        }}
      />
    </>
  );
}
